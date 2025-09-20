import * as React from "react"

interface SidebarProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  activeSection = "dashboard",
  onSectionChange
}) => {
  const sections = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "workflows", label: "Workflows", icon: "⚡" },
    { id: "results", label: "Results", icon: "📋" },
    { id: "settings", label: "Settings", icon: "⚙️" }
  ]

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 h-full">
      <nav className="p-4">
        <ul className="space-y-2">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                onClick={() => onSectionChange?.(section.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                  activeSection === section.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">{section.icon}</span>
                <span className="font-medium">{section.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar