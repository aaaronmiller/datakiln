from backend.app.main import app  # shim for tests expecting `from main import app`

# Export globals that tests expect
from backend.app.main import query_engine
from backend.main import provider_manager

# Export request models that tests expect
from backend.main import WorkflowExecutionRequest, WorkflowValidationRequest, ProviderTestRequest

__all__ = [
    'app',
    'query_engine',
    'provider_manager',
    'WorkflowExecutionRequest',
    'WorkflowValidationRequest',
    'ProviderTestRequest',
]