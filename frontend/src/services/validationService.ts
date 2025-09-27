/**
 * Enhanced Validation Service for Frontend
 *
 * Provides validation feedback for forms and user interfaces,
 * integrating with backend validation systems.
 */

import { ValidationError } from './workflowValidationService'

export enum ValidationSeverity {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info"
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export interface ValidationFeedback {
  field: string
  message: string
  severity: ValidationSeverity
  code: string
  details?: Record<string, unknown>
  timestamp?: string
}

export interface FormValidationResult {
  valid: boolean
  errors: ValidationFeedback[]
  warnings: ValidationFeedback[]
  fieldErrors: Record<string, ValidationFeedback[]>
}

export interface NodeParameterValidation {
  nodeId: string
  nodeType: string
  parameters: Record<string, unknown>
  validationResult: FormValidationResult
}

export interface ValidationRule {
  field: string
  rule: string
  value?: unknown
  message: string
  severity?: ValidationSeverity
}

class ValidationFeedbackService {
  private validationRules: Map<string, ValidationRule[]> = new Map()
  private customValidators: Map<string, (value: unknown, context?: unknown) => ValidationFeedback | null> = new Map()

  /**
   * Register validation rules for a form or component
   */
  registerValidationRules(componentId: string, rules: ValidationRule[]): void {
    this.validationRules.set(componentId, rules)
  }

  /**
   * Register a custom validator function
   */
  registerCustomValidator(name: string, validator: (value: unknown, context?: unknown) => ValidationFeedback | null): void {
    this.customValidators.set(name, validator)
  }

  /**
   * Validate form data against registered rules
   */
  async validateForm(
    componentId: string,
    formData: Record<string, unknown>,
    context?: unknown
  ): Promise<FormValidationResult> {
    const rules = this.validationRules.get(componentId) || []
    const errors: ValidationFeedback[] = []
    const warnings: ValidationFeedback[] = []
    const fieldErrors: Record<string, ValidationFeedback[]> = {}

    // Apply each validation rule
    for (const rule of rules) {
      const result = await this.validateRule(rule, formData)
      if (result) {
        const feedback = {
          ...result,
          timestamp: new Date().toISOString()
        }

        if (result.severity === ValidationSeverity.ERROR) {
          errors.push(feedback)
        } else {
          warnings.push(feedback)
        }

        // Group by field
        if (!fieldErrors[result.field]) {
          fieldErrors[result.field] = []
        }
        fieldErrors[result.field].push(feedback)
      }
    }

    // Apply custom validators
    for (const [, validator] of this.customValidators) {
      const result = validator(formData, context)
      if (result) {
        const feedback = {
          ...result,
          timestamp: new Date().toISOString()
        }

        if (result.severity === ValidationSeverity.ERROR) {
          errors.push(feedback)
        } else {
          warnings.push(feedback)
        }

        if (!fieldErrors[result.field]) {
          fieldErrors[result.field] = []
        }
        fieldErrors[result.field].push(feedback)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fieldErrors
    }
  }

  /**
   * Validate node parameters with backend integration
   */
  async validateNodeParameters(
    nodeId: string,
    nodeType: string,
    parameters: Record<string, unknown>,
    backendValidation?: ValidationResult
  ): Promise<NodeParameterValidation> {
    // Start with frontend validation
    const frontendResult = await this.validateForm(`node_${nodeType}`, parameters, { nodeId, nodeType })

    // Merge with backend validation if provided
    if (backendValidation) {
      frontendResult.errors.push(...this.convertBackendErrors(backendValidation.errors))
      frontendResult.warnings.push(...this.convertBackendWarnings(backendValidation.warnings))

      // Update field errors
      for (const error of backendValidation.errors) {
        const fieldName = error.instancePath?.replace('/', '') || 'unknown'
        if (!frontendResult.fieldErrors[fieldName]) {
          frontendResult.fieldErrors[fieldName] = []
        }
        frontendResult.fieldErrors[fieldName].push(this.convertBackendError(error))
      }

      for (const warning of backendValidation.warnings) {
        const fieldName = warning.instancePath?.replace('/', '') || 'unknown'
        if (!frontendResult.fieldErrors[fieldName]) {
          frontendResult.fieldErrors[fieldName] = []
        }
        frontendResult.fieldErrors[fieldName].push(this.convertBackendWarning(warning))
      }

      frontendResult.valid = frontendResult.valid && backendValidation.valid
    }

    return {
      nodeId,
      nodeType,
      parameters,
      validationResult: frontendResult
    }
  }

  /**
   * Validate a single rule
   */
  private async validateRule(
    rule: ValidationRule,
    formData: Record<string, unknown>
  ): Promise<ValidationFeedback | null> {
    const fieldValue = formData[rule.field]
    const severity = rule.severity || ValidationSeverity.ERROR

    switch (rule.rule) {
      case 'required':
        if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} is required`,
            severity,
            code: 'REQUIRED_FIELD_MISSING'
          }
        }
        break

      case 'minLength':
        if (typeof fieldValue === 'string' && typeof rule.value === 'number' && fieldValue.length < rule.value) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be at least ${rule.value} characters`,
            severity,
            code: 'MIN_LENGTH_VIOLATION',
            details: { minLength: rule.value, actualLength: fieldValue.length }
          }
        }
        break

      case 'maxLength':
        if (typeof fieldValue === 'string' && typeof rule.value === 'number' && fieldValue.length > rule.value) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be at most ${rule.value} characters`,
            severity,
            code: 'MAX_LENGTH_VIOLATION',
            details: { maxLength: rule.value, actualLength: fieldValue.length }
          }
        }
        break

      case 'pattern':
        if (typeof fieldValue === 'string' && typeof rule.value === 'string' && !new RegExp(rule.value).test(fieldValue)) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} does not match required pattern`,
            severity,
            code: 'PATTERN_VIOLATION',
            details: { pattern: rule.value }
          }
        }
        break

      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (typeof fieldValue === 'string' && !emailRegex.test(fieldValue)) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be a valid email address`,
            severity,
            code: 'INVALID_EMAIL'
          }
        }
        break
      }

      case 'url':
        try {
          if (typeof fieldValue === 'string') {
            new URL(fieldValue)
          } else {
            throw new Error('Not a string')
          }
        } catch {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be a valid URL`,
            severity,
            code: 'INVALID_URL'
          }
        }
        break

      case 'min':
        if (typeof fieldValue === 'number' && typeof rule.value === 'number' && fieldValue < rule.value) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be at least ${rule.value}`,
            severity,
            code: 'MINIMUM_VIOLATION',
            details: { minimum: rule.value, actualValue: fieldValue }
          }
        }
        break

      case 'max':
        if (typeof fieldValue === 'number' && typeof rule.value === 'number' && fieldValue > rule.value) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be at most ${rule.value}`,
            severity,
            code: 'MAXIMUM_VIOLATION',
            details: { maximum: rule.value, actualValue: fieldValue }
          }
        }
        break

      case 'enum':
        if (Array.isArray(rule.value) && !rule.value.includes(fieldValue)) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be one of: ${rule.value.join(', ')}`,
            severity,
            code: 'ENUM_VIOLATION',
            details: { allowedValues: rule.value, actualValue: fieldValue }
          }
        }
        break

      case 'custom':
        // Custom validation logic would be handled by custom validators
        break
    }

    return null
  }

  /**
   * Convert backend validation errors to frontend format
   */
  private convertBackendErrors(backendErrors: ValidationError[]): ValidationFeedback[] {
    return backendErrors.map(error => this.convertBackendError(error))
  }

  private convertBackendWarnings(backendWarnings: ValidationError[]): ValidationFeedback[] {
    return backendWarnings.map(warning => this.convertBackendWarning(warning))
  }

  private convertBackendError(error: ValidationError): ValidationFeedback {
    return {
      field: error.instancePath?.replace('/', '') || 'unknown',
      message: error.message || 'Validation error',
      severity: ValidationSeverity.ERROR,
      code: error.keyword || 'BACKEND_VALIDATION_ERROR',
      details: error.params,
      timestamp: new Date().toISOString()
    }
  }

  private convertBackendWarning(warning: ValidationError): ValidationFeedback {
    return {
      field: warning.instancePath?.replace('/', '') || 'unknown',
      message: warning.message || 'Validation warning',
      severity: ValidationSeverity.WARNING,
      code: warning.keyword || 'BACKEND_VALIDATION_WARNING',
      details: warning.params,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get validation summary for display
   */
  getValidationSummary(result: FormValidationResult): {
    totalErrors: number
    totalWarnings: number
    fieldsWithErrors: string[]
    mostCommonError: string | null
  } {
    const fieldsWithErrors = Object.keys(result.fieldErrors)
    const errorCodes = result.errors.map(e => e.code)
    const mostCommonError = errorCodes.length > 0
      ? errorCodes.reduce((a, b, i, arr) =>
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        )
      : null

    return {
      totalErrors: result.errors.length,
      totalWarnings: result.warnings.length,
      fieldsWithErrors,
      mostCommonError
    }
  }

  /**
   * Clear validation rules for a component
   */
  clearValidationRules(componentId: string): void {
    this.validationRules.delete(componentId)
  }

  /**
   * Clear all validation rules and custom validators
   */
  clearAll(): void {
    this.validationRules.clear()
    this.customValidators.clear()
  }
}

// Global validation service instance
export const validationFeedbackService = new ValidationFeedbackService()

// Convenience functions
export const validateForm = (componentId: string, formData: Record<string, unknown>, context?: unknown) =>
  validationFeedbackService.validateForm(componentId, formData, context)

export const validateNodeParameters = (
  nodeId: string,
  nodeType: string,
  parameters: Record<string, unknown>,
  backendValidation?: ValidationResult
) =>
  validationFeedbackService.validateNodeParameters(nodeId, nodeType, parameters, backendValidation)

export const registerValidationRules = (componentId: string, rules: ValidationRule[]) =>
  validationFeedbackService.registerValidationRules(componentId, rules)

export const registerCustomValidator = (
  name: string,
  validator: (value: unknown, context?: unknown) => ValidationFeedback | null
) =>
  validationFeedbackService.registerCustomValidator(name, validator)