// Inline bridge channel status badge with Connect button — generic for Zalo/WhatsApp
import { useState, useEffect, useRef } from 'react'
import { BridgeQrLoginModal } from './bridge-qr-login-modal'

interface BridgeChannelStatusProps {
  channel: string
  active: boolean
}

const POLL_MS = 5000

export function BridgeChannelStatus({ channel, active }: BridgeChannelStatusProps) {
  const [status, setStatus] = useState<string>('disconnected')
  const [modalOpen, setModalOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      return
    }
    const poll = async () => {
      try {
        const res = await fetch(`/api/bridge/${channel}/status`)
        if (res.ok) {
          const data = await res.json()
          setStatus(data.status || 'disconnected')
        }
      } catch { /* ignore polling errors */ }
    }
    poll()
    timerRef.current = setInterval(poll, POLL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [active, channel])

  if (!active) return null

  return (
    <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Connection
          </span>
          <StatusBadge status={status} />
        </div>
        {status !== 'connected' && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg
              bg-blue-50 text-blue-600 hover:bg-blue-100
              dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50
              transition-colors"
          >
            Connect with QR
          </button>
        )}
      </div>
      <BridgeQrLoginModal
        channel={channel}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
        bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Connected
      </span>
    )
  }
  if (status === 'qr_pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
        bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        Waiting for QR scan
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
      bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      Disconnected
    </span>
  )
}
