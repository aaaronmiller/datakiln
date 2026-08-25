"""
Test Template Parameterization

Tests for automatic parameterization of workflows for template creation.
"""

import pytest
from frontend.src.services.workflowTemplateService import WorkflowTemplateService, TemplateParameter
from frontend.src.stores.workflowStore import WorkflowNode


class TestTemplateParameterization:
    """Test cases for template parameterization"""

    def setup_method(self):
        """Set up test fixtures"""
        self.template_service = WorkflowTemplateService()

    def test_identify_parameters_from_provider_node(self):
        """Test that provider node parameters are correctly identified"""
        nodes = [
            WorkflowNode(
                id="provider1",
                type="provider",
                name="Gemini Provider",
                position={"x": 100, "y": 100},
                data={
                    "label": "Gemini Provider",
                    "parameters": {
                        "query": "What is the weather today?",
                        "max_tokens": 1000,
                        "temperature": 0.7,
                        "model": "gemini-pro"  # This should not be parameterized
                    }
                }
            )
        ]

        parameters = self.template_service.identifyTemplateParameters(nodes)

        # Should identify 'query' as a parameter
        assert len(parameters) == 1
        param = parameters[0]
        assert param.name == "Gemini Provider query"
        assert param.type == "string"
        assert param.defaultValue == "What is the weather today?"
        assert param.nodeId == "provider1"
        assert param.paramKey == "query"

    def test_identify_parameters_from_multiple_nodes(self):
        """Test parameterization across multiple node types"""
        nodes = [
            WorkflowNode(
                id="provider1",
                type="provider",
                name="Data Source",
                position={"x": 100, "y": 100},
                data={
                    "label": "Data Source",
                    "parameters": {
                        "endpoint": "https://api.example.com/data",
                        "api_key": "user-provided-key",
                        "timeout": 30
                    }
                }
            ),
            WorkflowNode(
                id="transform1",
                type="transform",
                name="Data Transform",
                position={"x": 300, "y": 100},
                data={
                    "label": "Data Transform",
                    "parameters": {
                        "operation": "filter",
                        "field_name": "status",
                        "field_value": "active"
                    }
                }
            ),
            WorkflowNode(
                id="export1",
                type="export",
                name="Data Export",
                position={"x": 500, "y": 100},
                data={
                    "label": "Data Export",
                    "parameters": {
                        "filename": "output.csv",
                        "delimiter": ",",
                        "path": "/tmp/output"
                    }
                }
            )
        ]

        parameters = self.template_service.identifyTemplateParameters(nodes)

        # Should identify multiple parameters
        assert len(parameters) >= 3

        # Check specific parameters
        param_names = [p.name for p in parameters]
        assert "Data Source api_key" in param_names
        assert "Data Transform field_name" in param_names
        assert "Data Transform field_value" in param_names
        assert "Data Export filename" in param_names

    def test_should_not_parameterize_urls_and_paths(self):
        """Test that URLs and system paths are not parameterized"""
        nodes = [
            WorkflowNode(
                id="node1",
                type="provider",
                name="API Provider",
                position={"x": 100, "y": 100},
                data={
                    "label": "API Provider",
                    "parameters": {
                        "endpoint": "https://api.example.com/v1/data",  # Should not parameterize
                        "path": "/api/v1/data",  # Should not parameterize
                        "filename": "data.json",  # Should not parameterize (file extension)
                        "query": "user search term",  # Should parameterize
                        "title": "Report Title"  # Should parameterize
                    }
                }
            )
        ]

        parameters = self.template_service.identifyTemplateParameters(nodes)

        # Should only parameterize query and title
        assert len(parameters) == 2
        param_keys = [p.paramKey for p in parameters]
        assert "query" in param_keys
        assert "title" in param_keys
        assert "endpoint" not in param_keys
        assert "path" not in param_keys
        assert "filename" not in param_keys

    def test_should_not_parameterize_booleans_and_numbers(self):
        """Test that boolean and numeric values are not parameterized"""
        nodes = [
            WorkflowNode(
                id="node1",
                type="transform",
                name="Filter Transform",
                position={"x": 100, "y": 100},
                data={
                    "label": "Filter Transform",
                    "parameters": {
                        "enabled": True,  # Should not parameterize
                        "count": 42,      # Should not parameterize
                        "threshold": 0.8, # Should not parameterize
                        "name": "My Filter"  # Should parameterize
                    }
                }
            )
        ]

        parameters = self.template_service.identifyTemplateParameters(nodes)

        # Should only parameterize 'name'
        assert len(parameters) == 1
        assert parameters[0].paramKey == "name"
        assert parameters[0].defaultValue == "My Filter"

    def test_create_template_from_workflow(self):
        """Test creating a template from a complete workflow"""
        workflow = {
            "nodes": [
                WorkflowNode(
                    id="provider1",
                    type="provider",
                    name="Data Provider",
                    position={"x": 100, "y": 100},
                    data={
                        "label": "Data Provider",
                        "parameters": {
                            "query": "Search for data",
                            "limit": 100
                        }
                    }
                ),
                WorkflowNode(
                    id="transform1",
                    type="transform",
                    name="Data Transform",
                    position={"x": 300, "y": 100},
                    data={
                        "label": "Data Transform",
                        "parameters": {
                            "operation": "filter",
                            "field": "status"
                        }
                    }
                )
            ],
            "edges": [
                {
                    "id": "edge1",
                    "source": "provider1",
                    "target": "transform1"
                }
            ]
        }

        template = self.template_service.createTemplateFromWorkflow(
            workflow,
            "Test Template",
            "A template for testing",
            "Testing"
        )

        assert template.name == "Test Template"
        assert template.description == "A template for testing"
        assert template.category == "Testing"
        assert len(template.nodes) == 2
        assert len(template.edges) == 1
        assert template.parameters is not None
        assert len(template.parameters) > 0

    def test_instantiate_template_with_parameters(self):
        """Test instantiating a template with parameter values"""
        # Create a template with parameters
        template = {
            id: "test-template",
            name: "Test Template",
            description: "Template for testing",
            category: "Testing",
            nodes: [
                {
                    id: "node1",
                    type: "provider",
                    position: {"x": 100, "y": 100},
                    data: {
                        label: "Provider",
                        parameters: {
                            "query": "default query",
                            "limit": 10
                        }
                    }
                }
            ],
            edges: [],
            parameters: [
                {
                    id: "node1_query",
                    name: "Provider query",
                    type: "string",
                    defaultValue: "default query",
                    description: "Query parameter",
                    nodeId: "node1",
                    paramKey: "query"
                }
            ]
        }

        # Instantiate with custom parameter values
        parameter_values = {
            "node1_query": "custom search query"
        }

        result = self.template_service.instantiateTemplate(template, parameter_values)

        assert len(result.nodes) == 1
        instantiated_node = result.nodes[0]
        assert instantiated_node.data.parameters["query"] == "custom search query"
        assert instantiated_node.data.parameters["limit"] == 10  # Unchanged

    def test_instantiate_template_without_parameters(self):
        """Test instantiating a template without providing parameter values"""
        template = {
            id: "test-template",
            name: "Test Template",
            description: "Template for testing",
            category: "Testing",
            nodes: [
                {
                    id: "node1",
                    type: "provider",
                    position: {"x": 100, "y": 100},
                    data: {
                        label: "Provider",
                        parameters: {
                            "query": "default query",
                            "limit": 10
                        }
                    }
                }
            ],
            edges: [],
            parameters: [
                {
                    id: "node1_query",
                    name: "Provider query",
                    type: "string",
                    defaultValue: "default query",
                    description: "Query parameter",
                    nodeId: "node1",
                    paramKey: "query"
                }
            ]
        }

        # Instantiate without parameter values (should use defaults)
        result = self.template_service.instantiateTemplate(template, {})

        assert len(result.nodes) == 1
        instantiated_node = result.nodes[0]
        assert instantiated_node.data.parameters["query"] == "default query"  # Default value
        assert instantiated_node.data.parameters["limit"] == 10

    def test_parameter_identification_edge_cases(self):
        """Test edge cases in parameter identification"""
        nodes = [
            WorkflowNode(
                id="node1",
                type="provider",
                name="Edge Case Provider",
                position={"x": 100, "y": 100},
                data={
                    "label": "Edge Case Provider",
                    "parameters": {
                        "": "",  # Empty values should not be parameterized
                        "very_long_value": "a" * 200,  # Too long, should not parameterize
                        "short": "ok",  # Should parameterize
                        "url_like": "not-a-real-url",  # Should parameterize (doesn't match URL pattern)
                        "real_url": "https://example.com",  # Should not parameterize
                        "number_string": "123",  # Should not parameterize
                        "boolean_string": "true"  # Should not parameterize
                    }
                }
            )
        ]

        parameters = self.template_service.identifyTemplateParameters(nodes)

        # Should only parameterize 'short' and 'url_like'
        assert len(parameters) == 2
        param_keys = [p.paramKey for p in parameters]
        assert "short" in param_keys
        assert "url_like" in param_keys
        assert "" not in param_keys
        assert "very_long_value" not in param_keys
        assert "real_url" not in param_keys
        assert "number_string" not in param_keys
        assert "boolean_string" not in param_keys