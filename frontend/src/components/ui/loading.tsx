import * as React from "react"
import { cn } from "../../lib/utils"
import { Spinner } from "./spinner"
import { Skeleton, SkeletonText, SkeletonCard } from "./skeleton"

interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "spinner" | "skeleton" | "skeleton-text" | "skeleton-card"
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "primary" | "secondary" | "muted"
  // For skeleton-text
  lines?: number
  lineHeight?: "sm" | "md" | "lg"
  // For skeleton-card
  showAvatar?: boolean
  showTitle?: boolean
  showSubtitle?: boolean
  showContent?: boolean
  contentLines?: number
  // Common
  message?: string
  overlay?: boolean
  fullScreen?: boolean
}

export const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({
    className,
    type = "spinner",
    size = "md",
    variant = "default",
    lines = 3,
    lineHeight = "md",
    showAvatar = false,
    showTitle = true,
    showSubtitle = false,
    showContent = true,
    contentLines = 3,
    message,
    overlay = false,
    fullScreen = false,
    ...props
  }, ref) => {
    const content = React.useMemo(() => {
      switch (type) {
        case "spinner":
          return (
            <div className="flex flex-col items-center justify-center space-y-2">
              <Spinner size={size} variant={variant} />
              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}
            </div>
          )

        case "skeleton":
          return <Skeleton className={className} {...props} />

        case "skeleton-text":
          return (
            <SkeletonText
              lines={lines}
              lineHeight={lineHeight}
              className={className}
              {...props}
            />
          )

        case "skeleton-card":
          return (
            <SkeletonCard
              showAvatar={showAvatar}
              showTitle={showTitle}
              showSubtitle={showSubtitle}
              showContent={showContent}
              contentLines={contentLines}
              className={className}
              {...props}
            />
          )

        default:
          return null
      }
    }, [
      type, size, variant, lines, lineHeight, showAvatar, showTitle,
      showSubtitle, showContent, contentLines, message, className, props
    ])

    if (fullScreen) {
      return (
        <div
          ref={ref}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
            className
          )}
          {...props}
        >
          {content}
        </div>
      )
    }

    if (overlay) {
      return (
        <div
          ref={ref}
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm",
            className
          )}
          {...props}
        >
          {content}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        {content}
      </div>
    )
  }
)

Loading.displayName = "Loading"

// LoadingOverlay for overlaying content
interface LoadingOverlayProps extends Omit<LoadingProps, 'overlay' | 'fullScreen'> {
  children: React.ReactNode
  loading: boolean
}

export const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ children, loading, ...loadingProps }, ref) => {
    return (
      <div ref={ref} className="relative">
        {children}
        {loading && (
          <Loading
            {...loadingProps}
            overlay
            className="rounded-inherit"
          />
        )}
      </div>
    )
  }
)

LoadingOverlay.displayName = "LoadingOverlay"

// PageLoading for full page loading states
interface PageLoadingProps extends Omit<LoadingProps, 'overlay' | 'fullScreen'> {
  title?: string
  subtitle?: string
}

export const PageLoading = React.forwardRef<HTMLDivElement, PageLoadingProps>(
  ({ title, subtitle, message, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className="min-h-[400px] flex flex-col items-center justify-center space-y-4"
      >
        <Loading type="spinner" size="lg" {...props} />
        {(title || subtitle || message) && (
          <div className="text-center space-y-1">
            {title && (
              <h3 className="text-lg font-medium">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

PageLoading.displayName = "PageLoading"