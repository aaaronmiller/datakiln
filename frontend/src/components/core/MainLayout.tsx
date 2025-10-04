import * as React from "react"
import Header from "./Header"
import Sidebar from "./Sidebar"
import CommandPalette from "./CommandPalette"
import GlobalSearchModal from "./GlobalSearchModal"
import { ToastContainer } from "../ui/toast"
import { ErrorBoundary } from "../ui/error-boundary"
import { Loading } from "../ui/loading"
import { useCommandPalette, useSidebar, useNotifications, useLoading } from "../../stores/uiStore"

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const commandPalette = useCommandPalette()
  const sidebar = useSidebar()
  const notifications = useNotifications()
  const loading = useLoading()

  const handleCommandPalette = () => {
    commandPalette.open()
    // Test notification
    notifications.add({
      type: 'info',
      title: 'Command Palette Opened',
      message: 'Use keyboard shortcuts to navigate quickly!'
    })
  }

  const toggleSidebar = () => {
    sidebar.toggle()
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Header onCommandPalette={handleCommandPalette} onToggleSidebar={toggleSidebar} />
        <div className="flex h-[calc(100vh-64px)]">
          <Sidebar isOpen={sidebar.isOpen} onClose={sidebar.close} />
          <main className="flex-1 overflow-auto bg-surface transition-all duration-300 ease-in-out">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        <CommandPalette />
        <GlobalSearchModal />
        <ToastContainer
          notifications={notifications.notifications}
          onClose={notifications.remove}
        />
        {loading.isLoading && (
          <Loading
            type="spinner"
            size="lg"
            message={loading.message || "Loading..."}
            fullScreen
          />
        )}
      </div>
    </ErrorBoundary>
  )
}

export default MainLayout