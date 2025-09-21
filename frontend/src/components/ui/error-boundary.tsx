import React, { Component, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-red-700">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  variant="outline"
                  size="sm"
                >
                  Try again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                  size="sm"
                >
                  Reload page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary