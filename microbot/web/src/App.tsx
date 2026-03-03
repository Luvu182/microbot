// Root application — state-based routing, auth, dark mode, layout
import { useCallback, useEffect, useState } from 'react'
import { Header } from './components/layout/header'
import { Sidebar } from './components/layout/sidebar'
import { MessageList } from './components/chat/message-list'
import { AgentActivityIndicator } from './components/chat/agent-activity'
import { InputBar } from './components/chat/input-bar'
import { useChat } from './hooks/use-chat'
import { LoginPage } from './pages/login'
import { DashboardPage } from './pages/dashboard'
import { ChannelsPage } from './pages/channels'
import { ConfigPage } from './pages/config'
import { CronPage } from './pages/cron'
import { SessionsPage } from './pages/sessions'
import { SettingsPage } from './pages/settings'

type Page = 'chat' | 'dashboard' | 'channels' | 'config' | 'cron' | 'sessions' | 'settings'

// Token from meta tag injected by backend (production mode)
function getMetaToken(): string | undefined {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="nanobot-token"]')
  return meta?.content || undefined
}

// Resolve auth token: meta tag > sessionStorage > undefined
function resolveToken(): string | undefined {
  return getMetaToken() || sessionStorage.getItem('nanobot-token') || undefined
}

// Generate / restore a default session key for first-time visitors
function defaultSessionKey(): string {
  const stored = localStorage.getItem('nanobot-session-key')
  if (stored) return stored
  const key = `web-${Date.now()}`
  localStorage.setItem('nanobot-session-key', key)
  return key
}

// Dark mode: default dark, persisted in localStorage
function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('nanobot-dark-mode')
    return stored === null ? true : stored === 'true'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('nanobot-dark-mode', String(isDark))
  }, [isDark])

  const toggle = useCallback(() => setIsDark((d) => !d), [])
  return { isDark, toggle }
}

// Check if backend requires auth by probing /api/sessions without a token
async function checkAuthRequired(): Promise<boolean> {
  try {
    const res = await fetch('/api/sessions')
    return res.status === 401
  } catch {
    return false
  }
}

export default function App() {
  const { isDark, toggle: toggleDark } = useDarkMode()
  const [token, setToken] = useState<string | undefined>(resolveToken)
  const [authRequired, setAuthRequired] = useState(false)
  const [authChecked, setAuthChecked] = useState(() => !!resolveToken())
  const [activePage, setActivePage] = useState<Page>('chat')
  const [sessionKey, setSessionKey] = useState<string>(defaultSessionKey)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // On mount: check if backend requires a token (skip if already have token)
  useEffect(() => {
    if (token) return
    checkAuthRequired().then((required) => {
      setAuthRequired(required)
      setAuthChecked(true)
    })
  }, [token])

  const chat = useChat({ sessionKey, token })

  const handleLogin = useCallback((newToken: string) => {
    setToken(newToken)
    setAuthRequired(false)
  }, [])

  const handleSelectSession = useCallback((key: string) => {
    setSessionKey(key)
    localStorage.setItem('nanobot-session-key', key)
    setSidebarOpen(false)
    setActivePage('chat')
  }, [])

  const handleNewSession = useCallback(() => {
    const key = `web-${Date.now()}`
    setSessionKey(key)
    localStorage.setItem('nanobot-session-key', key)
    chat.resetSession()
    setSidebarOpen(false)
    setActivePage('chat')
  }, [chat])

  const handleNavigate = useCallback((page: string) => {
    setActivePage(page as Page)
    setSidebarOpen(false)
  }, [])

  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), [])

  // Waiting for auth check
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <span className="text-sm text-gray-400 dark:text-gray-500">Loading…</span>
      </div>
    )
  }

  // Show login if auth is required and no token yet
  if (authRequired && !token) {
    return <LoginPage onLogin={handleLogin} />
  }

  function renderPage() {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage token={token} onNavigate={handleNavigate} />
      case 'channels':
        return <ChannelsPage token={token} />
      case 'config':
        return <ConfigPage token={token} />
      case 'cron':
        return <CronPage token={token} />
      case 'sessions':
        return <SessionsPage token={token} />
      case 'settings':
        return <SettingsPage token={token} />
      default:
        return (
          <>
            <MessageList
              messages={chat.messages}
              footer={<AgentActivityIndicator activity={chat.agentActivity} />}
            />
            <InputBar
              onSend={chat.sendMessage}
              onStop={chat.sendStop}
              isThinking={chat.isThinking}
              isConnected={chat.isConnected}
            />
          </>
        )
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header
        wsStatus={chat.wsStatus}
        isDark={isDark}
        onToggleDark={toggleDark}
        onToggleSidebar={toggleSidebar}
        sessionKey={activePage === 'chat' ? sessionKey : ''}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — hidden on mobile unless toggled, always visible on lg+ */}
        <div className={`shrink-0 w-64 flex-col ${sidebarOpen ? 'flex' : 'hidden'} lg:flex`}>
          <Sidebar
            activePage={activePage}
            activeSessionKey={sessionKey}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onNavigate={handleNavigate}
            token={token}
          />
        </div>

        {/* Mobile overlay — click outside closes sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-10 lg:hidden"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
