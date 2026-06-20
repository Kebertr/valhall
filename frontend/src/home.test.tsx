import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Home navigation', () => {
  it('redirects to add page from menu Add Shot button', async () => {
    const user = userEvent.setup()

    window.history.pushState({}, '', '/')
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /add shot from menu/i })
    )

    expect(window.location.pathname).toBe('/add')
  })

  it('redirects to add page from footer Add Shot button', async () => {
    const user = userEvent.setup()

    window.history.pushState({}, '', '/')
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /add shot from footer/i })
    )

    expect(window.location.pathname).toBe('/add')
  })
})