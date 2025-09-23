"""
Test Collaboration Conflicts

Tests for collaborative workflow editing conflict detection and resolution.
"""

import pytest
import tempfile
from pathlib import Path
from backend.app.services.workflow_persistence_service import WorkflowPersistenceService
from backend.app.models.workflow import Workflow, Node, Edge, WorkflowMetadata


class TestCollaborationConflicts:
    """Test cases for collaborative editing conflict detection"""

    def setup_method(self):
        """Set up test fixtures"""
        # Create temporary directory for testing
        self.temp_dir = Path(tempfile.mkdtemp())
        self.persistence_service = WorkflowPersistenceService(str(self.temp_dir))

    def teardown_method(self):
        """Clean up test fixtures"""
        # Remove temporary directory
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_no_conflict_when_versions_match(self):
        """Test that no conflict is detected when user version matches current version"""
        # Create and save initial workflow
        workflow = Workflow(
            id="test-collaboration-workflow",
            name="Test Collaboration Workflow",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Provider",
                    version="1.0",
                    position={"x": 100, "y": 100},
                    data={"provider_type": "gemini_deep_research"}
                )
            ],
            edges=[]
        )

        # Save workflow
        saved_id = self.persistence_service.save_workflow(workflow, user_id="user1")

        # Check for conflicts with correct version
        conflict_result = self.persistence_service.detect_conflicts(saved_id, user_version=1, user_id="user2")

        assert conflict_result["has_conflict"] is False
        assert conflict_result["current_version"] == 1
        assert conflict_result["user_version"] == 1
        assert conflict_result["conflict_details"] is None

    def test_conflict_detected_when_versions_mismatch(self):
        """Test that conflict is detected when user version is outdated"""
        # Create and save initial workflow
        workflow = Workflow(
            id="test-conflict-workflow",
            name="Test Conflict Workflow",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Provider",
                    version="1.0",
                    position={"x": 100, "y": 100},
                    data={"provider_type": "gemini_deep_research"}
                )
            ],
            edges=[]
        )

        # Save initial version
        saved_id = self.persistence_service.save_workflow(workflow, user_id="user1")

        # User1 makes another change
        workflow.name = "Updated by User1"
        self.persistence_service.save_workflow(workflow, user_id="user1")

        # User2 tries to save with old version (1) but current is now 2
        conflict_result = self.persistence_service.detect_conflicts(saved_id, user_version=1, user_id="user2")

        assert conflict_result["has_conflict"] is True
        assert conflict_result["current_version"] == 2
        assert conflict_result["user_version"] == 1
        assert conflict_result["conflict_details"] is not None

        # Check conflict details
        details = conflict_result["conflict_details"]
        assert "conflicting_changes" in details
        assert len(details["conflicting_changes"]) > 0
        assert details["recommendation"] == "Please reload the workflow and reapply your changes"

    def test_save_fails_with_version_conflict(self):
        """Test that save operation fails when version conflict is detected"""
        # Create and save initial workflow
        workflow = Workflow(
            id="test-save-conflict-workflow",
            name="Test Save Conflict Workflow",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Provider",
                    version="1.0",
                    position={"x": 100, "y": 100},
                    data={"provider_type": "gemini_deep_research"}
                )
            ],
            edges=[]
        )

        # Save initial version
        saved_id = self.persistence_service.save_workflow(workflow, user_id="user1")

        # User1 makes a change
        workflow.name = "Updated by User1"
        self.persistence_service.save_workflow(workflow, user_id="user1")

        # User2 tries to save with outdated expected version
        workflow.name = "Updated by User2"
        with pytest.raises(ValueError) as exc_info:
            self.persistence_service.save_workflow(workflow, user_id="user2", expected_version=1)

        assert "Version conflict detected" in str(exc_info.value)
        assert "Current version is 2" in str(exc_info.value)
        assert "expected 1" in str(exc_info.value)

    def test_successful_save_with_correct_version(self):
        """Test that save succeeds when correct version is provided"""
        # Create and save initial workflow
        workflow = Workflow(
            id="test-successful-save-workflow",
            name="Test Successful Save Workflow",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Provider",
                    version="1.0",
                    position={"x": 100, "y": 100},
                    data={"provider_type": "gemini_deep_research"}
                )
            ],
            edges=[]
        )

        # Save initial version
        saved_id = self.persistence_service.save_workflow(workflow, user_id="user1")

        # User2 loads and gets current version
        loaded = self.persistence_service.load_workflow(saved_id)
        current_version = loaded.metadata.version if loaded.metadata else 1

        # User2 makes changes and saves with correct version
        workflow.name = "Updated by User2"
        saved_id2 = self.persistence_service.save_workflow(workflow, user_id="user2", expected_version=current_version)

        assert saved_id2 == saved_id

        # Verify the change was saved
        reloaded = self.persistence_service.load_workflow(saved_id)
        assert reloaded.name == "Updated by User2"
        assert reloaded.metadata.version == current_version + 1 if reloaded.metadata else 2

    def test_conflict_details_show_version_history(self):
        """Test that conflict details include information about conflicting changes"""
        # Create and save initial workflow
        workflow = Workflow(
            id="test-history-workflow",
            name="Test History Workflow",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Provider",
                    version="1.0",
                    position={"x": 100, "y": 100},
                    data={"provider_type": "gemini_deep_research"}
                )
            ],
            edges=[]
        )

        # Save multiple versions
        saved_id = self.persistence_service.save_workflow(workflow, user_id="user1")

        workflow.name = "Version 2"
        self.persistence_service.save_workflow(workflow, user_id="user1")

        workflow.name = "Version 3"
        self.persistence_service.save_workflow(workflow, user_id="user1")

        # Check conflicts from version 1 perspective
        conflict_result = self.persistence_service.detect_conflicts(saved_id, user_version=1, user_id="user2")

        assert conflict_result["has_conflict"] is True
        details = conflict_result["conflict_details"]
        conflicting_changes = details["conflicting_changes"]

        # Should have information about versions 2 and 3
        assert len(conflicting_changes) >= 2

        # Check that changes include version numbers and authors
        for change in conflicting_changes:
            assert "version" in change
            assert "updatedAt" in change
            assert "author" in change
            assert "changes" in change

    def test_no_conflict_for_new_workflow(self):
        """Test that no conflict is detected for workflows that don't exist yet"""
        conflict_result = self.persistence_service.detect_conflicts(
            "non-existent-workflow", user_version=1, user_id="user1"
        )

        assert conflict_result["has_conflict"] is False
        assert conflict_result["current_version"] is None
        assert conflict_result["user_version"] == 1

    def test_error_handling_in_conflict_detection(self):
        """Test that conflict detection handles errors gracefully"""
        # Mock the load_workflow method to raise an exception
        original_load = self.persistence_service.load_workflow
        self.persistence_service.load_workflow = lambda x: (_ for _ in ()).throw(Exception("Database error"))

        try:
            conflict_result = self.persistence_service.detect_conflicts(
                "test-workflow", user_version=1, user_id="user1"
            )

            assert conflict_result["has_conflict"] is True
            assert "error" in conflict_result
            assert conflict_result["conflict_details"]["error"] == "Unable to check for conflicts"

        finally:
            # Restore original method
            self.persistence_service.load_workflow = original_load