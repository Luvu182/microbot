// Dashboard page — system status, channel cards, active sessions count, quick links
import { useEffect, useState } from 'react'
import { createApiClient } from '../lib/api-client'
import type { ApiStatus, ApiChannel, ApiSession, CronJob } from '../types/messages'

interface DashboardPageProps {
  token?: string
  onNavigate: (page: string) => void
}

interface DashboardData {
  status: ApiStatus | null
  channels: ApiChannel[]
  sessions: ApiSession[]
  cronJobs: CronJob[]
}

function StatusCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl font-semibold text-gray-900 dark:text-white">{value}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function ChannelChip({ channel }: { channel: ApiChannel }) {
  const statusColor = channel.enabled
    ? channel.status === 'connected'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${statusColor}`}>
      <span className="font-medium capitalize">{channel.name}</span>
      <span className="text-xs opacity-75">{channel.status}</span>
    </div>
  )
}

export function DashboardPage({ token, onNavigate }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData>({
    status: null,
    channels: [],
    sessions: [],
    cronJobs: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const api = createApiClient(token)
    let alive = true

    async function load() {
      try {
        const [statusRes, channelsRes, sessionsRes, cronRes] = await Promise.allSettled([
          api.getStatus(),
          api.getChannels(),
          api.getSessions(),
          api.getCronJobs(),
        ])
        if (!alive) return
        setData({
          status: statusRes.status === 'fulfilled' ? statusRes.value : null,
          channels: channelsRes.status === 'fulfilled' ? channelsRes.value.channels : [],
          sessions: sessionsRes.status === 'fulfilled' ? sessionsRes.value.sessions : [],
          cronJobs: cronRes.status === 'fulfilled' ? cronRes.value.jobs : [],
        })
      } catch {
        if (alive) setError('Failed to load dashboard data')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [token])

  const enabledChannels = data.channels.filter((c) => c.enabled).length
  const connectedChannels = data.channels.filter((c) => c.status === 'connected').length
  const activeCronJobs = data.cronJobs.filter((j) => j.enabled).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        Loading dashboard…
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>

      {error && (
        <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard
          label="System"
          value={data.status?.status ?? 'unknown'}
          sub={data.status ? `v${data.status.version}` : undefined}
        />
        <StatusCard
          label="Sessions"
          value={String(data.sessions.length)}
          sub="total sessions"
        />
        <StatusCard
          label="Channels"
          value={`${connectedChannels}/${enabledChannels}`}
          sub="connected/enabled"
        />
        <StatusCard
          label="Cron Jobs"
          value={String(activeCronJobs)}
          sub={`of ${data.cronJobs.length} total`}
        />
      </div>

      {/* Channel status */}
      {data.channels.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Channels</h2>
            <button
              onClick={() => onNavigate('channels')}
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
            >
              View all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.channels.map((ch) => (
              <ChannelChip key={ch.name} channel={ch} />
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { page: 'channels', label: 'Channels', desc: 'View channel statuses' },
          { page: 'config', label: 'Config', desc: 'Edit configuration' },
          { page: 'cron', label: 'Cron Jobs', desc: 'Schedule management' },
          { page: 'sessions', label: 'Sessions', desc: 'Browse chat history' },
          { page: 'chat', label: 'Chat', desc: 'Open chat interface' },
        ].map(({ page, label, desc }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
