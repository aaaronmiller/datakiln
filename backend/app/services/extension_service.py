"""
Extension Service

Handles data flow from Chrome extension to workflow dataSource nodes.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path
import os


class ExtensionDataStore:
    """In-memory store for extension-captured data"""

    def __init__(self):
        self.data_store: Dict[str, Dict[str, Any]] = {}
        self.max_entries_per_user = 100
        self.data_file = Path("extension_data.json")

    def save_chat_capture(self, data: Dict[str, Any]) -> str:
        """Save chat capture data from extension"""
        user_id = data.get("userId", "anonymous")
        capture_id = f"chat_{user_id}_{int(datetime.now().timestamp())}"

        # Ensure user directory exists
        if user_id not in self.data_store:
            self.data_store[user_id] = {}

        # Limit entries per user
        user_data = self.data_store[user_id]
        if len(user_data) >= self.max_entries_per_user:
            # Remove oldest entry
            oldest_key = min(user_data.keys(), key=lambda k: user_data[k].get("timestamp", ""))
            del user_data[oldest_key]

        # Store the data
        user_data[capture_id] = {
            "id": capture_id,
            "type": "chat_capture",
            "timestamp": data.get("timestamp", datetime.now().isoformat()),
            "site": data.get("site", "unknown"),
            "model": data.get("model", "unknown"),
            "messages": data.get("messages", []),
            "metadata": {
                "user_id": user_id,
                "source": "chrome_extension",
                "processed": False
            }
        }

        # Persist to disk
        self._persist_data()

        return capture_id

    def get_user_data(self, user_id: str) -> Dict[str, Any]:
        """Get all data for a specific user"""
        return self.data_store.get(user_id, {})

    def get_recent_captures(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent captures for a user"""
        user_data = self.get_user_data(user_id)
        captures = list(user_data.values())

        # Sort by timestamp (newest first)
        captures.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        return captures[:limit]

    def mark_as_processed(self, capture_id: str, user_id: str):
        """Mark a capture as processed by workflow"""
        if user_id in self.data_store and capture_id in self.data_store[user_id]:
            self.data_store[user_id][capture_id]["metadata"]["processed"] = True
            self.data_store[user_id][capture_id]["metadata"]["processed_at"] = datetime.now().isoformat()
            self._persist_data()

    def get_unprocessed_data(self, user_id: str) -> List[Dict[str, Any]]:
        """Get unprocessed captures for workflow consumption"""
        user_data = self.get_user_data(user_id)
        return [
            capture for capture in user_data.values()
            if not capture.get("metadata", {}).get("processed", False)
        ]

    def _persist_data(self):
        """Persist data to disk"""
        try:
            with open(self.data_file, 'w') as f:
                json.dump(self.data_store, f, indent=2)
        except Exception as e:
            print(f"Failed to persist extension data: {e}")

    def _load_data(self):
        """Load data from disk"""
        try:
            if self.data_file.exists():
                with open(self.data_file, 'r') as f:
                    self.data_store = json.load(f)
        except Exception as e:
            print(f"Failed to load extension data: {e}")


class ExtensionService:
    """Service for managing Chrome extension data flow"""

    def __init__(self):
        self.data_store = ExtensionDataStore()
        self.data_store._load_data()  # Load persisted data

    async def handle_chat_capture(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming chat capture from Chrome extension"""
        try:
            capture_id = self.data_store.save_chat_capture(data)

            return {
                "success": True,
                "capture_id": capture_id,
                "message": "Chat capture saved successfully"
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to save chat capture: {str(e)}"
            }

    async def get_workflow_data_source(self, user_id: str, data_type: str = "chat_capture") -> Dict[str, Any]:
        """Get data formatted for workflow dataSource node consumption"""
        try:
            if data_type == "chat_capture":
                captures = self.data_store.get_unprocessed_data(user_id)

                # Format for workflow consumption
                formatted_data = {
                    "data_type": "extension_chat_captures",
                    "user_id": user_id,
                    "total_captures": len(captures),
                    "captures": captures,
                    "timestamp": datetime.now().isoformat()
                }

                return formatted_data

            else:
                return {
                    "data_type": data_type,
                    "user_id": user_id,
                    "error": f"Unsupported data type: {data_type}"
                }

        except Exception as e:
            return {
                "data_type": data_type,
                "user_id": user_id,
                "error": f"Failed to get workflow data: {str(e)}"
            }

    async def mark_data_processed(self, user_id: str, capture_ids: List[str]):
        """Mark specific captures as processed by workflow"""
        for capture_id in capture_ids:
            self.data_store.mark_as_processed(capture_id, user_id)

    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics for a user's extension data"""
        user_data = self.data_store.get_user_data(user_id)

        total_captures = len(user_data)
        processed_captures = sum(
            1 for capture in user_data.values()
            if capture.get("metadata", {}).get("processed", False)
        )
        unprocessed_captures = total_captures - processed_captures

        # Get site breakdown
        site_counts = {}
        for capture in user_data.values():
            site = capture.get("site", "unknown")
            site_counts[site] = site_counts.get(site, 0) + 1

        return {
            "user_id": user_id,
            "total_captures": total_captures,
            "processed_captures": processed_captures,
            "unprocessed_captures": unprocessed_captures,
            "site_breakdown": site_counts
        }


# Global service instance
extension_service = ExtensionService()