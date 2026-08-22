import pytest

from app.services.query_optimizer import QueryRewriter
from app.utils.safe_eval import UnsafeExpressionError, safe_arithmetic_eval, safe_boolean_eval
from dag_executor import _evaluate_dkel
from nodes.condition_node import ConditionNode
from nodes.filter_node import FilterNode
from nodes.transform_node import TransformNode


ESCAPE_PAYLOAD = '().__class__.__base__.__subclasses__()'


def test_safe_arithmetic_eval_allows_numeric_expressions():
    assert safe_arithmetic_eval('1 + 2 * 3') == 7


def test_safe_arithmetic_eval_rejects_object_traversal():
    with pytest.raises(UnsafeExpressionError):
        safe_arithmetic_eval(ESCAPE_PAYLOAD)


def test_query_rewriter_constant_folding_ignores_unsafe_expression():
    graph = {
        'nodes': [
            {
                'id': 'transform-1',
                'type': 'transform',
                'data': {'transformation': f'add_field:{ESCAPE_PAYLOAD} + 1'},
            }
        ],
        'edges': [],
    }

    rewritten, applied = QueryRewriter()._apply_constant_folding(graph)

    assert rewritten is None
    assert applied is False
    assert graph['nodes'][0]['data']['transformation'] == f'add_field:{ESCAPE_PAYLOAD} + 1'


def test_safe_boolean_eval_allows_basic_workflow_conditions():
    assert safe_boolean_eval('input["score"] >= 50 and input["kind"].startswith("ok")', {
        'input': {'score': 75, 'kind': 'ok-result'},
        'true': True,
        'false': False,
        'null': None,
    }) is True


def test_safe_boolean_eval_rejects_function_import_escape():
    with pytest.raises(UnsafeExpressionError):
        safe_boolean_eval('__import__("os").system("id")', {})


def test_dkel_rejects_object_traversal_payload():
    with pytest.raises(ValueError):
        _evaluate_dkel(ESCAPE_PAYLOAD, {'score': 75})


def test_dkel_allows_basic_condition():
    assert _evaluate_dkel('input.score >= 50 && input.kind.startsWith("ok")', {
        'score': 75,
        'kind': 'ok-result',
    }) is True


@pytest.mark.asyncio
async def test_condition_node_rejects_python_escape_payload():
    node = ConditionNode(name='condition', expr=ESCAPE_PAYLOAD, condition_type='python')  # type: ignore[reportCallIssue]

    assert await node._evaluate_condition({'score': 75}) is False


def test_filter_node_rejects_condition_escape_payload():
    node = FilterNode(name='filter', filter_type='condition', condition=ESCAPE_PAYLOAD)  # type: ignore[reportCallIssue]

    with pytest.raises(ValueError):
        node._evaluate_condition(ESCAPE_PAYLOAD, {'value': 1})


def test_transform_node_filter_rejects_escape_payload_without_executing():
    node = TransformNode(name='transform', transform_type='filter', filter_condition=ESCAPE_PAYLOAD)  # type: ignore[reportCallIssue]

    assert node._filter_data([1]) == [1]
