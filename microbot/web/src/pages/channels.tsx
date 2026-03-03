// Channels page — table of all channels with name, enabled state, and connection status
import { useEffect, useState } from 'react'
import { createApiClient } from '../lib/api-client'
import type { ApiChannel } from '../types/messages'

interface ChannelsPageProps {
  token?: string
}

function StatusBadge({ status, enabled }: { status: string; enabled: boolean }) {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
        bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
        Disabled
      </span>
    )
  }

  const isConnected = status === 'connected'
  const colorClass = isConnected
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
  const dotClass = isConnected
    ? 'bg-green-500'
    : 'bg-yellow-400 animate-pulse'

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {status}
    </span>
  )
}

export function ChannelsPage({ token }: ChannelsPageProps) {
  const [channels, setChannels] = useState<ApiChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const api = createApiClient(token)

    api.getChannels()
      .then((res) => { if (alive) setChannels(res.channels) })
      .catch(() => { if (alive) setError('Failed to load channels') })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [token])

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Channels</h1>

      {error && (
        <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
          Loading channels…
        </div>
      ) : channels.length === 0 ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
          No channels configured
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Channel
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Enabled
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {channels.map((ch) => (
                <tr
                  key={ch.name}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white capitalize">
                    {ch.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {ch.enabled ? (
                      <span className="text-green-600 dark:text-green-400">Yes</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ch.status} enabled={ch.enabled} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
