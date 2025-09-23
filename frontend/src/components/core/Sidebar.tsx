import * as React from "react"
import { Link, useLocation } from "react-router-dom"

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation()

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "/dashboard" },
    { id: "workflows", label: "Workflows", icon: "Workflow", path: "/workflows" },
    { id: "runs", label: "Runs", icon: "PlayCircle", path: "/runs" },
    { id: "results", label: "Results", icon: "FileText", path: "/results" },
    { id: "selectors-lab", label: "Selectors Lab", icon: "Target", path: "/selectors-lab" },
    { id: "templates", label: "Templates", icon: "FileTemplate", path: "/templates" },
    { id: "transcript-analysis", label: "Transcript Analysis", icon: "Mic", path: "/transcript-analysis" },
    { id: "extension-capture", label: "Extension Capture", icon: "Zap", path: "/extension-capture" },
    { id: "settings", label: "Settings", icon: "Settings", path: "/settings" }
  ]

  const getIcon = (iconName: string) => {
    const icons: Record<string, string> = {
      LayoutDashboard: "M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z",
      Workflow: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
      PlayCircle: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z",
      FileText: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
      Target: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z",
      FileTemplate: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M10 12l4 4M10 16l4-4",
      Mic: "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9-.36-.98-.85C16.52 8.2 14.47 7 12 7s-4.52 1.2-4.93 3.15c-.08.49-.49.85-.98.85-.61 0-1.09-.54-1-1.14.49-3 2.89-5.35 5.91-5.35s5.42 2.35 5.91 5.35c.09.6-.39 1.14-1 1.14z",
      Zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
      Settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.05-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
    }
    return icons[iconName] || ""
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed md:relative top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto md:block
      `}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center px-6 py-4 border-b border-gray-200">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DK</span>
            </div>
            <span className="ml-3 text-lg font-semibold text-gray-900">DataKiln</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <svg
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIcon(item.icon)} />
                      </svg>
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              DataKiln v1.0.0
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar