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

    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, message: 'Added Rasmus' }),
    }as Response)

    render(
      <MemoryRouter>
        <AddShot />
      </MemoryRouter>,
    )

    await user.type(screen.getByPlaceholderText(/write member name/i), 'Rasmus')
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
        Id: 'Rasmus',
        amount: 5,
        reason: 'Testing',
      }),
    })

    vi.unstubAllGlobals()
  })
})
