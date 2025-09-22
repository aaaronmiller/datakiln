import * as React from "react"
import { Link, useLocation } from "react-router-dom"

interface BreadcrumbItem {
  label: string
  path: string
}

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  workflows: "Workflows",
  runs: "Runs",
  results: "Results",
  "selectors-lab": "Selectors Lab",
  templates: "Templates",
  "transcript-analysis": "Transcript Analysis",
  "extension-capture": "Extension Capture",
  settings: "Settings",
}

const Breadcrumb: React.FC = () => {
  const location = useLocation()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", path: "/dashboard" }]

    let currentPath = ""
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      breadcrumbs.push({ label, path: currentPath })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-gray-600 mb-4">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        return (
          <div key={`${crumb.path}-${index}`} className="flex items-center">
            {index > 0 && (
              <span aria-hidden="true" className="text-gray-400 mx-2">
                /
              </span>
            )}
            {isLast ? (
              <span
                className="font-medium text-gray-900"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export { Breadcrumb }