// Login page — prompts for Bearer token, stores in sessionStorage
import { useState } from 'react'
import type { FormEvent } from 'react'

interface LoginPageProps {
  onLogin: (token: string) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = token.trim()
    if (!trimmed) {
      setError('Token is required')
      return
    }

    setLoading(true)
    try {
      // Validate token against /api/sessions (requires auth)
      const res = await fetch('/api/sessions', {
        headers: { Authorization: `Bearer ${trimmed}` },
      })
      if (res.status === 401) {
        setError('Invalid token — access denied')
        return
      }
      // Store in sessionStorage (cleared on tab close — XSS mitigation)
      sessionStorage.setItem('nanobot-token', trimmed)
      onLogin(trimmed)
    } catch {
      setError('Could not reach server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="w-full max-w-sm px-6 py-8 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-lg">
        <div className="text-center mb-6">
          <span className="text-4xl">🤖</span>
          <h1 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">Nanobot</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your access token</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Access Token
            </label>
            <input
              id="token"
              type="password"
              autoComplete="current-password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Bearer token from config"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50
              text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {loading ? 'Verifying…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-gray-400 dark:text-gray-500">
          Token is stored only in sessionStorage and cleared when you close the tab.
        </p>
      </div>
    </div>
  )
}
