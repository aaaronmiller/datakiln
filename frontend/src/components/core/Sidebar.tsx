import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Network,
  PlayCircle,
  FileText,
  Target,
  FileJson, // used for Templates 
  Zap,
  Settings
} from "lucide-react"

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation()

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/dashboard" },
    { id: "workflows", label: "Workflows", Icon: Network, path: "/workflows" },
    { id: "runs", label: "Runs", Icon: PlayCircle, path: "/runs" },
    { id: "results", label: "Results", Icon: FileText, path: "/results" },
    { id: "selectors-lab", label: "Selectors Lab", Icon: Target, path: "/selectors-lab" },
    { id: "templates", label: "Templates", Icon: FileJson, path: "/templates" },
    { id: "extension-capture", label: "Extension Capture", Icon: Zap, path: "/extension-capture" },
    { id: "settings", label: "Settings", Icon: Settings, path: "/settings" }
  ]

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed md:relative top-0 left-0 z-50 h-full w-64 bg-surface border-r border-border
        transform transition-transform duration-300 ease-in-out font-sans
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto md:block
      `}>
        <div className="flex flex-col h-full glass">
          {/* Logo/Brand */}
          <div className="flex items-center px-6 py-6 border-b border-border/50">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-accent shadow-glow">
              <span className="text-white font-bold text-sm tracking-tighter">DK</span>
            </div>
            <span className="ml-3 text-xl font-bold text-foreground tracking-tight">DataKiln</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 overflow-y-auto">
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <li key={item.id} className="relative">
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`relative z-10 group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-primary/10 rounded-lg"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}

                      <item.Icon
                        className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        strokeWidth={1.5}
                      />
                      <span className="relative z-10">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/50">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-xs text-muted-foreground font-medium">System Online</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar