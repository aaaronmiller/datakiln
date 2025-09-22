import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
import json

from nodes.base_node import BaseNode
from nodes.dom_action_node import DomActionNode
from nodes.prompt_node import PromptNode
from nodes.provider_node import ProviderNode
from nodes.transform_node import TransformNode
from nodes.export_node import ExportNode
from nodes.condition_node import ConditionNode


class TestBaseNode:
    """Test BaseNode functionality"""

    def test_base_node_creation(self):
        """Test basic node creation"""
        node = BaseNode(
            name="Test Node",
            type="test",
            description="Test description"
        )

        assert node.name == "Test Node"
        assert node.type == "test"
        assert node.description == "Test description"
        assert node.status == "pending"
        assert node.retries == 3
        assert node.timeout == 300
        assert isinstance(node.id, str)
        assert isinstance(node.created_at, datetime)
        assert isinstance(node.updated_at, datetime)

    def test_node_status_updates(self):
        """Test node status update functionality"""
        node = BaseNode(name="Test", type="test")

        # Test completed status
        node.mark_completed({"output": "test"})
        assert node.status == "completed"
        assert node.outputs == {"output": "test"}

        # Test failed status
        node.mark_failed("Test error")
        assert node.status == "failed"
        assert node.error_message == "Test error"

    def test_node_to_dict(self):
        """Test node serialization"""
        node = BaseNode(
            name="Test Node",
            type="test",
            tags=["tag1", "tag2"]
        )

        node_dict = node.to_dict()
        assert node_dict["name"] == "Test Node"
        assert node_dict["type"] == "test"
        assert node_dict["tags"] == ["tag1", "tag2"]
        assert "id" in node_dict
        assert "created_at" in node_dict
        assert "updated_at" in node_dict


class TestDomActionNode:
    """Test DomActionNode functionality"""

    @pytest.mark.asyncio
    async def test_dom_action_node_creation(self):
        """Test DOM action node creation"""
        node = DomActionNode(
            name="Click Button",
            selector_key="test_button",
            action="click",
            timeout=5000
        )

        assert node.name == "Click Button"
        assert node.type == "dom_action"
        assert node.selector_key == "test_button"
        assert node.action == "click"
        assert node.timeout == 5000

    @pytest.mark.asyncio
    async def test_dom_action_node_validation(self):
        """Test DOM action node validation"""
        # Test missing selector_key
        with pytest.raises(ValueError):
            DomActionNode(name="Test", action="click")

        # Test missing action
        with pytest.raises(ValueError):
            DomActionNode(name="Test", selector_key="button")

        # Test invalid action
        with pytest.raises(ValueError):
            DomActionNode(name="Test", selector_key="button", action="invalid_action")

    @pytest.mark.asyncio
    async def test_dom_action_node_assertion(self):
        """Test DOM action node assertion functionality"""
        node = DomActionNode(
            name="Test",
            selector_key="button",
            action="click",
            assert_type="visible",
            assert_value="true"
        )

        # Mock page and context
        mock_page = AsyncMock()
        mock_element = AsyncMock()
        mock_element.is_visible.return_value = True
        mock_page.query_selector.return_value = mock_element

        context = {
            "page": mock_page,
            "browser_context": AsyncMock(),
            "selectors_registry": {"button": "button.test"}
        }

        # This would test the assertion logic
        # The actual execution would require a real Playwright setup
        assert node.assert_type == "visible"
        assert node.assert_value == "true"


class TestPromptNode:
    """Test PromptNode functionality"""

    @pytest.mark.asyncio
    async def test_prompt_node_creation(self):
        """Test prompt node creation"""
        node = PromptNode(
            name="AI Prompt",
            template_id="research_template",
            vars={"topic": "AI", "depth": "comprehensive"},
            max_tokens=2000,
            temperature=0.7
        )

        assert node.name == "AI Prompt"
        assert node.type == "prompt"
        assert node.template_id == "research_template"
        assert node.vars == {"topic": "AI", "depth": "comprehensive"}
        assert node.max_tokens == 2000
        assert node.temperature == 0.7

    @pytest.mark.asyncio
    async def test_variable_substitution(self):
        """Test template variable substitution"""
        node = PromptNode(
            name="Test",
            template_id="test",
            vars={"name": "World", "action": "greet"}
        )

        template = "Hello {{name}}, please {{action}}!"
        result = node._substitute_variables(template)

        assert result == "Hello World, please greet!"

    @pytest.mark.asyncio
    async def test_required_variables_detection(self):
        """Test detection of required variables in template"""
        node = PromptNode(name="Test", template_id="test", vars={})

        template = "Hello {{name}}, you have {{count}} messages from {{sender}}."
        required_vars = node.get_required_variables(template)

        assert set(required_vars) == {"name", "count", "sender"}

    @pytest.mark.asyncio
    async def test_template_validation(self):
        """Test template variable validation"""
        node = PromptNode(
            name="Test",
            template_id="test",
            vars={"name": "John", "count": "5"}
        )

        template = "Hello {{name}}, you have {{count}} messages."
        validation = node.validate_template_variables(template)

        assert validation["valid"] == True
        assert validation["missing_variables"] == []
        assert validation["extra_variables"] == []


class TestTransformNode:
    """Test TransformNode functionality"""

    @pytest.mark.asyncio
    async def test_transform_node_creation(self):
        """Test transform node creation"""
        node = TransformNode(
            name="Markdown Transform",
            transform_type="markdown",
            output_key="formatted_content"
        )

        assert node.name == "Markdown Transform"
        assert node.type == "transform"
        assert node.transform_type == "markdown"
        assert node.output_key == "formatted_content"

    @pytest.mark.asyncio
    async def test_markdown_transform(self):
        """Test markdown transformation"""
        node = TransformNode(name="Test", transform_type="markdown")

        # Test string transformation
        result = await node._transform_markdown("Test content")
        assert "# Generated Content" in result
        assert "Test content" in result

    @pytest.mark.asyncio
    async def test_citation_extraction(self):
        """Test citation extraction"""
        node = TransformNode(name="Test", transform_type="extract_citations")

        text = "This is a test [1] with citations (Smith, 2023) and URLs https://example.com"
        citations = node._extract_citations(text)

        assert len(citations) > 0
        assert any(cit["type"] == "citation" for cit in citations)
        assert any(cit["type"] == "url" for cit in citations)

    @pytest.mark.asyncio
    async def test_data_filtering(self):
        """Test data filtering"""
        node = TransformNode(
            name="Test",
            transform_type="filter",
            filter_condition="len(item) > 3"
        )

        data = ["a", "bbb", "cccc", "dd"]
        filtered = node._filter_data(data)

        assert len(filtered) == 1
        assert "cccc" in filtered
        assert "a" not in filtered
        assert "bbb" not in filtered
        assert "dd" not in filtered

    @pytest.mark.asyncio
    async def test_text_cleaning(self):
        """Test text cleaning operations"""
        node = TransformNode(
            name="Test",
            transform_type="text_clean",
            clean_operations=["trim", "lowercase"]
        )

        text = "  HELLO WORLD  "
        cleaned = node._clean_text(text)

        assert cleaned == "hello world"


class TestExportNode:
    """Test ExportNode functionality"""

    @pytest.mark.asyncio
    async def test_export_node_creation(self):
        """Test export node creation"""
        node = ExportNode(
            name="Export Data",
            format="json",
            path_key="output.json"
        )

        assert node.name == "Export Data"
        assert node.type == "export"
        assert node.format == "json"
        assert node.path_key == "output.json"

    @pytest.mark.asyncio
    async def test_path_generation(self):
        """Test output path generation"""
        node = ExportNode(
            name="Test",
            format="json",
            path_key="data/{type}/output_{timestamp}.json",
            include_timestamp=True
        )

        # Mock inputs
        node.inputs = {"type": "research"}

        # Generate path (would normally include timestamp)
        path = node._generate_output_path()

        assert "data/research/output_" in str(path)
        assert path.suffix == ".json"

    @pytest.mark.asyncio
    async def test_data_extraction(self):
        """Test input data extraction"""
        node = ExportNode(name="Test", format="json", path_key="test.json")

        # Test with input_key
        node.input_key = "results"
        node.inputs = {"results": {"data": "test"}, "other": "ignored"}

        data = node._get_export_data()
        assert data == {"data": "test"}

        # Test without input_key
        node.input_key = None
        data = node._get_export_data()
        assert data == {"results": {"data": "test"}, "other": "ignored"}


class TestConditionNode:
    """Test ConditionNode functionality"""

    @pytest.mark.asyncio
    async def test_condition_node_creation(self):
        """Test condition node creation"""
        node = ConditionNode(
            name="Test Condition",
            expr="data > 5",
            true_next="success_node",
            false_next="failure_node"
        )

        assert node.name == "Test Condition"
        assert node.type == "condition"
        assert node.expr == "data > 5"
        assert node.true_next == "success_node"
        assert node.false_next == "failure_node"

    @pytest.mark.asyncio
    async def test_simple_condition_evaluation(self):
        """Test simple condition evaluation"""
        node = ConditionNode(name="Test", expr="")

        # Test boolean data
        assert await node._evaluate_simple_condition(True) == True
        assert await node._evaluate_simple_condition(False) == False

        # Test string data
        assert await node._evaluate_simple_condition("not_empty") == True
        assert await node._evaluate_simple_condition("") == False
        assert await node._evaluate_simple_condition("   ") == False

        # Test numeric data
        assert await node._evaluate_simple_condition(10) == True
        assert await node._evaluate_simple_condition(0) == False
        assert await node._evaluate_simple_condition(5.5) == True

        # Test list data
        assert await node._evaluate_simple_condition([1, 2, 3]) == True
        assert await node._evaluate_simple_condition([]) == False

    @pytest.mark.asyncio
    async def test_python_condition_evaluation(self):
        """Test Python expression evaluation"""
        node = ConditionNode(name="Test", expr="data > 5", condition_type="python")

        # Test simple Python expressions
        result = await node._evaluate_python_condition(10)
        assert result == True  # 10 > 5

    @pytest.mark.asyncio
    async def test_regex_condition_evaluation(self):
        """Test regex condition evaluation"""
        node = ConditionNode(name="Test", expr="test\\d+", condition_type="regex")

        # Test regex matching
        assert await node._evaluate_regex_condition("test123") == True
        assert await node._evaluate_regex_condition("abc123") == False

    @pytest.mark.asyncio
    async def test_evaluation_context_building(self):
        """Test evaluation context building"""
        node = ConditionNode(
            name="Test",
            expr="test",
            variables={"custom_var": "value"}
        )

        node.id = "test_node_123"
        node.created_at = datetime.now()

        context = node._build_evaluation_context("test_data")

        assert context["data"] == "test_data"
        assert context["value"] == "test_data"
        assert context["custom_var"] == "value"
        assert context["node_id"] == "test_node_123"
        assert "timestamp" in context
class TestDAGExecutor:
    """Test DAGExecutor functionality"""

    @pytest.mark.asyncio
    async def test_dag_executor_node_registry(self):
        """Test that DAG executor has all required node types registered"""
        from backend.dag_executor import DAGExecutor

        executor = DAGExecutor()

        # Check that all node types are registered
        expected_types = {
            "dataSource", "transform", "filter", "dom_action",
            "provider", "condition", "export", "prompt",
            "aggregate", "join", "union"
        }

        assert set(executor.node_classes.keys()) == expected_types

        # Verify all classes are importable and have execute method
        for node_type, node_class in executor.node_classes.items():
            assert hasattr(node_class, 'execute')

    @pytest.mark.asyncio
    async def test_dag_executor_node_instantiation(self):
        """Test that DAG executor can instantiate all node types"""
        from backend.dag_executor import DAGExecutor

        executor = DAGExecutor()

        # Test instantiating each node type
        test_configs = {
            "transform": {"name": "Test Transform", "transform_type": "markdown"},
            "filter": {"name": "Test Filter", "filter_type": "condition", "condition": "value > 5"},
            "condition": {"name": "Test Condition", "expr": "True"},
            "export": {"name": "Test Export", "format": "json", "path_key": "test.json"},
            "prompt": {"name": "Test Prompt", "template_id": "test"},
            "provider": {"name": "Test Provider", "provider_type": "gemini_deep_research"},
        }

        for node_type, config in test_configs.items():
            node_class = executor.node_classes.get(node_type)
            assert node_class is not None, f"Node type {node_type} not found"

            # Create node instance
            node = node_class(**config)
            assert node.type == node_type
            assert hasattr(node, 'execute')

    def test_enhanced_dag_executor_structure(self):
        """Test that enhanced DAG executor has proper structure and data flow capabilities"""
        from backend.dag_executor import DAGExecutor, DataFlowConnection, ExecutionResult, WorkflowExecutionContext

        executor = DAGExecutor()

        # Verify enhanced data structures exist
        assert hasattr(executor, '_build_nodes')
        assert hasattr(executor, '_analyze_data_flow')
        assert hasattr(executor, '_validate_and_order_workflow')
        assert hasattr(executor, '_execute_with_data_flow')
        assert hasattr(executor, '_prepare_node_inputs')
        assert hasattr(executor, '_prepare_execution_context')
        assert hasattr(executor, '_update_downstream_data_flow')
        assert hasattr(executor, '_handle_node_failure')
        assert hasattr(executor, '_prepare_execution_results')

        # Verify data structures
        connection = DataFlowConnection(
            source_node_id="node1",
            target_node_id="node2",
            source_output_key="output1",
            target_input_key="input1"
        )
        assert connection.source_node_id == "node1"
        assert connection.target_node_id == "node2"
        assert connection.source_output_key == "output1"
        assert connection.target_input_key == "input1"

        # Verify execution result structure
        result = ExecutionResult(
            node_id="test_node",
            success=True,
            outputs={"result": "test"},
            execution_time=1.5,
            metadata={"node_type": "test"}
        )
        assert result.node_id == "test_node"
        assert result.success == True
        assert result.outputs == {"result": "test"}
        assert result.execution_time == 1.5
        assert result.metadata == {"node_type": "test"}

        # Verify execution context structure
        context = WorkflowExecutionContext(
            workflow_id="test_workflow",
            execution_id="exec_123",
            global_context={"test": "context"},
            node_results={},
            data_flow={},
            execution_options={"query": "test"}
        )
        assert context.workflow_id == "test_workflow"
        assert context.execution_id == "exec_123"
        assert context.global_context == {"test": "context"}
        assert context.execution_options == {"query": "test"}