// Top header bar — logo, WS connection status, dark/light mode toggle
import type { WsStatus } from '../../lib/ws-client'

interface HeaderProps {
  wsStatus: WsStatus
  isDark: boolean
  onToggleDark: () => void
  onToggleSidebar: () => void
  sessionKey: string
}

function StatusDot({ wsStatus }: { wsStatus: WsStatus }) {
  const colors: Record<WsStatus, string> = {
    connected: 'bg-green-400',
    connecting: 'bg-yellow-400 animate-pulse',
    reconnecting: 'bg-orange-400 animate-pulse',
    disconnected: 'bg-red-400',
  }
  const labels: Record<WsStatus, string> = {
    connected: 'Connected',
    connecting: 'Connecting…',
    reconnecting: 'Reconnecting…',
    disconnected: 'Disconnected',
  }
  return (
    <div className="flex items-center gap-1.5" role="status" aria-label={`Status: ${labels[wsStatus]}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${colors[wsStatus]}`} aria-hidden="true" />
      <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
        {labels[wsStatus]}
      </span>
    </div>
  )
}

export function Header({ wsStatus, isDark, onToggleDark, onToggleSidebar, sessionKey }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
      {/* Hamburger — mobile sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="w-8 h-8 flex items-center justify-center rounded-lg
          text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
          hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white select-none">
        <span className="text-lg">🤖</span>
        <span className="text-base">Nanobot</span>
      </div>

      {/* Session key pill */}
      {sessionKey && (
        <div className="hidden sm:flex items-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {sessionKey.length > 24 ? `${sessionKey.slice(0, 22)}…` : sessionKey}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* WS status */}
      <StatusDot wsStatus={wsStatus} />

      {/* Dark/light toggle */}
      <button
        onClick={onToggleDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="w-8 h-8 flex items-center justify-center rounded-lg
          text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
          hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {isDark ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        )}
      </button>
    </header>
  )
}
