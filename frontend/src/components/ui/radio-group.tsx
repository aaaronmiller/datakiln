import * as React from "react"

interface RadioGroupProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface RadioGroupItemProps {
  value: string
  id?: string
  className?: string
}

const RadioGroupContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
} | null>(null)

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  children,
  className = ""
}) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={className} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({
  value,
  id,
  className = ""
}) => {
  const context = React.useContext(RadioGroupContext)

  return (
    <input
      type="radio"
      id={id}
      value={value}
      checked={context?.value === value}
      onChange={() => context?.onValueChange(value)}
      className={`h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 ${className}`}
    />
  )
}