import pytest

from app.utils.security import (
    SecurityValidationError,
    safe_resolve_path,
    validate_public_url,
    validate_readonly_sql,
    validate_youtube_url,
)
from nodes.definitions import CustomNodeDefinition
from nodes.node_factory import DynamicNodeFactory
from nodes.exceptions import NodeFactoryError


def test_safe_resolve_path_rejects_traversal(tmp_path):
    with pytest.raises(SecurityValidationError):
        safe_resolve_path('../outside.txt', tmp_path)


def test_safe_resolve_path_allows_sandbox_child(tmp_path):
    assert safe_resolve_path('inside/file.txt', tmp_path) == tmp_path / 'inside' / 'file.txt'


def test_validate_public_url_rejects_localhost():
    with pytest.raises(SecurityValidationError):
        validate_public_url('http://127.0.0.1:8000/admin')


def test_validate_youtube_url_rejects_non_youtube_host():
    with pytest.raises(SecurityValidationError):
        validate_youtube_url('https://example.com/watch?v=aaaaaaaaaaa')


def test_validate_readonly_sql_rejects_mutation():
    with pytest.raises(SecurityValidationError):
        validate_readonly_sql('DELETE FROM workflows')


def test_validate_readonly_sql_allows_select():
    assert validate_readonly_sql('SELECT * FROM workflows') == 'SELECT * FROM workflows'


@pytest.mark.asyncio
async def test_dynamic_node_factory_rejects_inline_python_implementation():
    factory = DynamicNodeFactory()
    definition = CustomNodeDefinition(
        type='evil',
        name='Evil',
        description='Inline code should not execute',
        version='1.0.0',
        inputs=[],
        outputs=[],
        params_schema={'type': 'object'},
        implementation=(
            'from nodes.base_node import BaseNode\n'
            'class EvilNode(BaseNode):\n'
            '    async def execute(self, context):\n'
            '        return {}\n'
        ),
    )

    factory.register_node_definition(definition)

    with pytest.raises(NodeFactoryError):
        await factory.create_node('evil')
