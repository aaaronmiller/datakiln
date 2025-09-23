"""
Test Extension Integration

Tests for Chrome extension data flow into workflow dataSource nodes.
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from backend.app.services.extension_service import ExtensionService, ExtensionDataStore
from backend.nodes.provider_node import ProviderNode


class TestExtensionIntegration:
    """Test cases for extension data integration with workflows"""

    def setup_method(self):
        """Set up test fixtures"""
        self.extension_service = ExtensionService()
        self.data_store = ExtensionDataStore()

    def test_extension_data_store_save_and_retrieve(self):
        """Test saving and retrieving extension chat data"""
        chat_data = {
            "site": "chatgpt",
            "userId": "test_user_123",
            "timestamp": "2025-01-15T10:30:00Z",
            "model": "gpt-4",
            "messages": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"}
            ]
        }

        # Save chat capture
        capture_id = self.data_store.save_chat_capture(chat_data)

        assert capture_id.startswith("chat_test_user_123_")

        # Retrieve user data
        user_data = self.data_store.get_user_data("test_user_123")
        assert len(user_data) == 1
        assert capture_id in user_data

        capture = user_data[capture_id]
        assert capture["type"] == "chat_capture"
        assert capture["site"] == "chatgpt"
        assert len(capture["messages"]) == 2
        assert not capture["metadata"]["processed"]

    def test_get_recent_captures(self):
        """Test retrieving recent captures for a user"""
        # Save multiple captures
        for i in range(5):
            chat_data = {
                "site": "chatgpt",
                "userId": "test_user",
                "timestamp": f"2025-01-15T10:{30+i:02d}:00Z",
                "model": "gpt-4",
                "messages": [{"role": "user", "content": f"Message {i}"}]
            }
            self.data_store.save_chat_capture(chat_data)

        # Get recent captures
        recent = self.data_store.get_recent_captures("test_user", limit=3)
        assert len(recent) == 3

        # Should be sorted by timestamp (newest first)
        assert recent[0]["timestamp"] > recent[1]["timestamp"]

    def test_mark_data_processed(self):
        """Test marking captures as processed"""
        chat_data = {
            "site": "chatgpt",
            "userId": "test_user",
            "timestamp": "2025-01-15T10:30:00Z",
            "messages": [{"role": "user", "content": "Test"}]
        }

        capture_id = self.data_store.save_chat_capture(chat_data)

        # Initially not processed
        user_data = self.data_store.get_user_data("test_user")
        assert not user_data[capture_id]["metadata"]["processed"]

        # Mark as processed
        self.data_store.mark_as_processed(capture_id, "test_user")

        # Now should be processed
        user_data = self.data_store.get_user_data("test_user")
        assert user_data[capture_id]["metadata"]["processed"]
        assert "processed_at" in user_data[capture_id]["metadata"]

    def test_get_unprocessed_data(self):
        """Test retrieving only unprocessed captures"""
        # Save some captures
        capture_ids = []
        for i in range(3):
            chat_data = {
                "site": "chatgpt",
                "userId": "test_user",
                "timestamp": f"2025-01-15T10:{30+i}:00Z",
                "messages": [{"role": "user", "content": f"Message {i}"}]
            }
            capture_id = self.data_store.save_chat_capture(chat_data)
            capture_ids.append(capture_id)

        # Mark first one as processed
        self.data_store.mark_as_processed(capture_ids[0], "test_user")

        # Get unprocessed data
        unprocessed = self.data_store.get_unprocessed_data("test_user")
        assert len(unprocessed) == 2

        # Processed capture should not be in unprocessed list
        unprocessed_ids = [c["id"] for c in unprocessed]
        assert capture_ids[0] not in unprocessed_ids
        assert capture_ids[1] in unprocessed_ids
        assert capture_ids[2] in unprocessed_ids

    @pytest.mark.asyncio
    async def test_extension_service_workflow_data_source(self):
        """Test extension service providing data for workflow consumption"""
        # Save some test data
        chat_data = {
            "site": "chatgpt",
            "userId": "workflow_user",
            "timestamp": "2025-01-15T10:30:00Z",
            "model": "gpt-4",
            "messages": [
                {"role": "user", "content": "How does AI work?"},
                {"role": "assistant", "content": "AI works through complex algorithms..."}
            ]
        }
        self.data_store.save_chat_capture(chat_data)

        # Get workflow data source
        workflow_data = await self.extension_service.get_workflow_data_source("workflow_user", "chat_capture")

        assert workflow_data["data_type"] == "extension_chat_captures"
        assert workflow_data["user_id"] == "workflow_user"
        assert workflow_data["total_captures"] == 1
        assert len(workflow_data["captures"]) == 1

        capture = workflow_data["captures"][0]
        assert capture["site"] == "chatgpt"
        assert len(capture["messages"]) == 2

    @pytest.mark.asyncio
    async def test_provider_node_extension_data_source(self):
        """Test provider node executing extension data source"""
        # Create provider node configured for extension data
        node = ProviderNode(
            id="extension_provider",
            name="Extension Data Provider",
            provider_type="extension",
            inputs={
                "user_id": "test_user",
                "data_type": "chat_capture",
                "mark_processed": True
            }
        )

        # Save test data
        chat_data = {
            "site": "claude",
            "userId": "test_user",
            "timestamp": "2025-01-15T11:00:00Z",
            "messages": [{"role": "user", "content": "Test message"}]
        }
        self.data_store.save_chat_capture(chat_data)

        # Execute the node
        context = {}
        result = await node.execute(context)

        # Verify result
        assert result["data_source"] == "extension"
        assert result["user_id"] == "test_user"
        assert result["data_type"] == "chat_capture"
        assert "data" in result
        assert result["data"]["total_captures"] == 1

        # Verify data was marked as processed
        unprocessed = self.data_store.get_unprocessed_data("test_user")
        assert len(unprocessed) == 0  # Should be marked as processed

    def test_extension_service_stats(self):
        """Test getting user statistics"""
        # Save captures from different sites
        sites = ["chatgpt", "claude", "gemini", "chatgpt"]
        for i, site in enumerate(sites):
            chat_data = {
                "site": site,
                "userId": "stats_user",
                "timestamp": f"2025-01-15T10:{30+i}:00Z",
                "messages": [{"role": "user", "content": f"Message {i}"}]
            }
            self.data_store.save_chat_capture(chat_data)

        # Mark some as processed
        user_data = self.data_store.get_user_data("stats_user")
        capture_ids = list(user_data.keys())[:2]  # Mark first 2 as processed
        for capture_id in capture_ids:
            self.data_store.mark_as_processed(capture_id, "stats_user")

        # Get stats
        stats = self.extension_service.get_user_stats("stats_user")

        assert stats["user_id"] == "stats_user"
        assert stats["total_captures"] == 4
        assert stats["processed_captures"] == 2
        assert stats["unprocessed_captures"] == 2
        assert stats["site_breakdown"]["chatgpt"] == 2  # 2 chatgpt captures
        assert stats["site_breakdown"]["claude"] == 1
        assert stats["site_breakdown"]["gemini"] == 1

    def test_data_store_entry_limit(self):
        """Test that data store limits entries per user"""
        # Set low limit for testing
        original_limit = self.data_store.max_entries_per_user
        self.data_store.max_entries_per_user = 3

        try:
            # Save more than limit
            for i in range(5):
                chat_data = {
                    "site": "chatgpt",
                    "userId": "limit_user",
                    "timestamp": f"2025-01-15T10:{30+i}:00Z",
                    "messages": [{"role": "user", "content": f"Message {i}"}]
                }
                self.data_store.save_chat_capture(chat_data)

            # Should only keep the most recent 3
            user_data = self.data_store.get_user_data("limit_user")
            assert len(user_data) == 3

            # Should be the most recent ones
            timestamps = [capture["timestamp"] for capture in user_data.values()]
            assert timestamps == sorted(timestamps, reverse=True)  # Newest first

        finally:
            self.data_store.max_entries_per_user = original_limit

    @pytest.mark.asyncio
    async def test_extension_service_handle_chat_capture(self):
        """Test handling incoming chat capture from extension"""
        chat_data = {
            "site": "chatgpt",
            "userId": "api_user",
            "timestamp": "2025-01-15T12:00:00Z",
            "model": "gpt-4",
            "messages": [
                {"role": "user", "content": "API test"},
                {"role": "assistant", "content": "API response"}
            ]
        }

        result = await self.extension_service.handle_chat_capture(chat_data)

        assert result["success"] is True
        assert "capture_id" in result

        # Verify data was stored
        user_data = self.data_store.get_user_data("api_user")
        assert len(user_data) == 1

        stored_capture = list(user_data.values())[0]
        assert stored_capture["site"] == "chatgpt"
        assert len(stored_capture["messages"]) == 2