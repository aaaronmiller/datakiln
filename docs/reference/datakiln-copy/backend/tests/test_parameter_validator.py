"""
Tests for the Parameter Validator System
"""

import pytest
from datetime import datetime
from typing import Dict, Any

from nodes.parameter_validator import (
    ParameterValidator,
    ValidationResult,
    ValidationLevel,
    ValidationSeverity,
    parameter_validator
)


class TestParameterValidator:

    def setup_method(self):
        """Setup for each test"""
        self.validator = ParameterValidator()

    def test_basic_string_validation(self):
        """Test basic string parameter validation"""
        schema = {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "minLength": 2,
                    "maxLength": 50
                }
            },
            "required": ["name"]
        }

        # Valid input
        result = self.validator.validate_parameters(
            {"name": "test"},
            schema,
            ValidationLevel.TYPE
        )
        assert result.valid
        assert len(result.errors) == 0

        # Invalid input - too short
        result = self.validator.validate_parameters(
            {"name": "a"},
            schema,
            ValidationLevel.TYPE
        )
        assert not result.valid
        assert len(result.errors) == 1
        assert result.errors[0].code == "MIN_LENGTH_VIOLATION"

    def test_number_validation(self):
        """Test number parameter validation"""
        schema = {
            "type": "object",
            "properties": {
                "count": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100
                }
            }
        }

        # Valid input
        result = self.validator.validate_parameters(
            {"count": 50},
            schema,
            ValidationLevel.TYPE
        )
        assert result.valid

        # Invalid input - below minimum
        result = self.validator.validate_parameters(
            {"count": -1},
            schema,
            ValidationLevel.TYPE
        )
        assert not result.valid
        assert result.errors[0].code == "MINIMUM_VIOLATION"

    def test_array_validation(self):
        """Test array parameter validation"""
        schema = {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 1,
                    "maxItems": 10
                }
            }
        }

        # Valid input
        result = self.validator.validate_parameters(
            {"items": ["item1", "item2"]},
            schema,
            ValidationLevel.TYPE
        )
        assert result.valid

        # Invalid input - empty array
        result = self.validator.validate_parameters(
            {"items": []},
            schema,
            ValidationLevel.TYPE
        )
        assert not result.valid
        assert result.errors[0].code == "MIN_ITEMS_VIOLATION"

    def test_enum_validation(self):
        """Test enum parameter validation"""
        schema = {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["active", "inactive", "pending"]
                }
            }
        }

        # Valid input
        result = self.validator.validate_parameters(
            {"status": "active"},
            schema,
            ValidationLevel.TYPE
        )
        assert result.valid

        # Invalid input - not in enum
        result = self.validator.validate_parameters(
            {"status": "unknown"},
            schema,
            ValidationLevel.TYPE
        )
        assert not result.valid
        assert result.errors[0].code == "ENUM_VIOLATION"

    def test_dependency_validation(self):
        """Test parameter dependency validation"""
        schema = {
            "type": "object",
            "properties": {
                "use_proxy": {"type": "boolean"},
                "proxy_url": {"type": "string"},
                "proxy_port": {"type": "integer"}
            },
            "dependencies": {
                "use_proxy": ["proxy_url", "proxy_port"]
            }
        }

        # Valid - proxy not used
        result = self.validator.validate_parameters(
            {"use_proxy": False},
            schema,
            ValidationLevel.DEPENDENCY
        )
        assert result.valid

        # Invalid - proxy used but no URL/port
        result = self.validator.validate_parameters(
            {"use_proxy": True},
            schema,
            ValidationLevel.DEPENDENCY
        )
        assert not result.valid
        assert len(result.errors) == 2  # Missing proxy_url and proxy_port

    def test_cross_field_validation(self):
        """Test cross-field validation"""
        schema = {
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "format": "date"},
                "end_date": {"type": "string", "format": "date"}
            },
            "crossValidations": [
                {
                    "fields": ["start_date", "end_date"],
                    "condition": {"type": "custom", "validator": "date_range_check"},
                    "message": "End date must be after start date",
                    "severity": "error"
                }
            ]
        }

        # Register custom validator
        def date_range_check(params, context):
            start = params.get("start_date")
            end = params.get("end_date")
            if start and end:
                return datetime.fromisoformat(start) <= datetime.fromisoformat(end)
            return True

        self.validator.register_custom_validator("date_range_check", date_range_check)

        # Valid dates
        result = self.validator.validate_parameters(
            {"start_date": "2023-01-01", "end_date": "2023-01-02"},
            schema,
            ValidationLevel.CROSS_FIELD
        )
        assert result.valid

        # Invalid dates - end before start
        result = self.validator.validate_parameters(
            {"start_date": "2023-01-02", "end_date": "2023-01-01"},
            schema,
            ValidationLevel.CROSS_FIELD
        )
        assert not result.valid

    def test_pattern_validation(self):
        """Test regex pattern validation"""
        schema = {
            "type": "object",
            "properties": {
                "email": {
                    "type": "string",
                    "pattern": r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
                }
            }
        }

        # Valid email
        result = self.validator.validate_parameters(
            {"email": "test@example.com"},
            schema,
            ValidationLevel.TYPE
        )
        assert result.valid

        # Invalid email
        result = self.validator.validate_parameters(
            {"email": "invalid-email"},
            schema,
            ValidationLevel.TYPE
        )
        assert not result.valid
        assert result.errors[0].code == "PATTERN_VIOLATION"

    def test_schema_validation(self):
        """Test schema-level validation"""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"}
            },
            "required": ["name"]
        }

        # Valid input
        result = self.validator.validate_parameters(
            {"name": "test"},
            schema,
            ValidationLevel.SCHEMA
        )
        assert result.valid

        # Missing required field
        result = self.validator.validate_parameters(
            {},
            schema,
            ValidationLevel.SCHEMA
        )
        assert not result.valid
        assert result.errors[0].code == "MISSING_REQUIRED_PARAMETER"

    def test_validation_levels(self):
        """Test different validation levels"""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string", "minLength": 5}
            },
            "required": ["name"]
        }

        # Schema level only - should pass
        result = self.validator.validate_parameters(
            {"name": "hi"},  # Too short but schema doesn't check this
            schema,
            ValidationLevel.SCHEMA
        )
        assert result.valid

        # Type level - should fail due to length
        result = self.validator.validate_parameters(
            {"name": "hi"},
            schema,
            ValidationLevel.TYPE
        )
        assert not result.valid

    def test_validation_result_structure(self):
        """Test validation result structure"""
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        result = self.validator.validate_parameters(
            {"name": "test"},
            schema,
            ValidationLevel.TYPE
        )

        assert isinstance(result, ValidationResult)
        assert result.valid
        assert isinstance(result.errors, list)
        assert isinstance(result.warnings, list)
        assert result.validated_data is not None
        assert result.validated_data["name"] == "test"


class TestGlobalValidator:
    """Test the global parameter validator instance"""

    def test_global_validator_available(self):
        """Test that global validator is available"""
        assert parameter_validator is not None
        assert isinstance(parameter_validator, ParameterValidator)

    def test_global_validator_functionality(self):
        """Test that global validator works"""
        schema = {
            "type": "object",
            "properties": {"count": {"type": "integer", "minimum": 0}}
        }

        result = parameter_validator.validate_parameters(
            {"count": 5},
            schema,
            ValidationLevel.TYPE
        )
        assert result.valid

        result = parameter_validator.validate_parameters(
            {"count": -1},
            schema,
            ValidationLevel.TYPE
        )
        assert not result.valid