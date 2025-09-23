import * as React from "react"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

interface DialogHeaderProps {
  children: React.ReactNode
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50">
        {children}
      </div>
    </div>
  )
}

export const DialogContent: React.FC<DialogContentProps> = ({ children, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children }) => {
  return (
    <div className="flex items-center justify-between p-6 border-b">
      {children}
    </div>
  )
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className = "" }) => {
  return (
    <h2 className={`text-lg font-semibold ${className}`}>
      {children}
    </h2>
  )
}

export const DialogDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <p className="text-sm text-gray-600 mt-1">
      {children}
    </p>
  )
}

export const DialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex items-center justify-end space-x-2 p-6 border-t">
      {children}
    </div>
  )
}