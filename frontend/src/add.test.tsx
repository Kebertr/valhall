import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AddShot from './pages/Add'
import { authFetch } from './auth/authFetch'

vi.mock('./auth/authFetch', () => ({
  authFetch: vi.fn(),
}))

describe('AddShot', () => {
  it('submits the add shot form', async () => {
    const user = userEvent.setup()

    const authFetchMock = vi.mocked(authFetch)

    authFetchMock.mockImplementation((input) => {
      if (input === '/api/members/shot-targets') {
        return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Rasmus',
            godname: 'Odin',
            avatarUrl: null,
          },
        ]),
        } as Response)
      }

      if (input === '/api/add/recent') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response)
      }

      return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, message: 'Added shot' }),
        } as Response)
    })

    render(
      <MemoryRouter>
        <AddShot />
      </MemoryRouter>,
    )

    await user.type(
      await screen.findByPlaceholderText(/search by name/i),
      'Rasmus',
    )
    await user.click(screen.getByRole('button', { name: /odin, rasmus/i }))
    await user.clear(screen.getByRole('spinbutton'))
    await user.type(screen.getByRole('spinbutton'), '5')
    await user.type(screen.getByPlaceholderText(/reason/i), 'Testing')

    await user.click(screen.getByRole('button', { name: /add shot/i }))

    expect(authFetchMock).toHaveBeenCalledWith('/api/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 5,
        reason: 'Testing',
      }),
    })

    vi.unstubAllGlobals()
  })
})
