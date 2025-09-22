import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Dialog, DialogContent } from "../ui/dialog"
import { Input } from "../ui/input"
import { useCommandPalette } from "../../stores/uiStore"

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
  const { isOpen, close } = useCommandPalette()
  const navigate = useNavigate()
  const [query, setQuery] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Define all available actions
  const actions: CommandAction[] = React.useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      description: 'Navigate to the main dashboard',
      icon: '🏠',
      shortcut: 'gd',
      category: 'navigation',
      handler: () => navigate('/dashboard')
    },
    {
      id: 'nav-workflows',
      title: 'Go to Workflows',
      description: 'Navigate to workflow management',
      icon: '⚙️',
      shortcut: 'gw',
      category: 'navigation',
      handler: () => navigate('/workflows')
    },
    {
      id: 'nav-runs',
      title: 'Go to Runs',
      description: 'Navigate to run history',
      icon: '▶️',
      shortcut: 'gr',
      category: 'navigation',
      handler: () => navigate('/runs')
    },
    {
      id: 'nav-results',
      title: 'Go to Results',
      description: 'Navigate to results page',
      icon: '📄',
      shortcut: 'gR',
      category: 'navigation',
      handler: () => navigate('/results')
    },
    {
      id: 'nav-selectors',
      title: 'Go to Selectors Lab',
      description: 'Navigate to selectors testing',
      icon: '🎯',
      shortcut: 'gs',
      category: 'navigation',
      handler: () => navigate('/selectors-lab')
    },
    {
      id: 'nav-templates',
      title: 'Go to Templates',
      description: 'Navigate to template management',
      icon: '📋',
      shortcut: 'gt',
      category: 'navigation',
      handler: () => navigate('/templates')
    },
    {
      id: 'nav-transcript',
      title: 'Go to Transcript Analysis',
      description: 'Navigate to transcript analysis',
      icon: '🎵',
      shortcut: 'gT',
      category: 'navigation',
      handler: () => navigate('/transcript-analysis')
    },
    {
      id: 'nav-extension',
      title: 'Go to Extension Capture',
      description: 'Navigate to extension capture',
      icon: '📱',
      shortcut: 'ge',
      category: 'navigation',
      handler: () => navigate('/extension-capture')
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      description: 'Navigate to settings',
      icon: '⚙️',
      shortcut: 'gS',
      category: 'navigation',
      handler: () => navigate('/settings')
    },
    // Actions
    {
      id: 'action-new-run',
      title: 'Start New Run',
      description: 'Create and start a new workflow run',
      icon: '🚀',
      shortcut: 'nr',
      category: 'actions',
      handler: () => {
        // TODO: Implement new run creation
        console.log('Start new run')
      }
    },
    {
      id: 'action-new-workflow',
      title: 'Create New Workflow',
      description: 'Create a new workflow',
      icon: '✨',
      shortcut: 'nw',
      category: 'actions',
      handler: () => navigate('/workflows')
    },
    // System
    {
      id: 'system-console',
      title: 'Open Developer Console',
      description: 'Open browser developer console',
      icon: '🖥️',
      shortcut: 'dc',
      category: 'system',
      handler: () => {
        // Open developer console
        console.log('Opening developer console...')
        // This will open the console in most browsers
        console.clear()
        console.log('Developer console opened')
      }
    },
    {
      id: 'system-refresh',
      title: 'Refresh Page',
      description: 'Reload the current page',
      icon: '🔄',
      shortcut: 'rf',
      category: 'system',
      handler: () => window.location.reload()
    },
    {
      id: 'system-clear-cache',
      title: 'Clear Local Cache',
      description: 'Clear local storage and cache',
      icon: '🗑️',
      shortcut: 'cc',
      category: 'system',
      handler: () => {
        localStorage.clear()
        sessionStorage.clear()
        console.log('Cache cleared')
      }
    }
  ], [navigate])

  // Filter and sort actions based on query
  const filteredActions = React.useMemo(() => {
    if (!query.trim()) {
      return actions
    }

    const lowerQuery = query.toLowerCase()

    // Simple fuzzy matching
    const matches = actions.filter(action => {
      const titleMatch = action.title.toLowerCase().includes(lowerQuery)
      const descMatch = action.description?.toLowerCase().includes(lowerQuery)
      const shortcutMatch = action.shortcut?.toLowerCase().includes(lowerQuery)
      return titleMatch || descMatch || shortcutMatch
    })

    // Sort by relevance (exact matches first, then partial matches)
    return matches.sort((a, b) => {
      const aTitle = a.title.toLowerCase()
      const bTitle = b.title.toLowerCase()
      const aStarts = aTitle.startsWith(lowerQuery)
      const bStarts = bTitle.startsWith(lowerQuery)

      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1

      return a.title.localeCompare(b.title)
    })
  }, [actions, query])

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setQuery("")
      setSelectedIndex(0)
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredActions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < filteredActions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredActions.length) {
          handleActionSelect(filteredActions[selectedIndex])
        }
        break
      case 'Escape':
        close()
        break
    }
  }

  const handleActionSelect = (action: CommandAction) => {
    action.handler()
    close()
  }

  const getCategoryColor = (category: CommandAction['category']) => {
    switch (category) {
      case 'navigation': return 'bg-blue-100 text-blue-800'
      case 'actions': return 'bg-green-100 text-green-800'
      case 'system': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden p-0">
        <div className="p-4 border-b">
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4 text-lg"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-96">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center theme-text-muted">
              <svg className="mx-auto h-12 w-12 theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.98-5.5-2.5" />
              </svg>
              <h3 className="mt-2 text-sm font-medium">No commands found</h3>
              <p className="mt-1 text-sm">Try adjusting your search terms.</p>
            </div>
          ) : (
            <div>
              {filteredActions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => handleActionSelect(action)}
                  className={`w-full text-left px-4 py-3 hover:theme-bg-surface-secondary border-b border-gray-100 last:border-b-0 flex items-start space-x-3 ${
                    index === selectedIndex ? 'theme-bg-surface-secondary' : ''
                  }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <span className="text-lg" role="img" aria-label={action.title}>
                    {action.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium theme-text-primary truncate">
                        {action.title}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(action.category)}`}>
                        {action.category}
                      </span>
                      {action.shortcut && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 theme-text-muted">
                          {action.shortcut}
                        </span>
                      )}
                    </div>
                    {action.description && (
                      <p className="text-sm theme-text-muted truncate">
                        {action.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-xs theme-text-muted">
            <div className="flex items-center space-x-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
            <div>
              {filteredActions.length > 0 && `${filteredActions.length} command${filteredActions.length === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CommandPalette