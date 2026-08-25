"""
Test Workflow Persistence

Tests for workflow state persistence across sessions.
"""

import pytest
import json
import tempfile
from pathlib import Path
from backend.app.services.workflow_persistence_service import WorkflowPersistenceService
from backend.app.models.workflow import Workflow, Node, Edge, WorkflowMetadata


class TestWorkflowPersistence:
    """Test cases for workflow persistence"""

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

    def test_save_and_load_workflow_preserves_all_data(self):
        """Test that save/load preserves all node params, edges, and UI state"""
        # Create a complex workflow with all possible data
        workflow = Workflow(
            id="test-persistence-workflow",
            name="Test Persistence Workflow",
            description="A workflow for testing persistence",
            metadata=WorkflowMetadata(
                version=1,
                author="test-user",
                category="testing",
                tags=["test", "persistence"],
                isPublic=False
            ),
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Test Provider",
                    version="1.0",
                    position={"x": 100, "y": 200},
                    data={
                        "provider_type": "gemini_deep_research",
                        "mode": "research",
                        "max_tokens": 2000,
                        "temperature": 0.7
                    }
                ),
                Node(
                    id="node2",
                    type="transform",
                    name="Test Transform",
                    version="1.0",
                    position={"x": 350, "y": 200},
                    data={
                        "transform_type": "markdown",
                        "input_key": "raw_data",
                        "output_key": "formatted_data"
                    }
                ),
                Node(
                    id="node3",
                    type="export",
                    name="Test Export",
                    version="1.0",
                    position={"x": 600, "y": 200},
                    data={
                        "format": "json",
                        "path_key": "output.json",
                        "include_metadata": True
                    }
                )
            ],
            edges=[
                Edge(
                    id="edge1",
                    from_="node1",
                    to="node2"
                ),
                Edge(
                    id="edge2",
                    from_="node2",
                    to="node3"
                )
            ]
        )

        # Save the workflow
        saved_id = self.persistence_service.save_workflow(workflow)
        assert saved_id == "test-persistence-workflow"

        # Load the workflow
        loaded_workflow = self.persistence_service.load_workflow(saved_id)
        assert loaded_workflow is not None

        # Verify all data is preserved
        assert loaded_workflow.id == workflow.id
        assert loaded_workflow.name == workflow.name
        assert loaded_workflow.description == workflow.description

        # Verify metadata
        assert loaded_workflow.metadata is not None
        assert loaded_workflow.metadata.version == workflow.metadata.version
        assert loaded_workflow.metadata.author == workflow.metadata.author
        assert loaded_workflow.metadata.category == workflow.metadata.category
        assert loaded_workflow.metadata.tags == workflow.metadata.tags
        assert loaded_workflow.metadata.isPublic == workflow.metadata.isPublic

        # Verify nodes
        assert len(loaded_workflow.nodes) == len(workflow.nodes)
        for original_node in workflow.nodes:
            loaded_node = next((n for n in loaded_workflow.nodes if n.id == original_node.id), None)
            assert loaded_node is not None

            # Check all node properties
            assert loaded_node.id == original_node.id
            assert loaded_node.type == original_node.type
            assert loaded_node.name == original_node.name
            assert loaded_node.version == original_node.version
            assert loaded_node.position == original_node.position
            assert loaded_node.data == original_node.data

        # Verify edges
        assert len(loaded_workflow.edges) == len(workflow.edges)
        for original_edge in workflow.edges:
            loaded_edge = next((e for e in loaded_workflow.edges if e.id == original_edge.id), None)
            assert loaded_edge is not None

            assert loaded_edge.id == original_edge.id
            assert loaded_edge.from_ == original_edge.from_
            assert loaded_edge.to == original_edge.to

    def test_workflow_versions_are_preserved(self):
        """Test that workflow versions are properly saved and retrievable"""
        workflow = Workflow(
            id="test-version-workflow",
            name="Test Version Workflow",
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
        saved_id = self.persistence_service.save_workflow(workflow)
        versions = self.persistence_service.get_workflow_versions(saved_id)
        assert len(versions) == 1
        assert versions[0]["version"] == 1

        # Update and save new version
        workflow.metadata.version = 2
        workflow.name = "Updated Test Version Workflow"
        self.persistence_service.save_workflow(workflow)

        versions = self.persistence_service.get_workflow_versions(saved_id)
        assert len(versions) == 2

        # Sort by version descending
        versions.sort(key=lambda v: v["version"], reverse=True)
        assert versions[0]["version"] == 2
        assert versions[0]["name"] == "Updated Test Version Workflow"
        assert versions[1]["version"] == 1

    def test_export_import_round_trip(self):
        """Test that export/import preserves all workflow data"""
        # Create workflow
        workflow = Workflow(
            id="test-export-import",
            name="Test Export Import",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Provider",
                    version="1.0",
                    position={"x": 50, "y": 50},
                    data={"provider_type": "gemini_deep_research", "max_tokens": 1000}
                )
            ],
            edges=[]
        )

        # Save workflow
        saved_id = self.persistence_service.save_workflow(workflow)

        # Export to JSON
        exported_json = self.persistence_service.export_workflow(saved_id)
        assert exported_json is not None

        # Parse and re-import
        imported_id = self.persistence_service.import_workflow(exported_json)
        assert imported_id is not None
        assert imported_id != saved_id  # Should get new ID

        # Load imported workflow
        imported_workflow = self.persistence_service.load_workflow(imported_id)
        assert imported_workflow is not None

        # Verify data preservation (except ID which changes)
        assert imported_workflow.name == workflow.name
        assert imported_workflow.description == workflow.description
        assert len(imported_workflow.nodes) == len(workflow.nodes)
        assert len(imported_workflow.edges) == len(workflow.edges)

        # Check node data preservation
        imported_node = imported_workflow.nodes[0]
        original_node = workflow.nodes[0]
        assert imported_node.type == original_node.type
        assert imported_node.name == original_node.name
        assert imported_node.version == original_node.version
        assert imported_node.position == original_node.position
        assert imported_node.data == original_node.data

    def test_workflow_with_complex_ui_state(self):
        """Test preservation of complex UI state including positions and metadata"""
        workflow = Workflow(
            id="test-ui-state-workflow",
            name="Test UI State Workflow",
            description="Workflow with complex UI state",
            metadata=WorkflowMetadata(
                version=1,
                author="ui-test-user",
                category="ui-testing",
                tags=["ui", "state", "complex"],
                thumbnail="test-thumbnail.png"
            ),
            nodes=[
                Node(
                    id="complex-node-1",
                    type="transform",
                    name="Complex Transform Node",
                    version="1.0",
                    position={"x": 123.45, "y": 678.90},
                    data={
                        "transform_type": "markdown",
                        "input_key": "complex_input",
                        "output_key": "complex_output",
                        "merge_keys": ["key1", "key2"],
                        "filter_condition": "value > 100",
                        "json_path": "$.data.items[*]",
                        "regex_pattern": r"\d+",
                        "replacement": "NUMBER",
                        "markdown_format": "github",
                        "clean_operations": ["trim", "lowercase"]
                    }
                ),
                Node(
                    id="complex-node-2",
                    type="aggregate",
                    name="Complex Aggregate Node",
                    version="1.0",
                    position={"x": 456.78, "y": 123.45},
                    data={
                        "input_key": "aggregate_input",
                        "output_key": "aggregate_output",
                        "functions": ["sum", "avg", "count"],
                        "group_by": ["category", "type"],
                        "field_mappings": {"old_field": "new_field"}
                    }
                )
            ],
            edges=[
                Edge(
                    id="complex-edge-1",
                    from_="complex-node-1",
                    to="complex-node-2"
                )
            ]
        )

        # Save and reload
        saved_id = self.persistence_service.save_workflow(workflow)
        loaded_workflow = self.persistence_service.load_workflow(saved_id)

        assert loaded_workflow is not None

        # Verify complex node data preservation
        loaded_node1 = next(n for n in loaded_workflow.nodes if n.id == "complex-node-1")
        original_node1 = next(n for n in workflow.nodes if n.id == "complex-node-1")

        assert loaded_node1.position == original_node1.position
        assert loaded_node1.data == original_node1.data

        loaded_node2 = next(n for n in loaded_workflow.nodes if n.id == "complex-node-2")
        original_node2 = next(n for n in workflow.nodes if n.id == "complex-node-2")

        assert loaded_node2.position == original_node2.position
        assert loaded_node2.data == original_node2.data

        # Verify metadata preservation
        assert loaded_workflow.metadata.thumbnail == workflow.metadata.thumbnail
        assert loaded_workflow.metadata.tags == workflow.metadata.tags

    def test_persistence_service_validation(self):
        """Test that the persistence service validates workflows correctly"""
        # Valid workflow
        valid_workflow = Workflow(
            id="valid-workflow",
            name="Valid Workflow",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Provider",
                    version="1.0",
                    position={"x": 0, "y": 0},
                    data={}
                )
            ],
            edges=[]
        )

        errors = self.persistence_service.validate_workflow(valid_workflow)
        assert len(errors) == 0

        # Invalid workflow - missing name
        invalid_workflow = Workflow(
            id="invalid-workflow",
            name="",  # Empty name
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Provider",
                    version="1.0",
                    position={"x": 0, "y": 0},
                    data={}
                )
            ],
            edges=[]
        )

        errors = self.persistence_service.validate_workflow(invalid_workflow)
        assert len(errors) > 0
        assert any("name" in error.lower() for error in errors)