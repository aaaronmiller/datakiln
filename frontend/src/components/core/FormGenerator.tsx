import * as React from "react"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Label } from "../ui/label"

interface JSONSchema {
  type: string
  required?: string[]
  properties: Record<string, JSONSchemaProperty>
}

interface JSONSchemaProperty {
  type: string
  enum?: string[]
  default?: unknown
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  items?: JSONSchemaProperty
  oneOf?: JSONSchemaProperty[]
  additionalProperties?: boolean | JSONSchemaProperty
}

interface FormGeneratorProps {
  schema: JSONSchema
  values: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
  errors?: Record<string, string>
}

const FormGenerator: React.FC<FormGeneratorProps> = ({ schema, values, onChange, errors = {} }) => {
  const renderField = (fieldName: string, fieldSchema: JSONSchemaProperty, isRequired: boolean) => {
    const value = values[fieldName] ?? fieldSchema.default ?? ""
    const error = errors[fieldName]
    const fieldId = `field-${fieldName}`

    const handleChange = (newValue: unknown) => {
      onChange(fieldName, newValue)
    }

    // Handle different field types
    switch (fieldSchema.type) {
      case "string":
        if (fieldSchema.enum) {
          // Enum field - use select
          return (
            <div key={fieldName} className="space-y-2">
              <Label htmlFor={fieldId} className="text-sm font-medium">
                {fieldName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <select
                id={fieldId}
                value={value as string}
                onChange={(e) => handleChange(e.target.value)}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-red-500" : ""}`}
              >
                <option value="">Select {fieldName}</option>
                {fieldSchema.enum.map(option => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )
        } else {
          // Text field - check if it's a long text (no maxLength or maxLength > 200)
          const isTextarea = !fieldSchema.maxLength || fieldSchema.maxLength > 200
          return (
            <div key={fieldName} className="space-y-2">
              <Label htmlFor={fieldId} className="text-sm font-medium">
                {fieldName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {isTextarea ? (
                <Textarea
                  id={fieldId}
                  value={value as string}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={`Enter ${fieldName}`}
                  className={`text-sm ${error ? "border-red-500" : ""}`}
                  rows={3}
                />
              ) : (
                <Input
                  id={fieldId}
                  type="text"
                  value={value as string}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={`Enter ${fieldName}`}
                  className={`text-sm ${error ? "border-red-500" : ""}`}
                  minLength={fieldSchema.minLength}
                  maxLength={fieldSchema.maxLength}
                  pattern={fieldSchema.pattern}
                />
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )
        }

      case "number":
      case "integer":
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium">
              {fieldName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="number"
              value={value as number}
              onChange={(e) => handleChange(fieldSchema.type === "integer" ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
              placeholder={`Enter ${fieldName}`}
              className={`text-sm ${error ? "border-red-500" : ""}`}
              min={fieldSchema.minimum}
              max={fieldSchema.maximum}
              step={fieldSchema.type === "integer" ? 1 : 0.1}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )

      case "boolean":
        return (
          <div key={fieldName} className="flex items-center space-x-2">
            <input
              id={fieldId}
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => handleChange(e.target.checked)}
              className="h-4 w-4 rounded border border-input"
            />
            <Label htmlFor={fieldId} className="text-sm font-medium">
              {fieldName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )

      case "array": {
        // For arrays, we'll implement a simple comma-separated input for now
        // In a full implementation, this would be more sophisticated
        const arrayValue = Array.isArray(value) ? value.join(", ") : value || ""
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium">
              {fieldName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="text"
              value={arrayValue as string}
              onChange={(e) => handleChange(e.target.value.split(",").map(s => s.trim()).filter(s => s))}
              placeholder={`Enter ${fieldName} (comma-separated)`}
              className={`text-sm ${error ? "border-red-500" : ""}`}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )
      }

      case "object": {
        // For objects, we'll use a JSON textarea for now
        const objectValue = typeof value === "object" ? JSON.stringify(value, null, 2) : value || ""
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium">
              {fieldName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={fieldId}
              value={objectValue as string}
              onChange={(e) => {
                try {
                  handleChange(JSON.parse(e.target.value))
                } catch {
                  handleChange(e.target.value)
                }
              }}
              placeholder={`Enter ${fieldName} (JSON)`}
              className={`text-sm font-mono ${error ? "border-red-500" : ""}`}
              rows={4}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )
      }

      default:
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium">
              {fieldName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="text"
              value={value as string}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={`Enter ${fieldName}`}
              className={`text-sm ${error ? "border-red-500" : ""}`}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )
    }
  }

  const requiredFields = schema.required || []

  return (
    <div className="space-y-4">
      {Object.entries(schema.properties).map(([fieldName, fieldSchema]) => {
        const isRequired = requiredFields.includes(fieldName)
        return renderField(fieldName, fieldSchema, isRequired)
      })}
    </div>
  )
}

export default FormGenerator