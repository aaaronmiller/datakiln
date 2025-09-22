"""
Enhanced Parameter Validation System

This module provides comprehensive parameter validation including:
- Type checking and constraint validation
- Parameter dependency validation
- Cross-field validation
- Runtime validation with detailed error reporting
"""

import re
import asyncio
from typing import Dict, Any, List, Optional, Union, Callable, Set, Tuple
from datetime import datetime
from enum import Enum
from dataclasses import dataclass
import json

# Removed circular import - BaseNode will be imported when needed


class ValidationLevel(Enum):
    """Validation levels for different stages"""
    SCHEMA = "schema"  # Basic JSON schema validation
    TYPE = "type"      # Type checking and constraints
    DEPENDENCY = "dependency"  # Parameter dependencies
    CROSS_FIELD = "cross_field"  # Cross-field validation
    RUNTIME = "runtime"  # Runtime validation during execution


class ValidationSeverity(Enum):
    """Severity levels for validation errors"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationError:
    """Detailed validation error information"""
    field: str
    message: str
    severity: ValidationSeverity
    level: ValidationLevel
    code: str
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "field": self.field,
            "message": self.message,
            "severity": self.severity.value,
            "level": self.level.value,
            "code": self.code,
            "details": self.details,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }


@dataclass
class ValidationResult:
    """Result of parameter validation"""
    valid: bool
    errors: List[ValidationError]
    warnings: List[ValidationError]
    validated_data: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings],
            "validated_data": self.validated_data
        }

    def has_errors(self) -> bool:
        return len([e for e in self.errors if e.severity == ValidationSeverity.ERROR]) > 0

    def has_warnings(self) -> bool:
        return len(self.warnings) > 0


class ParameterValidator:
    """Enhanced parameter validator with multiple validation levels"""

    def __init__(self):
        self._type_validators = self._initialize_type_validators()
        self._constraint_validators = self._initialize_constraint_validators()
        self._custom_validators: Dict[str, Callable] = {}

    def _initialize_type_validators(self) -> Dict[str, Callable]:
        """Initialize type validators"""
        return {
            "string": self._validate_string,
            "number": self._validate_number,
            "integer": self._validate_integer,
            "boolean": self._validate_boolean,
            "array": self._validate_array,
            "object": self._validate_object,
        }

    def _initialize_constraint_validators(self) -> Dict[str, Callable]:
        """Initialize constraint validators"""
        return {
            "minLength": self._validate_min_length,
            "maxLength": self._validate_max_length,
            "minimum": self._validate_minimum,
            "maximum": self._validate_maximum,
            "minItems": self._validate_min_items,
            "maxItems": self._validate_max_items,
            "pattern": self._validate_pattern,
            "enum": self._validate_enum,
            "format": self._validate_format,
        }

    def register_custom_validator(self, name: str, validator: Callable):
        """Register a custom validator function"""
        self._custom_validators[name] = validator

    async def validate_parameters(
        self,
        params: Dict[str, Any],
        schema: Dict[str, Any],
        level: ValidationLevel = ValidationLevel.RUNTIME,
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Validate parameters against schema at specified level"""
        errors = []
        warnings = []
        validated_data = {}

        try:
            # Schema-level validation
            if level.value >= ValidationLevel.SCHEMA.value:
                schema_result = self._validate_schema_level(params, schema)
                errors.extend(schema_result.errors)
                warnings.extend(schema_result.warnings)

            # Type and constraint validation
            if level.value >= ValidationLevel.TYPE.value:
                type_result = await self._validate_type_level(params, schema, context)
                errors.extend(type_result.errors)
                warnings.extend(type_result.warnings)
                validated_data.update(type_result.validated_data or {})

            # Dependency validation
            if level.value >= ValidationLevel.DEPENDENCY.value:
                dep_result = await self._validate_dependency_level(params, schema, context)
                errors.extend(dep_result.errors)
                warnings.extend(dep_result.warnings)

            # Cross-field validation
            if level.value >= ValidationLevel.CROSS_FIELD.value:
                cross_result = await self._validate_cross_field_level(params, schema, context)
                errors.extend(cross_result.errors)
                warnings.extend(cross_result.warnings)

        except Exception as e:
            errors.append(ValidationError(
                field="validation_system",
                message=f"Validation system error: {str(e)}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.RUNTIME,
                code="VALIDATION_SYSTEM_ERROR",
                details={"exception": str(e)}
            ))

        valid = not any(e.severity == ValidationSeverity.ERROR for e in errors)

        return ValidationResult(
            valid=valid,
            errors=errors,
            warnings=warnings,
            validated_data=validated_data if valid else None
        )

    def _validate_schema_level(self, params: Dict[str, Any], schema: Dict[str, Any]) -> ValidationResult:
        """Basic schema validation"""
        errors = []
        warnings = []

        # Check required parameters
        required = schema.get("required", [])
        for req_param in required:
            if req_param not in params:
                errors.append(ValidationError(
                    field=req_param,
                    message=f"Required parameter '{req_param}' is missing",
                    severity=ValidationSeverity.ERROR,
                    level=ValidationLevel.SCHEMA,
                    code="MISSING_REQUIRED_PARAMETER"
                ))

        # Check for unknown parameters
        properties = schema.get("properties", {})
        for param_name in params:
            if param_name not in properties:
                warnings.append(ValidationError(
                    field=param_name,
                    message=f"Unknown parameter '{param_name}' not defined in schema",
                    severity=ValidationSeverity.WARNING,
                    level=ValidationLevel.SCHEMA,
                    code="UNKNOWN_PARAMETER"
                ))

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    async def _validate_type_level(
        self,
        params: Dict[str, Any],
        schema: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Type checking and constraint validation"""
        errors = []
        warnings = []
        validated_data = {}

        properties = schema.get("properties", {})

        for param_name, param_value in params.items():
            if param_name not in properties:
                continue

            param_schema = properties[param_name]
            param_type = param_schema.get("type")

            # Type validation
            if param_type and param_type in self._type_validators:
                type_result = await self._type_validators[param_type](
                    param_name, param_value, param_schema, context
                )
                errors.extend(type_result.errors)
                warnings.extend(type_result.warnings)
                if type_result.validated_data:
                    validated_data[param_name] = type_result.validated_data.get(param_name)
            else:
                # Unknown type - pass through
                validated_data[param_name] = param_value

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            validated_data=validated_data
        )

    async def _validate_dependency_level(
        self,
        params: Dict[str, Any],
        schema: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Validate parameter dependencies"""
        errors = []
        warnings = []

        # Check for dependency rules in schema
        dependencies = schema.get("dependencies", {})
        for param_name, depends_on in dependencies.items():
            if param_name in params and params[param_name] is not None:
                if isinstance(depends_on, list):
                    # Simple dependency - all listed params must be present
                    for dep_param in depends_on:
                        if dep_param not in params or params[dep_param] is None:
                            errors.append(ValidationError(
                                field=param_name,
                                message=f"Parameter '{param_name}' requires '{dep_param}' to be set",
                                severity=ValidationSeverity.ERROR,
                                level=ValidationLevel.DEPENDENCY,
                                code="DEPENDENCY_VIOLATION",
                                details={"required_param": dep_param}
                            ))
                elif isinstance(depends_on, dict):
                    # Complex dependency rules
                    await self._validate_complex_dependency(
                        param_name, params[param_name], depends_on, params, errors, warnings, context
                    )

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    async def _validate_complex_dependency(
        self,
        param_name: str,
        param_value: Any,
        dependency_rules: Dict[str, Any],
        all_params: Dict[str, Any],
        errors: List[ValidationError],
        warnings: List[ValidationError],
        context: Optional[Dict[str, Any]] = None
    ):
        """Validate complex dependency rules"""
        # Example: conditional dependencies based on parameter values
        if "conditions" in dependency_rules:
            for condition in dependency_rules["conditions"]:
                if await self._evaluate_condition(condition, all_params, context):
                    required_params = condition.get("requires", [])
                    for req_param in required_params:
                        if req_param not in all_params or all_params[req_param] is None:
                            errors.append(ValidationError(
                                field=param_name,
                                message=f"Parameter '{param_name}' with value '{param_value}' requires '{req_param}'",
                                severity=ValidationSeverity.ERROR,
                                level=ValidationLevel.DEPENDENCY,
                                code="CONDITIONAL_DEPENDENCY_VIOLATION",
                                details={"condition": condition, "required_param": req_param}
                            ))

    async def _validate_cross_field_level(
        self,
        params: Dict[str, Any],
        schema: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Validate cross-field relationships"""
        errors = []
        warnings = []

        # Check for cross-field validation rules
        cross_validations = schema.get("crossValidations", [])
        for validation_rule in cross_validations:
            rule_result = await self._validate_cross_field_rule(
                validation_rule, params, errors, warnings, context
            )
            if not rule_result:
                break  # Stop on first failure if configured

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    async def _validate_cross_field_rule(
        self,
        rule: Dict[str, Any],
        params: Dict[str, Any],
        errors: List[ValidationError],
        warnings: List[ValidationError],
        context: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Validate a single cross-field rule"""
        rule_type = rule.get("type")
        fields = rule.get("fields", [])
        condition = rule.get("condition")
        message = rule.get("message", "Cross-field validation failed")
        severity = ValidationSeverity(rule.get("severity", "error"))

        # Check if all required fields are present
        missing_fields = [f for f in fields if f not in params]
        if missing_fields:
            return True  # Skip validation if required fields are missing

        # Evaluate condition
        if condition and not await self._evaluate_condition(condition, params, context):
            error = ValidationError(
                field=",".join(fields),
                message=message,
                severity=severity,
                level=ValidationLevel.CROSS_FIELD,
                code="CROSS_FIELD_VALIDATION_FAILED",
                details={"rule": rule, "params": params}
            )

            if severity == ValidationSeverity.ERROR:
                errors.append(error)
            else:
                warnings.append(error)

            return False

        return True

    async def _evaluate_condition(
        self,
        condition: Dict[str, Any],
        params: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Evaluate a validation condition"""
        condition_type = condition.get("type")

        if condition_type == "equals":
            field1 = condition.get("field1")
            field2 = condition.get("field2")
            if field1 in params and field2 in params:
                return params[field1] == params[field2]

        elif condition_type == "greater_than":
            field = condition.get("field")
            value = condition.get("value")
            if field in params:
                return params[field] > value

        elif condition_type == "less_than":
            field = condition.get("field")
            value = condition.get("value")
            if field in params:
                return params[field] < value

        elif condition_type == "custom":
            validator_name = condition.get("validator")
            if validator_name in self._custom_validators:
                return await self._custom_validators[validator_name](params, context)

        return True  # Default to true if condition cannot be evaluated

    # Type validators
    async def _validate_string(
        self,
        name: str,
        value: Any,
        schema: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Validate string parameter"""
        errors = []
        warnings = []

        if not isinstance(value, str):
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be a string, got {type(value).__name__}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="INVALID_TYPE"
            ))
            return ValidationResult(valid=False, errors=errors, warnings=warnings)

        # Apply string constraints
        for constraint, validator in self._constraint_validators.items():
            if constraint in schema:
                result = validator(name, value, schema[constraint], "string")
                errors.extend(result.errors)
                warnings.extend(result.warnings)

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            validated_data={name: value}
        )

    async def _validate_number(
        self,
        name: str,
        value: Any,
        schema: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Validate number parameter"""
        errors = []
        warnings = []

        if not isinstance(value, (int, float)):
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be a number, got {type(value).__name__}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="INVALID_TYPE"
            ))
            return ValidationResult(valid=False, errors=errors, warnings=warnings)

        # Apply number constraints
        for constraint in ["minimum", "maximum"]:
            if constraint in schema:
                result = self._constraint_validators[constraint](name, value, schema[constraint], "number")
                errors.extend(result.errors)
                warnings.extend(result.warnings)

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            validated_data={name: value}
        )

    async def _validate_integer(
        self,
        name: str,
        value: Any,
        schema: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Validate integer parameter"""
        errors = []
        warnings = []

        if not isinstance(value, int):
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be an integer, got {type(value).__name__}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="INVALID_TYPE"
            ))
            return ValidationResult(valid=False, errors=errors, warnings=warnings)

        # Apply integer constraints
        for constraint in ["minimum", "maximum"]:
            if constraint in schema:
                result = self._constraint_validators[constraint](name, value, schema[constraint], "integer")
                errors.extend(result.errors)
                warnings.extend(result.warnings)

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            validated_data={name: value}
        )

    async def _validate_boolean(
        self,
        name: str,
        value: Any,
        schema: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Validate boolean parameter"""
        errors = []

        if not isinstance(value, bool):
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be a boolean, got {type(value).__name__}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="INVALID_TYPE"
            ))

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=[],
            validated_data={name: value} if len(errors) == 0 else None
        )

    async def _validate_array(
        self,
        name: str,
        value: Any,
        schema: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Validate array parameter"""
        errors = []
        warnings = []

        if not isinstance(value, list):
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be an array, got {type(value).__name__}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="INVALID_TYPE"
            ))
            return ValidationResult(valid=False, errors=errors, warnings=warnings)

        # Apply array constraints
        for constraint in ["minItems", "maxItems"]:
            if constraint in schema:
                result = self._constraint_validators[constraint](name, value, schema[constraint], "array")
                errors.extend(result.errors)
                warnings.extend(result.warnings)

        # Validate array items if schema provided
        items_schema = schema.get("items")
        if items_schema and isinstance(items_schema, dict):
            item_type = items_schema.get("type")
            if item_type and item_type in self._type_validators:
                for i, item in enumerate(value):
                    item_result = await self._type_validators[item_type](
                        f"{name}[{i}]", item, items_schema, context
                    )
                    errors.extend(item_result.errors)
                    warnings.extend(item_result.warnings)

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            validated_data={name: value}
        )

    async def _validate_object(
        self,
        name: str,
        value: Any,
        schema: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Validate object parameter"""
        errors = []
        warnings = []

        if not isinstance(value, dict):
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be an object, got {type(value).__name__}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="INVALID_TYPE"
            ))
            return ValidationResult(valid=False, errors=errors, warnings=warnings)

        # Recursively validate object properties
        properties = schema.get("properties", {})
        for prop_name, prop_schema in properties.items():
            if prop_name in value:
                prop_result = await self.validate_parameters(
                    {prop_name: value[prop_name]},
                    {"properties": {prop_name: prop_schema}},
                    ValidationLevel.TYPE,
                    context
                )
                # Adjust field names for nested properties
                for error in prop_result.errors:
                    error.field = f"{name}.{error.field}"
                for warning in prop_result.warnings:
                    warning.field = f"{name}.{warning.field}"

                errors.extend(prop_result.errors)
                warnings.extend(prop_result.warnings)

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            validated_data={name: value}
        )

    # Constraint validators
    def _validate_min_length(self, name: str, value: str, constraint: int, type_name: str) -> ValidationResult:
        """Validate minimum length constraint"""
        errors = []
        if len(value) < constraint:
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be at least {constraint} characters long",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="MIN_LENGTH_VIOLATION",
                details={"minLength": constraint, "actualLength": len(value)}
            ))
        return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=[])

    def _validate_max_length(self, name: str, value: str, constraint: int, type_name: str) -> ValidationResult:
        """Validate maximum length constraint"""
        errors = []
        if len(value) > constraint:
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be at most {constraint} characters long",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="MAX_LENGTH_VIOLATION",
                details={"maxLength": constraint, "actualLength": len(value)}
            ))
        return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=[])

    def _validate_minimum(self, name: str, value: Union[int, float], constraint: Union[int, float], type_name: str) -> ValidationResult:
        """Validate minimum value constraint"""
        errors = []
        if value < constraint:
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be at least {constraint}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="MINIMUM_VIOLATION",
                details={"minimum": constraint, "actualValue": value}
            ))
        return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=[])

    def _validate_maximum(self, name: str, value: Union[int, float], constraint: Union[int, float], type_name: str) -> ValidationResult:
        """Validate maximum value constraint"""
        errors = []
        if value > constraint:
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be at most {constraint}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="MAXIMUM_VIOLATION",
                details={"maximum": constraint, "actualValue": value}
            ))
        return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=[])

    def _validate_min_items(self, name: str, value: list, constraint: int, type_name: str) -> ValidationResult:
        """Validate minimum items constraint"""
        errors = []
        if len(value) < constraint:
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must have at least {constraint} items",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="MIN_ITEMS_VIOLATION",
                details={"minItems": constraint, "actualItems": len(value)}
            ))
        return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=[])

    def _validate_max_items(self, name: str, value: list, constraint: int, type_name: str) -> ValidationResult:
        """Validate maximum items constraint"""
        errors = []
        if len(value) > constraint:
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must have at most {constraint} items",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="MAX_ITEMS_VIOLATION",
                details={"maxItems": constraint, "actualItems": len(value)}
            ))
        return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=[])

    def _validate_pattern(self, name: str, value: str, constraint: str, type_name: str) -> ValidationResult:
        """Validate pattern constraint"""
        errors = []
        try:
            if not re.match(constraint, value):
                errors.append(ValidationError(
                    field=name,
                    message=f"Parameter '{name}' does not match required pattern",
                    severity=ValidationSeverity.ERROR,
                    level=ValidationLevel.TYPE,
                    code="PATTERN_VIOLATION",
                    details={"pattern": constraint, "value": value}
                ))
        except re.error as e:
            errors.append(ValidationError(
                field=name,
                message=f"Invalid pattern constraint: {str(e)}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="INVALID_PATTERN",
                details={"pattern": constraint, "error": str(e)}
            ))
        return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=[])

    def _validate_enum(self, name: str, value: Any, constraint: list, type_name: str) -> ValidationResult:
        """Validate enum constraint"""
        errors = []
        if value not in constraint:
            errors.append(ValidationError(
                field=name,
                message=f"Parameter '{name}' must be one of: {', '.join(str(v) for v in constraint)}",
                severity=ValidationSeverity.ERROR,
                level=ValidationLevel.TYPE,
                code="ENUM_VIOLATION",
                details={"allowedValues": constraint, "actualValue": value}
            ))
        return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=[])

    def _validate_format(self, name: str, value: str, constraint: str, type_name: str) -> ValidationResult:
        """Validate format constraint"""
        errors = []
        warnings = []

        # Common format validations
        if constraint == "email":
            if "@" not in value or "." not in value.split("@")[1]:
                errors.append(ValidationError(
                    field=name,
                    message=f"Parameter '{name}' must be a valid email address",
                    severity=ValidationSeverity.ERROR,
                    level=ValidationLevel.TYPE,
                    code="INVALID_EMAIL_FORMAT"
                ))
        elif constraint == "url":
            if not value.startswith(("http://", "https://")):
                errors.append(ValidationError(
                    field=name,
                    message=f"Parameter '{name}' must be a valid URL",
                    severity=ValidationSeverity.ERROR,
                    level=ValidationLevel.TYPE,
                    code="INVALID_URL_FORMAT"
                ))
        elif constraint == "date":
            try:
                datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                errors.append(ValidationError(
                    field=name,
                    message=f"Parameter '{name}' must be a valid ISO date",
                    severity=ValidationSeverity.ERROR,
                    level=ValidationLevel.TYPE,
                    code="INVALID_DATE_FORMAT"
                ))
        else:
            warnings.append(ValidationError(
                field=name,
                message=f"Unknown format constraint '{constraint}' - validation skipped",
                severity=ValidationSeverity.WARNING,
                level=ValidationLevel.TYPE,
                code="UNKNOWN_FORMAT_CONSTRAINT"
            ))

        return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=warnings)


# Global validator instance
parameter_validator = ParameterValidator()


# Convenience functions
async def validate_node_parameters(
    node: Any,  # BaseNode - imported locally to avoid circular import
    params: Dict[str, Any],
    level: ValidationLevel = ValidationLevel.RUNTIME,
    context: Optional[Dict[str, Any]] = None
) -> ValidationResult:
    """Validate parameters for a node"""
    # Get node schema - this would need to be implemented based on node type
    schema = getattr(node, 'params_schema', {})

    return await parameter_validator.validate_parameters(params, schema, level, context)


async def validate_custom_node_parameters(
    definition: Any,  # CustomNodeDefinition
    params: Dict[str, Any],
    level: ValidationLevel = ValidationLevel.RUNTIME,
    context: Optional[Dict[str, Any]] = None
) -> ValidationResult:
    """Validate parameters for a custom node"""
    schema = getattr(definition, 'params_schema', {})

    return await parameter_validator.validate_parameters(params, schema, level, context)