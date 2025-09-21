import React, { useState, useEffect, useCallback } from 'react'
import { Users, User, Lock, Unlock, MessageCircle } from 'lucide-react'

interface User {
  user_id: string
  user_info: {
    user_name: string
    avatar: string
  }
  connected_at: string
  last_activity: string
}

interface CollaborationPanelProps {
  workflowId: string
  currentUserId: string
  onUserActivity?: (userId: string, activity: string) => void
  onNodeLock?: (nodeId: string, userId: string, locked: boolean) => void
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  workflowId,
  currentUserId,
  onUserActivity,
  onNodeLock,
}) => {
  const [users, setUsers] = useState<User[]>([])
  const [lockedNodes, setLockedNodes] = useState<Record<string, string>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)
  const [messages, setMessages] = useState<string[]>([])

  // Connect to WebSocket
  useEffect(() => {
    if (!workflowId) return

    const ws = new WebSocket(
      `ws://localhost:8000/ws/workflow/${workflowId}?user_id=${currentUserId}&user_name=${encodeURIComponent('Current User')}`
    )

    ws.onopen = () => {
      setIsConnected(true)
      console.log('Connected to collaboration WebSocket')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleWebSocketMessage(data)
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log('Disconnected from collaboration WebSocket')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    setWsConnection(ws)

    return () => {
      ws.close()
    }
  }, [workflowId, currentUserId])

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'user_joined':
        setUsers(prev => [...prev, message.user])
        setMessages(prev => [...prev, `${message.user_info.user_name} joined the collaboration`])
        onUserActivity?.(message.user_id, 'joined')
        break

      case 'user_left':
        setUsers(prev => prev.filter(u => u.user_id !== message.user_id))
        setMessages(prev => [...prev, `User left the collaboration`])
        onUserActivity?.(message.user_id, 'left')
        break

      case 'node_locked':
        setLockedNodes(prev => ({
          ...prev,
          [message.node_id]: message.user_id
        }))
        onNodeLock?.(message.node_id, message.user_id, true)
        break

      case 'node_unlocked':
        setLockedNodes(prev => {
          const updated = { ...prev }
          delete updated[message.node_id]
          return updated
        })
        onNodeLock?.(message.node_id, message.user_id, false)
        break

      case 'workflow_updated':
        setMessages(prev => [...prev, `Workflow updated by ${message.user_id}`])
        break

      case 'cursor_update':
        // Handle cursor position updates for real-time cursor tracking
        onUserActivity?.(message.user_id, 'cursor_move')
        break

      case 'pong':
        // Heartbeat response
        break

      default:
        console.log('Unknown message type:', message.type)
    }
  }, [onUserActivity, onNodeLock])

  // Send heartbeat ping
  useEffect(() => {
    if (!wsConnection || !isConnected) return

    const heartbeat = setInterval(() => {
      if (wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Send ping every 30 seconds

    return () => clearInterval(heartbeat)
  }, [wsConnection, isConnected])

  // Request node lock
  const requestNodeLock = useCallback((nodeId: string) => {
    if (wsConnection && isConnected) {
      wsConnection.send(JSON.stringify({
        type: 'node_lock',
        node_id: nodeId,
        lock: true
      }))
    }
  }, [wsConnection, isConnected])

  // Release node lock
  const releaseNodeLock = useCallback((nodeId: string) => {
    if (wsConnection && isConnected) {
      wsConnection.send(JSON.stringify({
        type: 'node_lock',
        node_id: nodeId,
        lock: false
      }))
    }
  }, [wsConnection, isConnected])

  // Update cursor position
  const updateCursorPosition = useCallback((position: { x: number; y: number }) => {
    if (wsConnection && isConnected) {
      wsConnection.send(JSON.stringify({
        type: 'cursor_position',
        position
      }))
    }
  }, [wsConnection, isConnected])

  const getUserStatus = (lastActivity: string) => {
    const lastActivityTime = new Date(lastActivity).getTime()
    const now = Date.now()
    const diffMinutes = (now - lastActivityTime) / (1000 * 60)

    if (diffMinutes < 1) return 'online'
    if (diffMinutes < 5) return 'away'
    return 'offline'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Collaboration</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="text-sm text-gray-500">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-4 p-2 bg-gray-50 rounded">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-2 mb-4">
        <h4 className="font-medium text-gray-700 text-sm">Active Users</h4>
        {users.map((user) => (
          <div key={user.user_id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
            <div className="relative">
              <img
                src={user.user_info.avatar}
                alt={user.user_info.user_name}
                className="w-6 h-6 rounded-full"
              />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(getUserStatus(user.last_activity))}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user.user_info.user_name}
                {user.user_id === currentUserId && ' (You)'}
              </div>
              <div className="text-xs text-gray-500">
                {getUserStatus(user.last_activity)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Locked Nodes */}
      {Object.keys(lockedNodes).length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="font-medium text-gray-700 text-sm">Locked Nodes</h4>
          {Object.entries(lockedNodes).map(([nodeId, userId]) => {
            const user = users.find(u => u.user_id === userId)
            return (
              <div key={nodeId} className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <Lock className="w-4 h-4 text-yellow-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Node {nodeId}
                  </div>
                  <div className="text-xs text-gray-600">
                    Locked by {user?.user_info.user_name || userId}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Activity Log */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-700 text-sm">Recent Activity</h4>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {messages.slice(-10).map((message, index) => (
            <div key={index} className="text-xs text-gray-600 p-1 bg-gray-50 rounded">
              {message}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => {
              if (wsConnection && isConnected) {
                wsConnection.send(JSON.stringify({
                  type: 'workflow_update',
                  data: { test: 'update' }
                }))
              }
            }}
            className="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Send Test Update
          </button>
        </div>
      </div>
    </div>
  )
}

export default CollaborationPanel