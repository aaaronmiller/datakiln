import * as React from "react"
import { cn } from "../../lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "rounded" | "circular"
  animate?: boolean
}

const variantClasses = {
  default: "rounded",
  rounded: "rounded-md",
  circular: "rounded-full"
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "default", animate = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-muted",
          animate && "animate-pulse",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Skeleton.displayName = "Skeleton"

// SkeletonText for text content
interface SkeletonTextProps extends Omit<SkeletonProps, 'variant'> {
  lines?: number
  lineHeight?: "sm" | "md" | "lg"
}

const lineHeightClasses = {
  sm: "h-3",
  md: "h-4",
  lg: "h-5"
}

export const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className, lines = 1, lineHeight = "md", animate = true, ...props }, ref) => {
    if (lines === 1) {
      return (
        <Skeleton
          ref={ref}
          className={cn("w-full", lineHeightClasses[lineHeight], className)}
          animate={animate}
          {...props}
        />
      )
    }

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton
            key={i}
            className={cn(
              lineHeightClasses[lineHeight],
              i === lines - 1 ? "w-3/4" : "w-full" // Last line shorter
            )}
            animate={animate}
          />
        ))}
      </div>
    )
  }
)

SkeletonText.displayName = "SkeletonText"

// SkeletonCard for card-like content
interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  showAvatar?: boolean
  showTitle?: boolean
  showSubtitle?: boolean
  showContent?: boolean
  contentLines?: number
}

export const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({
    className,
    showAvatar = false,
    showTitle = true,
    showSubtitle = false,
    showContent = true,
    contentLines = 3,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("p-4 border rounded-lg space-y-3", className)}
        {...props}
      >
        {showAvatar && (
          <Skeleton variant="circular" className="w-10 h-10" />
        )}
        {showTitle && (
          <Skeleton className="h-5 w-3/4" />
        )}
        {showSubtitle && (
          <Skeleton className="h-4 w-1/2" />
        )}
        {showContent && (
          <SkeletonText lines={contentLines} lineHeight="sm" />
        )}
      </div>
    )
  }
)

SkeletonCard.displayName = "SkeletonCard"