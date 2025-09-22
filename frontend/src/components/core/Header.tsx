import * as React from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { ThemeToggle } from "../ui/theme-toggle"
import { useGlobalSearch } from "../../stores/uiStore"

interface HeaderProps {
  onCommandPalette?: () => void
  onToggleSidebar?: () => void
}

const Header: React.FC<HeaderProps> = ({
  onCommandPalette,
  onToggleSidebar
}) => {
  const globalSearch = useGlobalSearch()
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false)
  const userMenuRef = React.useRef<HTMLDivElement>(null)

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K for command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.shiftKey) {
        e.preventDefault()
        onCommandPalette?.()
      }
      // Cmd+Shift+K for global search
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault()
        globalSearch.open()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCommandPalette, globalSearch])

  // Handle user menu outside clicks and escape
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isUserMenuOpen])

  const handleSearchClick = () => {
    globalSearch.open()
  }


  return (
    <header className="theme-bg-surface theme-border border-b px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Hamburger Menu & Logo */}
        <div className="flex items-center space-x-4">
          {/* Hamburger Menu - visible on mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="md:hidden theme-text-secondary hover:theme-text-primary"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DA</span>
            </div>
            <h1 className="text-xl font-semibold theme-text-primary">DataKiln</h1>
          </div>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search workflows, runs, results..."
              className="pl-10 pr-4 cursor-pointer"
              onClick={handleSearchClick}
              readOnly
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-xs theme-text-muted">⌘⇧K</span>
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Command Palette Trigger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCommandPalette}
            className="theme-text-secondary hover:theme-text-primary"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="ml-2 hidden sm:inline">⌘K</span>
          </Button>

          {/* User/Session Menu */}
          <div className="relative" ref={userMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 theme-bg-surface-secondary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium theme-text-primary">U</span>
              </div>
              <svg className="h-4 w-4 theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>

            {isUserMenuOpen && (
              <div
                className="absolute right-0 z-50 min-w-[200px] overflow-hidden rounded-md border bg-white p-1 text-gray-950 shadow-md"
                role="menu"
              >
                <div
                  className="flex items-center space-x-3 px-2 py-2 border-b border-gray-200"
                  role="menuitem"
                >
                  <div className="w-10 h-10 theme-bg-surface-secondary rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium theme-text-primary">U</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">Local User</div>
                    <div className="text-xs text-gray-500">Not signed in</div>
                  </div>
                </div>

                <div
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100"
                  onClick={() => {
                    console.log('Profile clicked')
                    setIsUserMenuOpen(false)
                  }}
                  role="menuitem"
                  tabIndex={0}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </div>

                <div
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100"
                  onClick={() => {
                    console.log('Settings clicked')
                    setIsUserMenuOpen(false)
                  }}
                  role="menuitem"
                  tabIndex={0}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </div>

                <div className="-mx-1 my-1 h-px bg-gray-200" />

                <div
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100"
                  onClick={() => {
                    console.log('Logout clicked')
                    setIsUserMenuOpen(false)
                  }}
                  role="menuitem"
                  tabIndex={0}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </header>
  )
}

export default Header