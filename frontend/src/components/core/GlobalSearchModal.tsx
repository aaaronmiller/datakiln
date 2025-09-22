import * as React from "react"
import { Dialog, DialogContent } from "../ui/dialog"
import { Input } from "../ui/input"
import { useGlobalSearch } from "../../stores/uiStore"

interface SearchResult {
  id: string
  type: 'workflow' | 'run' | 'result' | 'task'
  title: string
  description?: string
  metadata?: Record<string, unknown>
}

const GlobalSearchModal: React.FC = () => {
  const { isOpen, close } = useGlobalSearch()
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = React.useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const [isLoading, setIsLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const resultsRef = React.useRef<HTMLDivElement>(null)

  // Load recent searches from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('datakiln_recent_searches')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse recent searches:', e)
      }
    }
  }, [])

  // Focus input when modal opens
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setResults([])
      setSelectedIndex(-1)
      setIsLoading(false)
    }
  }, [isOpen])

  // Search function
  const performSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const data = await response.json()
      const apiResults: SearchResult[] = data.results.map((result: Record<string, unknown>) => ({
        id: result.id as string,
        type: result.type as SearchResult['type'],
        title: result.title as string,
        description: result.description as string,
        metadata: result.metadata as Record<string, unknown>
      }))

      setResults(apiResults)
      setSelectedIndex(-1)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        close()
        break
    }
  }

  const handleResultSelect = (result: SearchResult) => {
    // Add to recent searches
    const updatedRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(updatedRecent)
    localStorage.setItem('datakiln_recent_searches', JSON.stringify(updatedRecent))

    // TODO: Handle navigation to selected result
    console.log('Selected result:', result)
    close()
  }

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'workflow':
        return '⚙️'
      case 'run':
        return '▶️'
      case 'result':
        return '📄'
      case 'task':
        return '📋'
      default:
        return '🔍'
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
              placeholder="Search workflows, runs, results..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4 text-lg"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {isLoading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-96">
          {/* Recent Searches */}
          {query === "" && recentSearches.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-medium theme-text-muted mb-2">Recent Searches</h3>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(search)}
                    className="w-full text-left px-3 py-2 rounded-md hover:theme-bg-surface-secondary theme-text-primary flex items-center space-x-3"
                  >
                    <svg className="h-4 w-4 theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {query !== "" && (
            <div ref={resultsRef}>
              {results.length === 0 && !isLoading && (
                <div className="p-8 text-center theme-text-muted">
                  <svg className="mx-auto h-12 w-12 theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium">No results found</h3>
                  <p className="mt-1 text-sm">Try adjusting your search terms.</p>
                </div>
              )}

              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                  className={`w-full text-left px-4 py-3 hover:theme-bg-surface-secondary border-b border-gray-100 last:border-b-0 flex items-start space-x-3 ${
                    index === selectedIndex ? 'theme-bg-surface-secondary' : ''
                  }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <span className="text-lg" role="img" aria-label={result.type}>
                    {getResultIcon(result.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium theme-text-primary truncate">
                        {result.title}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 theme-text-muted capitalize">
                        {result.type}
                      </span>
                    </div>
                    {result.description && (
                      <p className="text-sm theme-text-muted truncate mt-1">
                        {result.description}
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
              {results.length > 0 && `${results.length} result${results.length === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GlobalSearchModal