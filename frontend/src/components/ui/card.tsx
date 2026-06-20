import * as React from "react"
import { cn } from "../../lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        className={cn(
          "rounded-[14px] border border-surface-border bg-surface shadow-sm transition-all duration-200 hover:border-surface-border-hover hover:shadow-md hover:-translate-y-[1px]",
          className
        )}
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
        className={cn("flex flex-col space-y-1.5 p-5 pb-3", className)}
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
        className={cn("text-base font-semibold tracking-tight text-text-primary", className)}
        ref={ref}
        {...props}
      />
    )
  }
)

CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <p
        className={cn("text-sm text-text-muted leading-relaxed", className)}
        ref={ref}
        {...props}
      />
    )
  }
)

CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        className={cn("p-5 pt-0", className)}
        ref={ref}
        {...props}
      />
    )
  }
)

CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        className={cn("flex items-center p-5 pt-3 border-t border-surface-border", className)}
        ref={ref}
        {...props}
      />
    )
  }
)

CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
