import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
import uuid

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time collaboration"""

    def __init__(self):
        # Active connections: workflow_id -> Set[WebSocket, user_id]
        self.active_connections: Dict[str, Set[tuple]] = {}
        # User sessions: user_id -> {workflow_id, websocket, user_info}
        self.user_sessions: Dict[str, Dict[str, Any]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        workflow_id: str,
        user_id: str,
        user_info: Dict[str, Any]
    ):
        """Connect a user to a workflow collaboration session"""
        await websocket.accept()

        # Initialize workflow connections if not exists
        if workflow_id not in self.active_connections:
            self.active_connections[workflow_id] = set()

        # Store connection
        self.active_connections[workflow_id].add((websocket, user_id))

        # Store user session
        self.user_sessions[user_id] = {
            "workflow_id": workflow_id,
            "websocket": websocket,
            "user_info": user_info,
            "connected_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat()
        }

        # Notify other users in the workflow
        await self.broadcast_to_workflow(
            workflow_id,
            {
                "type": "user_joined",
                "user_id": user_id,
                "user_info": user_info,
                "timestamp": datetime.now().isoformat()
            },
            exclude_user=user_id
        )

        logger.info(f"User {user_id} joined workflow {workflow_id}")

    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Disconnect a user from collaboration"""
        user_session = self.user_sessions.get(user_id)
        if not user_session:
            return

        workflow_id = user_session["workflow_id"]

        # Remove connection
        if workflow_id in self.active_connections:
            self.active_connections[workflow_id].discard((websocket, user_id))

            # Clean up empty workflow connections
            if not self.active_connections[workflow_id]:
                del self.active_connections[workflow_id]

        # Remove user session
        del self.user_sessions[user_id]

        # Notify other users
        await self.broadcast_to_workflow(
            workflow_id,
            {
                "type": "user_left",
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            }
        )

        logger.info(f"User {user_id} left workflow {workflow_id}")

    async def broadcast_to_workflow(
        self,
        workflow_id: str,
        message: Dict[str, Any],
        exclude_user: Optional[str] = None
    ):
        """Broadcast message to all users in a workflow"""
        if workflow_id not in self.active_connections:
            return

        disconnected_connections = []

        for websocket, user_id in self.active_connections[workflow_id]:
            if exclude_user and user_id == exclude_user:
                continue

            try:
                await websocket.send_text(json.dumps(message))
                # Update user activity
                if user_id in self.user_sessions:
                    self.user_sessions[user_id]["last_activity"] = datetime.now().isoformat()
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {e}")
                disconnected_connections.append((websocket, user_id))

        # Clean up disconnected connections
        for websocket, user_id in disconnected_connections:
            await self.disconnect(websocket, user_id)

    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Send message to specific user"""
        user_session = self.user_sessions.get(user_id)
        if not user_session:
            return

        try:
            await user_session["websocket"].send_text(json.dumps(message))
            user_session["last_activity"] = datetime.now().isoformat()
        except Exception as e:
            logger.error(f"Failed to send message to user {user_id}: {e}")
            await self.disconnect(user_session["websocket"], user_id)

    async def update_user_activity(self, user_id: str):
        """Update user's last activity timestamp"""
        if user_id in self.user_sessions:
            self.user_sessions[user_id]["last_activity"] = datetime.now().isoformat()

    def get_workflow_users(self, workflow_id: str) -> List[Dict[str, Any]]:
        """Get list of users in a workflow"""
        if workflow_id not in self.active_connections:
            return []

        users = []
        for websocket, user_id in self.active_connections[workflow_id]:
            user_session = self.user_sessions.get(user_id)
            if user_session:
                users.append({
                    "user_id": user_id,
                    "user_info": user_session["user_info"],
                    "connected_at": user_session["connected_at"],
                    "last_activity": user_session["last_activity"]
                })

        return users

    def get_user_workflows(self, user_id: str) -> List[str]:
        """Get list of workflows a user is connected to"""
        user_session = self.user_sessions.get(user_id)
        if not user_session:
            return []

        return [user_session["workflow_id"]]


class CollaborationManager:
    """Manages collaborative workflow editing"""

    def __init__(self):
        self.connection_manager = ConnectionManager()
        # Workflow states: workflow_id -> current_state
        self.workflow_states: Dict[str, Dict[str, Any]] = {}
        # Workflow locks: workflow_id -> user_id (who has exclusive edit lock)
        self.workflow_locks: Dict[str, str] = {}

    async def handle_workflow_update(
        self,
        workflow_id: str,
        user_id: str,
        update_data: Dict[str, Any]
    ):
        """Handle workflow update from user"""
        # Update workflow state
        if workflow_id not in self.workflow_states:
            self.workflow_states[workflow_id] = {
                "nodes": {},
                "edges": [],
                "last_modified": datetime.now().isoformat(),
                "modified_by": user_id
            }

        # Apply update
        workflow_state = self.workflow_states[workflow_id]
        workflow_state.update(update_data)
        workflow_state["last_modified"] = datetime.now().isoformat()
        workflow_state["modified_by"] = user_id

        # Broadcast update to other users
        await self.connection_manager.broadcast_to_workflow(
            workflow_id,
            {
                "type": "workflow_updated",
                "user_id": user_id,
                "data": update_data,
                "timestamp": datetime.now().isoformat()
            },
            exclude_user=user_id
        )

    async def handle_node_lock(
        self,
        workflow_id: str,
        user_id: str,
        node_id: str,
        lock: bool
    ):
        """Handle node locking for exclusive editing"""
        if lock:
            # Check if node is already locked
            if workflow_id in self.workflow_locks and node_id in self.workflow_locks[workflow_id]:
                # Node is locked by someone else
                locked_by = self.workflow_locks[workflow_id][node_id]
                await self.connection_manager.send_to_user(
                    user_id,
                    {
                        "type": "node_lock_denied",
                        "node_id": node_id,
                        "locked_by": locked_by,
                        "timestamp": datetime.now().isoformat()
                    }
                )
                return False
            else:
                # Lock the node
                if workflow_id not in self.workflow_locks:
                    self.workflow_locks[workflow_id] = {}
                self.workflow_locks[workflow_id][node_id] = user_id

                await self.connection_manager.broadcast_to_workflow(
                    workflow_id,
                    {
                        "type": "node_locked",
                        "user_id": user_id,
                        "node_id": node_id,
                        "timestamp": datetime.now().isoformat()
                    },
                    exclude_user=user_id
                )
                return True
        else:
            # Unlock the node
            if (workflow_id in self.workflow_locks and
                node_id in self.workflow_locks[workflow_id] and
                self.workflow_locks[workflow_id][node_id] == user_id):

                del self.workflow_locks[workflow_id][node_id]

                await self.connection_manager.broadcast_to_workflow(
                    workflow_id,
                    {
                        "type": "node_unlocked",
                        "user_id": user_id,
                        "node_id": node_id,
                        "timestamp": datetime.now().isoformat()
                    }
                )
                return True
            return False

    async def handle_cursor_position(
        self,
        workflow_id: str,
        user_id: str,
        position: Dict[str, float]
    ):
        """Handle cursor position updates for collaborative editing"""
        await self.connection_manager.broadcast_to_workflow(
            workflow_id,
            {
                "type": "cursor_update",
                "user_id": user_id,
                "position": position,
                "timestamp": datetime.now().isoformat()
            },
            exclude_user=user_id
        )

    def get_workflow_state(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get current state of a workflow"""
        return self.workflow_states.get(workflow_id)

    def get_node_lock_status(self, workflow_id: str, node_id: str) -> Optional[str]:
        """Get lock status of a node"""
        if workflow_id in self.workflow_locks and node_id in self.workflow_locks[workflow_id]:
            return self.workflow_locks[workflow_id][node_id]
        return None


# Global collaboration manager instance
collaboration_manager = CollaborationManager()