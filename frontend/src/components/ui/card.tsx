import * as React from "react"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        className={`p-6 pb-4 ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <h3
        className={`text-lg font-semibold ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

CardTitle.displayName = "CardTitle"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        className={`p-6 pt-0 ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardContent }