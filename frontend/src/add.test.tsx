import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AddShot from './pages/Add'

describe('AddShot', () => {
  it('submits the add shot form', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, message: 'Added Rasmus' }),
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<AddShot />)

    await user.type(screen.getByPlaceholderText(/write member name/i), 'Rasmus')
    await user.clear(screen.getByRole('spinbutton'))
    await user.type(screen.getByRole('spinbutton'), '5')
    await user.type(screen.getByPlaceholderText(/reason/i), 'Testing')

    await user.click(screen.getByRole('button', { name: /add shot/i }))

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Rasmus',
        amount: 5,
        reason: 'Testing',
      }),
    })

    vi.unstubAllGlobals()
  })
})
