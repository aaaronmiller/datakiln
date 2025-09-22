import * as React from "react"
import { Link, useLocation } from "react-router-dom"

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation()

  const sections = [
    { id: "dashboard", label: "Dashboard", icon: "📊", path: "/dashboard" },
    { id: "workflows", label: "Workflows", icon: "⚡", path: "/workflows" },
    { id: "runs", label: "Runs", icon: "▶️", path: "/runs" },
    { id: "results", label: "Results", icon: "📋", path: "/results" },
    { id: "selectors-lab", label: "Selectors", icon: "🎯", path: "/selectors-lab" },
    { id: "templates", label: "Templates", icon: "📝", path: "/templates" },
    { id: "transcript-analysis", label: "Transcript", icon: "🎙️", path: "/transcript-analysis" },
    { id: "extension-capture", label: "Extension", icon: "🔌", path: "/extension-capture" },
    { id: "settings", label: "Settings", icon: "⚙️", path: "/settings" }
  ]

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
        fixed md:relative top-0 left-0 z-50 h-full w-64 bg-gray-50 border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto md:block
      `}>
        <nav className="p-4">
          <ul className="space-y-2">
            {sections.map((section) => {
              const isActive = location.pathname === section.path
              return (
                <li key={section.id}>
                  <Link
                    to={section.path}
                    onClick={onClose}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-lg">{section.icon}</span>
                    <span className="font-medium">{section.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}

export default Sidebar