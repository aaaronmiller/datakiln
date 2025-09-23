"""
Test Node Versioning functionality

Tests for node version validation during workflow execution.
"""

import pytest
from unittest.mock import Mock, patch
from backend.app.services.workflow_service import WorkflowService
from backend.app.models.workflow import Workflow, Node


class TestNodeVersioning:
    """Test cases for node versioning validation"""

    def setup_method(self):
        """Set up test fixtures"""
        self.workflow_service = WorkflowService()

    def test_valid_node_versions(self):
        """Test that workflows with valid node versions pass validation"""
        # Create a workflow with valid node versions
        workflow = Workflow(
            id="test-workflow-valid",
            name="Test Workflow Valid Versions",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Test Provider",
                    version="1.0",
                    data={"provider_type": "gemini_deep_research"}
                ),
                Node(
                    id="node2",
                    type="transform",
                    name="Test Transform",
                    version="1.0",
                    data={"transform_type": "markdown"}
                )
            ],
            edges=[]
        )

        # Validate the workflow
        result = self.workflow_service._validate_workflow(workflow)

        # Should be valid
        assert result["valid"] is True
        assert len(result["errors"]) == 0

    def test_invalid_node_version(self):
        """Test that workflows with invalid node versions fail validation"""
        # Create a workflow with invalid node version
        workflow = Workflow(
            id="test-workflow-invalid",
            name="Test Workflow Invalid Version",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Test Provider",
                    version="2.0",  # Invalid version
                    data={"provider_type": "gemini_deep_research"}
                )
            ],
            edges=[]
        )

        # Validate the workflow
        result = self.workflow_service._validate_workflow(workflow)

        # Should be invalid
        assert result["valid"] is False
        assert len(result["errors"]) > 0

        # Check that the error mentions version mismatch
        error_messages = " ".join(result["errors"])
        assert "version '2.0'" in error_messages
        assert "Unsupported version" in error_messages

    def test_missing_node_version_defaults_to_valid(self):
        """Test that nodes without explicit version default to valid version"""
        # Create a workflow with node missing version (should default to "1.0")
        workflow = Workflow(
            id="test-workflow-no-version",
            name="Test Workflow No Version",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Test Provider",
                    # No version specified - should default to "1.0"
                    data={"provider_type": "gemini_deep_research"}
                )
            ],
            edges=[]
        )

        # Validate the workflow
        result = self.workflow_service._validate_workflow(workflow)

        # Should be valid (defaults to "1.0")
        assert result["valid"] is True
        assert len(result["errors"]) == 0

    def test_multiple_invalid_versions_listed(self):
        """Test that multiple invalid versions are all reported"""
        # Create a workflow with multiple invalid versions
        workflow = Workflow(
            id="test-workflow-multiple-invalid",
            name="Test Workflow Multiple Invalid",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Test Provider 1",
                    version="2.0",
                    data={"provider_type": "gemini_deep_research"}
                ),
                Node(
                    id="node2",
                    type="transform",
                    name="Test Transform",
                    version="3.0",
                    data={"transform_type": "markdown"}
                ),
                Node(
                    id="node3",
                    type="provider",
                    name="Test Provider 2",
                    version="1.0",  # Valid
                    data={"provider_type": "gemini_deep_research"}
                )
            ],
            edges=[]
        )

        # Validate the workflow
        result = self.workflow_service._validate_workflow(workflow)

        # Should be invalid
        assert result["valid"] is False
        assert len(result["errors"]) >= 2  # At least 2 errors for invalid versions

        # Check that both invalid versions are mentioned
        error_messages = " ".join(result["errors"])
        assert "version '2.0'" in error_messages or "version '3.0'" in error_messages

    @pytest.mark.asyncio
    async def test_version_validation_blocks_execution(self):
        """Test that invalid versions prevent workflow execution"""
        # Create a workflow with invalid version
        workflow = Workflow(
            id="test-workflow-execution-blocked",
            name="Test Workflow Execution Blocked",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Test Provider",
                    version="9.9",  # Definitely invalid
                    data={"provider_type": "gemini_deep_research"}
                )
            ],
            edges=[]
        )

        # Attempt to execute - should fail validation
        with pytest.raises(ValueError) as exc_info:
            await self.workflow_service.execute_workflow(workflow)

        # Check that the error mentions version validation
        assert "validation failed" in str(exc_info.value).lower()

    def test_supported_versions_method(self):
        """Test the _get_supported_versions_for_node_type method"""
        # Test with a known node type
        versions = self.workflow_service._get_supported_versions_for_node_type("provider")
        assert isinstance(versions, list)
        assert "1.0" in versions

        # Test with unknown node type (should still return default versions)
        versions = self.workflow_service._get_supported_versions_for_node_type("unknown_type")
        assert isinstance(versions, list)
        assert "1.0" in versions