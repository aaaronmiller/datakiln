import * as React from "react"
import { Button } from "../ui/button"

interface HeaderProps {
  title?: string
  onNewWorkflow?: () => void
  onSettings?: () => void
}

const Header: React.FC<HeaderProps> = ({
  title = "AI Research Automation Platform",
  onNewWorkflow,
  onSettings
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onNewWorkflow}
          >
            New Workflow
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettings}
          >
            Settings
          </Button>
        </div>
      </div>
    </header>
  )
}

export default Header