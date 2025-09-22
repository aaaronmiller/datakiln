import * as React from "react"
import { Notification, NotificationType } from "../../stores/uiStore"

interface ToastProps {
  notification: Notification
  onClose: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const getToastStyles = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
      default:
        return 'ℹ'
    }
  }

  return (
    <div className={`flex items-start p-4 border rounded-lg shadow-lg max-w-sm ${getToastStyles(notification.type)}`}>
      <div className="flex-shrink-0 text-lg mr-3">
        {getIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        {notification.title && (
          <h4 className="text-sm font-medium mb-1">{notification.title}</h4>
        )}
        {notification.message && (
          <p className="text-sm opacity-90">{notification.message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 ml-3 text-sm opacity-60 hover:opacity-100"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  notifications: Notification[]
  onClose: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onClose }) => {
  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={onClose}
        />
      ))}
    </div>
  )
}

export default Toast