import * as React from "react"
import { cn } from "../../lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary"
  size?: "sm" | "md" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "md", ...props }, ref) => {
    const baseClasses =
      "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]"

    const variantClasses = {
      default:
        "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:shadow-md hover:shadow-indigo-500/20 hover:-translate-y-[1px] border-0",
      secondary:
        "bg-surface text-text-primary border border-surface-border hover:bg-surface-hover hover:border-surface-border-hover shadow-sm",
      outline:
        "border border-surface-border bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover",
      ghost:
        "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
      destructive:
        "bg-error text-white shadow-sm hover:bg-error/90 hover:-translate-y-[1px] hover:shadow-md hover:shadow-error/20 border-0",
    }

    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs h-8",
      md: "px-4 py-2 text-sm h-10",
      lg: "px-6 py-3 text-base h-12",
      icon: "h-10 w-10",
    }

    const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className)

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }
