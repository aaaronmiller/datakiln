import * as React from "react"

interface AlertProps {
  children: React.ReactNode
  className?: string
}

interface AlertDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const Alert: React.FC<AlertProps> = ({ children, className = "" }) => {
  return (
    <div className={`p-4 border border-yellow-200 bg-yellow-50 rounded-md ${className}`}>
      {children}
    </div>
  )
}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ children, className = "" }) => {
  return (
    <div className={`text-sm text-yellow-800 ${className}`}>
      {children}
    </div>
  )
}