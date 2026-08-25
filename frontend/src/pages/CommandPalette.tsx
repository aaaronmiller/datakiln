import React from 'react'
import { Badge } from '../components/ui/badge'

interface CommandAction {
  id: string
  title: string
  description?: string
  icon: string
  shortcut?: string
  category: 'navigation' | 'actions' | 'system'
  handler: () => void
}

const CommandPalette: React.FC = () => {
  // Define all available actions (same as in the component)
  const actions: CommandAction[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      description: 'Navigate to the main dashboard',
      icon: '🏠',
      shortcut: 'gd',
      category: 'navigation',
      handler: () => {}
    },
    {
      id: 'nav-workflows',
      title: 'Go to Workflows',
      description: 'Navigate to workflow management',
      icon: '⚙️',
      shortcut: 'gw',
      category: 'navigation',
      handler: () => {}
    },
    {
      id: 'nav-runs',
      title: 'Go to Runs',
      description: 'Navigate to run history',
      icon: '▶️',
      shortcut: 'gr',
      category: 'navigation',
      handler: () => {}
    },
    {
      id: 'nav-results',
      title: 'Go to Results',
      description: 'Navigate to results page',
      icon: '📄',
      shortcut: 'gR',
      category: 'navigation',
      handler: () => {}
    },
    {
      id: 'nav-selectors',
      title: 'Go to Selectors Lab',
      description: 'Navigate to selectors testing',
      icon: '🎯',
      shortcut: 'gs',
      category: 'navigation',
      handler: () => {}
    },
    {
      id: 'nav-templates',
      title: 'Go to Templates',
      description: 'Navigate to template management',
      icon: '📋',
      shortcut: 'gt',
      category: 'navigation',
      handler: () => {}
    },
    {
      id: 'nav-transcript',
      title: 'Go to Transcript Analysis',
      description: 'Navigate to transcript analysis',
      icon: '🎵',
      shortcut: 'gT',
      category: 'navigation',
      handler: () => {}
    },
    {
      id: 'nav-extension',
      title: 'Go to Extension Capture',
      description: 'Navigate to extension capture',
      icon: '📱',
      shortcut: 'ge',
      category: 'navigation',
      handler: () => {}
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      description: 'Navigate to settings',
      icon: '⚙️',
      shortcut: 'gS',
      category: 'navigation',
      handler: () => {}
    },
    // Actions
    {
      id: 'action-new-run',
      title: 'Start New Run',
      description: 'Create and start a new workflow run',
      icon: '🚀',
      shortcut: 'nr',
      category: 'actions',
      handler: () => {}
    },
    {
      id: 'action-new-workflow',
      title: 'Create New Workflow',
      description: 'Create a new workflow',
      icon: '✨',
      shortcut: 'nw',
      category: 'actions',
      handler: () => {}
    },
    // System
    {
      id: 'system-console',
      title: 'Open Developer Console',
      description: 'Open browser developer console',
      icon: '🖥️',
      shortcut: 'dc',
      category: 'system',
      handler: () => {}
    },
    {
      id: 'system-refresh',
      title: 'Refresh Page',
      description: 'Reload the current page',
      icon: '🔄',
      shortcut: 'rf',
      category: 'system',
      handler: () => {}
    },
    {
      id: 'system-clear-cache',
      title: 'Clear Local Cache',
      description: 'Clear local storage and cache',
      icon: '🗑️',
      shortcut: 'cc',
      category: 'system',
      handler: () => {}
    }
  ]

  const getCategoryColor = (category: CommandAction['category']) => {
    switch (category) {
      case 'navigation': return 'bg-blue-100 text-blue-800'
      case 'actions': return 'bg-emerald-100 text-emerald-800'
      case 'system': return 'bg-white/[0.08] text-white/90'
      default: return 'bg-white/[0.08] text-white/90'
    }
  }

  const groupedActions = actions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = []
    }
    acc[action.category].push(action)
    return acc
  }, {} as Record<string, CommandAction[]>)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Command Palette</h1>
          <p className="text-white/60 mt-2">
            Quick access to all application commands and shortcuts
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-white/50">Total Commands</div>
          <div className="text-2xl font-bold">{actions.length}</div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⌘</div>
          <div>
            <h3 className="font-medium text-blue-900">Quick Access</h3>
            <p className="text-sm text-blue-700">
              Press <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl+K</kbd> or{' '}
              <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Cmd+K</kbd> anywhere to open the command palette
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedActions).map(([category, categoryActions]) => (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold capitalize">{category}</h2>
              <Badge variant="outline">{categoryActions.length} commands</Badge>
            </div>

            <div className="grid gap-3">
              {categoryActions.map(action => (
                <div
                  key={action.id}
                  className="bg-white border border-white/10 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" role="img" aria-label={action.title}>
                        {action.icon}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{action.title}</h3>
                        {action.description && (
                          <p className="text-sm text-white/60 mt-1">{action.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(action.category)}>
                        {action.category}
                      </Badge>
                      {action.shortcut && (
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 bg-white/[0.08] border border-gray-300 rounded text-xs font-mono">
                            {action.shortcut}
                          </kbd>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white/[0.04] border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span>Open Command Palette</span>
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">Ctrl+K</kbd>
          </div>
          <div className="flex justify-between">
            <span>Navigate Up/Down</span>
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">↑↓</kbd>
          </div>
          <div className="flex justify-between">
            <span>Select Command</span>
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">Enter</kbd>
          </div>
          <div className="flex justify-between">
            <span>Close Palette</span>
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">Esc</kbd>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette