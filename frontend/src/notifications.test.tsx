import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Notifications page', () => {
  it('accepts and denies requests', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/notifications')
    render(<App />)

    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])
    await user.click(screen.getAllByRole('button', { name: 'Deny' })[0])

    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText('Denied')).toBeInTheDocument()
  })
})
