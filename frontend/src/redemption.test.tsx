import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { authFetch } from './auth/authFetch'

vi.mock('./auth/authFetch', () => ({
  authFetch: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(authFetch).mockReset()
  vi.unstubAllGlobals()
})

function renderRedemption() {
  window.history.pushState({}, '', '/redeem')
  return render(<App />)
}

describe('Redemption page', () => {
  it('accepts an amount and a video', async () => {
    const user = userEvent.setup()
    renderRedemption()

    const amount = screen.getByLabelText(/bongs taken/i)
    const videoInput = screen.getByLabelText(/add video/i) as HTMLInputElement
    const video = new File(['video'], 'redemption.mp4', { type: 'video/mp4' })

    await user.clear(amount)
    await user.type(amount, '3')
    await user.upload(videoInput, video)

    expect(amount).toHaveValue(3)
    expect(videoInput.files?.[0]).toBe(video)
  })

  it('navigates to Add Shot from the footer', async () => {
    const user = userEvent.setup()
    renderRedemption()

    await user.click(screen.getByRole('button', { name: /add shot from footer/i }))

    expect(window.location.pathname).toBe('/add')
  })

  it('creates, uploads, and completes a redemption in order', async () => {
    const user = userEvent.setup()
    const authFetchMock = vi.mocked(authFetch)
    const uploadFetch = vi.fn().mockResolvedValue({ ok: true } as Response)

    authFetchMock.mockImplementation((input) => {
      if (input === '/api/redemption/recent') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response)
      }

      if (input === '/api/redemption') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              redemptionId: 'redemption-1',
              postUrl: 'https://uploads.example.test',
              formData: {
                key: 'member/video.mp4',
                policy: 'signed-policy',
              },
            }),
        } as Response)
      }

      return Promise.resolve({ ok: true } as Response)
    })
    vi.stubGlobal('fetch', uploadFetch)

    renderRedemption()

    const amount = screen.getByLabelText(/bongs taken/i)
    const videoInput = screen.getByLabelText(/add video/i) as HTMLInputElement
    const video = new File(['video'], 'redemption.mp4', { type: 'video/mp4' })

    await user.clear(amount)
    await user.type(amount, '3')
    await user.upload(videoInput, video)
    await user.click(screen.getByRole('button', { name: /send redemption/i }))

    expect(authFetchMock).toHaveBeenCalledWith('/api/redemption', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bongAmount: 3,
        filename: 'redemption.mp4',
        contentType: 'video/mp4',
        sizeBytes: video.size,
      }),
    })

    expect(uploadFetch).toHaveBeenCalledWith(
      'https://uploads.example.test',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    )

    expect(authFetchMock).toHaveBeenCalledWith(
      '/api/redemption/complete-upload',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ redemptionId: 'redemption-1' }),
      },
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Inlösningen skickades.',
    )
  })

  it('opens a recent redemption video in a larger dialog', async () => {
    const user = userEvent.setup()

    vi.mocked(authFetch).mockImplementation((input) => {
      if (input === '/api/redemption/recent') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 'redemption-1',
                memberName: 'Rasmus',
                amount: 2,
                status: 'PENDING',
                createdAt: '2026-08-03T09:00:00.000Z',
                videoId: 'video-1',
              },
            ]),
        } as Response)
      }

      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            videoUrl: 'https://uploads.example.test/video.mp4',
          }),
      } as Response)
    })

    renderRedemption()

    await user.click(
      await screen.findByRole('button', { name: /visa video från rasmus/i }),
    )

    expect(authFetch).toHaveBeenCalledWith(
      '/api/files/video-1/playback-url',
    )

    expect(
      screen.getByRole('dialog', { name: /video från rasmus/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /stäng/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
