import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

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
})
