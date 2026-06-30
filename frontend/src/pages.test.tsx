import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderRoute(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Page routes', () => {
  it.each([
    ['/redeem', 'Redeem bongs'],
    ['/profile', 'Odin'],
    ['/leaderboard', 'Bongs received'],
    ['/notifications', 'Notifications'],
    ['/gudar', 'gudar'],
    ['/link-member', 'Connect member account'],
  ])('renders %s', (path, heading) => {
    renderRoute(path)
    expect(
      screen.getByRole('heading', {
        name: new RegExp(heading, 'i'),
      }),
    ).toBeInTheDocument()
  })
})
