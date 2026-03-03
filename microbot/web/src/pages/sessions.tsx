// Sessions page — list all sessions, view history, clear session
import { useCallback, useEffect, useState } from 'react'
import { createApiClient } from '../lib/api-client'
import type { ApiSession, ApiSessionDetail } from '../types/messages'

interface SessionsPageProps {
  token?: string
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ---- Session history panel ----
interface SessionHistoryProps {
  sessionKey: string
  token?: string
  onClose: () => void
}

function SessionHistory({ sessionKey, token, onClose }: SessionHistoryProps) {
  const [detail, setDetail] = useState<ApiSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    createApiClient(token).getSession(sessionKey)
      .then((d) => { if (alive) setDetail(d) })
      .catch(() => { if (alive) setError('Failed to load session') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [sessionKey, token])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col
        bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Session History</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{sessionKey}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
              text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Loading…</p>
          )}
          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 text-center py-4">{error}</p>
          )}
          {detail && detail.messages.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No messages</p>
          )}
          {detail?.messages.map((msg, i) => (
            <div
              key={i}
              className={`px-3 py-2 rounded-lg text-sm max-w-[85%]
                ${msg.role === 'user'
                  ? 'ml-auto bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
            >
              <div className="text-xs font-medium opacity-60 mb-1 capitalize">{msg.role}</div>
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---- Main page ----
export function SessionsPage({ token }: SessionsPageProps) {
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewingKey, setViewingKey] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await createApiClient(token).getSessions()
      const sorted = [...res.sessions].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
      setSessions(sorted)
    } catch {
      setError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleClear(key: string) {
    setDeletingKey(key)
    try {
      await createApiClient(token).deleteSession(key)
      setSessions((prev) => prev.filter((s) => s.key !== key))
    } catch {
      setError('Failed to clear session')
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Sessions</h1>

      {error && (
        <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
          Loading sessions…
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
          No sessions found
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Session Key
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Created
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Updated
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sessions.map((s) => (
                <tr key={s.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                    {s.key}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(s.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(s.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setViewingKey(s.key)}
                        className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400
                          focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleClear(s.key)}
                        disabled={deletingKey === s.key}
                        className="text-xs text-red-500 hover:text-red-600 dark:text-red-400
                          disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
                      >
                        {deletingKey === s.key ? 'Clearing…' : 'Clear'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingKey && (
        <SessionHistory
          sessionKey={viewingKey}
          token={token}
          onClose={() => setViewingKey(null)}
        />
      )}
    </div>
  )
}
