'use client'

import React from 'react'
import { Card } from './card'
import { Button } from './button'
import { Alert } from './alert'
import { DocumentProcessingError } from '@/types/document'
import {
  ExclamationCircleIcon as AlertCircle,
  ArrowPathIcon as RefreshCw,
  QuestionMarkCircleIcon as ExternalLink,
  QuestionMarkCircleIcon as Copy,
  QuestionMarkCircleIcon as ChevronDown,
  QuestionMarkCircleIcon as ChevronRight,
  InformationCircleIcon as Info,
  QuestionMarkCircleIcon as AlertTriangle,
  QuestionMarkCircleIcon as XCircle
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface ErrorDisplayProps {
  error: DocumentProcessingError
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorDisplay({ error, onRetry, onDismiss, className }: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  const [copiedDetails, setCopiedDetails] = React.useState(false)

  const copyErrorDetails = async () => {
    const details = JSON.stringify({
      code: error.code,
      message: error.message,
      details: error.details,
      suggestions: error.suggestions
    }, null, 2)
    
    try {
      await navigator.clipboard.writeText(details)
      setCopiedDetails(true)
      setTimeout(() => setCopiedDetails(false), 2000)
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }

  const getErrorIcon = () => {
    switch (error.code) {
      case 'PROCESSING_ERROR':
      case 'EXTRACTION_ERROR':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'FILE_ACCESS_ERROR':
      case 'PERMISSION_ERROR':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'UNSUPPORTED_FORMAT':
      case 'CORRUPTED_FILE':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getErrorSeverity = () => {
    if (error.recoverable) return 'warning'
    return 'destructive'
  }

  return (
    <Alert variant={getErrorSeverity()} className={className}>
      <div className="flex items-start gap-3">
        {getErrorIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Processing Error</h4>
            <div className="flex items-center gap-2">
              {onRetry && error.recoverable && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRetry}
                  className="h-7 px-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onDismiss}
                  className="h-7 px-2"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-sm mb-3">{error.message}</p>

          {error.suggestions && error.suggestions.length > 0 && (
            <div className="mb-3">
              <h5 className="font-medium text-sm mb-1">Suggestions:</h5>
              <ul className="text-sm list-disc list-inside space-y-1">
                {error.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {error.details && (
            <div className="space-y-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-sm font-medium hover:underline"
              >
                {showDetails ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Technical Details
              </button>
              
              {showDetails && (
                <div className="bg-gray-100 p-3 rounded text-xs font-mono relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyErrorDetails}
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <pre className="whitespace-pre-wrap pr-8">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                  {copiedDetails && (
                    <div className="absolute top-1 right-8 text-xs text-green-600">
                      Copied!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} reset={this.reset} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="p-6 m-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <XCircle className="h-12 w-12 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">
            An unexpected error occurred while processing your request.
          </p>
        </div>
        <div className="space-y-2">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <details className="text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Show error details
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        </div>
      </div>
    </Card>
  )
}

interface RetryableActionProps {
  onAction: () => Promise<void>
  children: React.ReactNode
  maxRetries?: number
  retryDelay?: number
  className?: string
}

export function RetryableAction({ 
  onAction, 
  children, 
  maxRetries = 3, 
  retryDelay = 1000,
  className 
}: RetryableActionProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [retryCount, setRetryCount] = React.useState(0)

  const executeAction = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await onAction()
      setRetryCount(0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const retryAction = async () => {
    if (retryCount >= maxRetries) {
      setError('Maximum retry attempts reached')
      return
    }

    setRetryCount(prev => prev + 1)
    
    // Add delay before retry
    await new Promise(resolve => setTimeout(resolve, retryDelay))
    await executeAction()
  }

  return (
    <div className={className}>
      <div onClick={executeAction}>
        {children}
      </div>
      
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Action Failed</p>
              <p className="text-sm">{error}</p>
              {retryCount > 0 && (
                <p className="text-xs text-gray-600">
                  Retry attempt {retryCount} of {maxRetries}
                </p>
              )}
            </div>
            {retryCount < maxRetries && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retryAction}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </>
                )}
              </Button>
            )}
          </div>
        </Alert>
      )}
    </div>
  )
}

interface LoadingStateProps {
  isLoading: boolean
  error?: string | null
  onRetry?: () => void
  children: React.ReactNode
  loadingText?: string
  emptyText?: string
  showRetry?: boolean
}

export function LoadingState({ 
  isLoading, 
  error, 
  onRetry, 
  children, 
  loadingText = 'Loading...',
  emptyText = 'No data available',
  showRetry = true
}: LoadingStateProps) {
  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500" />
          <p className="text-gray-600">{loadingText}</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          {showRetry && onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return <>{children}</>
}