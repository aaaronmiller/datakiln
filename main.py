from backend.app.main import app  # shim for tests expecting `from main import app`

# Export globals that tests expect
from backend.app.main import query_engine
from backend.app.main import provider_manager

# Export request models that tests expect
from backend.app.models.workflow import WorkflowExecutionRequest, WorkflowValidationRequest
from backend.app.api.v1.schemas.provider import ProviderTestRequest

__all__ = [
    'app',
    'query_engine',
    'provider_manager',
    'WorkflowExecutionRequest',
    'WorkflowValidationRequest',
    'ProviderTestRequest',
]