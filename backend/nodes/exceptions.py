"""
Node-related exception classes

This module contains all exception classes used by the node system
to avoid circular import issues.
"""

class NodeFactoryError(Exception):
    """Base exception for node factory errors"""
    pass


class NodeValidationError(NodeFactoryError):
    """Exception raised when node validation fails"""
    pass


class NodeRegistrationError(NodeFactoryError):
    """Exception raised when node registration fails"""
    pass