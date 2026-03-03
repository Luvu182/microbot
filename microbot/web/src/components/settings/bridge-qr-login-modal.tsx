// Bridge QR login modal — polls bridge status, shows QR code, auto-closes on connect
import { useEffect, useRef, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface BridgeStatus {
  qr: string | null
  status: 'connected' | 'disconnected' | 'qr_pending' | string
}

interface BridgeQrLoginModalProps {
  channel: string
  open: boolean
  onClose: () => void
}

const POLL_MS = 2000

export function BridgeQrLoginModal({ channel, open, onClose }: BridgeQrLoginModalProps) {
  const [status, setStatus] = useState<BridgeStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const closingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/bridge/${channel}/status`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: BridgeStatus = await res.json()
      setStatus(data)
      setError(null)

      // Auto-close on connect
      if (data.status === 'connected' && !closingRef.current) {
        closingRef.current = true
        setTimeout(() => { onCloseRef.current(); closingRef.current = false }, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    }
  }, [channel])

  useEffect(() => {
    if (!open) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      setStatus(null)
      setError(null)
      closingRef.current = false
      return
    }
    fetchStatus()
    timerRef.current = setInterval(fetchStatus, POLL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [open, fetchStatus])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const channelLabel = channel.charAt(0).toUpperCase() + channel.slice(1)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200
        dark:border-gray-700 p-6 max-w-sm w-full mx-4 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connect {channelLabel}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content — state-based rendering */}
        <div className="flex flex-col items-center space-y-3">
          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          {!status && !error && (
            <div className="py-8 text-center space-y-2">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Starting bridge...</p>
            </div>
          )}

          {status?.status === 'disconnected' && (
            <div className="py-8 text-center space-y-2">
              <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Waiting for bridge to start...</p>
            </div>
          )}

          {status?.status === 'qr_pending' && status.qr && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scan this QR code with {channelLabel} to connect
              </p>
              <div className="inline-block p-3 bg-white rounded-xl border border-gray-200">
                <QRCodeSVG value={status.qr} size={200} />
              </div>
            </div>
          )}

          {status?.status === 'qr_pending' && !status.qr && (
            <div className="py-8 text-center space-y-2">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Generating QR code...</p>
            </div>
          )}

          {status?.status === 'connected' && (
            <div className="py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Connected!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
