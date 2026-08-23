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
    <header className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between">
        {/* Left side - Logo and mobile menu */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="md:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>

          {/* Logo - hidden on mobile when sidebar is collapsed */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DK</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">DataKiln</h1>
          </div>
        </div>

        {/* Center - Global Search */}
        <div className="flex-1 max-w-lg mx-8 hidden lg:block">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search workflows, runs, results..."
              className="pl-10 pr-4 h-9 bg-gray-50 border-gray-200 focus:bg-white cursor-pointer dark:bg-gray-700 dark:border-gray-600 dark:focus:bg-gray-600"
              onClick={handleSearchClick}
              readOnly
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-xs text-gray-400 dark:text-gray-500">⌘⇧K</span>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearchClick}
            className="lg:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Command Palette */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCommandPalette}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
            title="Command Palette (⌘K)"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="ml-2 hidden xl:inline text-sm">⌘K</span>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // For now, just show a notification that this feature is coming soon
              console.log('Notifications clicked')
            }}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
            title="Notifications"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 7h5l-5 5V7zM5 17h5l5 5v-5H5zM5 7h5l5 5V7H5z" />
            </svg>
            {/* Notification dot */}
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-600">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">U</span>
              </div>
            </Button>

            {isUserMenuOpen && (
              <div
                className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
                role="menu"
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-600">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">U</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Local User</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Not signed in</div>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    onClick={() => {
                      console.log('Profile clicked')
                      setIsUserMenuOpen(false)
                    }}
                    role="menuitem"
                  >
                    <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </button>

                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => {
                      console.log('Settings clicked')
                      setIsUserMenuOpen(false)
                    }}
                    role="menuitem"
                  >
                    <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600">
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => {
                      console.log('Logout clicked')
                      setIsUserMenuOpen(false)
                    }}
                    role="menuitem"
                  >
                    <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
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