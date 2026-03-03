// Tab bar for settings page — Providers | Channels | Agent | Gateway | Advanced

export type SettingsTab = 'providers' | 'channels' | 'agent' | 'gateway' | 'advanced'

interface SettingsTabBarProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'providers', label: 'Providers' },
  { id: 'channels', label: 'Channels' },
  { id: 'agent', label: 'Agent' },
  { id: 'gateway', label: 'Gateway' },
  { id: 'advanced', label: 'Advanced' },
]

export function SettingsTabBar({ activeTab, onTabChange }: SettingsTabBarProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0
            ${activeTab === id
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
