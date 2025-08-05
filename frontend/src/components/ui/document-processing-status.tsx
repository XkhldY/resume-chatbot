'use client'

import React from 'react'
import { Card } from './card'
import { Button } from './button'
import { Progress } from './progress'
import { Alert } from './alert'
import { Document, DocumentMetadata } from '@/types/document'
import { 
  ClockIcon as Clock, 
  DocumentTextIcon as FileText, 
  ExclamationCircleIcon as AlertCircle, 
  CheckCircleIcon as CheckCircle, 
  ArrowPathIcon as Loader2, 
  EyeIcon as Eye, 
  ArrowPathIcon as RotateCcw 
} from '@heroicons/react/24/outline'

interface DocumentProcessingStatusProps {
  document: Document
  onRetry?: () => void
  onViewDetails?: () => void
  showMetadata?: boolean
  compact?: boolean
}

export function DocumentProcessingStatus({ 
  document, 
  onRetry, 
  onViewDetails, 
  showMetadata = true, 
  compact = false 
}: DocumentProcessingStatusProps) {
  const getStatusIcon = () => {
    switch (document.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (document.status) {
      case 'pending':
        return 'Pending Processing'
      case 'processing':
        return 'Processing...'
      case 'ready':
        return 'Ready'
      case 'error':
        return 'Processing Failed'
      default:
        return 'Unknown Status'
    }
  }

  const getStatusColor = () => {
    switch (document.status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'ready':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getProgressValue = () => {
    switch (document.status) {
      case 'pending':
        return 0
      case 'processing':
        return 50
      case 'ready':
        return 100
      case 'error':
        return 0
      default:
        return 0
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatProcessingTime = (seconds: number) => {
    if (seconds < 1) return '< 1s'
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2">
        {getStatusIcon()}
        <span className="text-sm font-medium">{document.filename}</span>
        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {document.metadata?.word_count && (
          <span className="text-xs text-gray-500">
            {document.metadata.word_count.toLocaleString()} words
          </span>
        )}
      </div>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-lg">{document.filename}</h3>
              <p className="text-sm text-gray-600">
                Created: {new Date(document.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}>
            {getStatusText()}
          </div>
        </div>

        {/* Progress Bar */}
        {(document.status === 'processing' || document.status === 'ready') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing Progress</span>
              <span>{getProgressValue()}%</span>
            </div>
            <Progress value={getProgressValue()} className="h-2" />
          </div>
        )}

        {/* Error Message */}
        {document.status === 'error' && document.processing_error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-medium">Processing Error</p>
              <p className="text-sm mt-1">{document.processing_error}</p>
            </div>
          </Alert>
        )}

        {/* Quick Stats */}
        {document.metadata && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {document.metadata.word_count.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">Words</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {document.metadata.page_count || 0}
              </p>
              <p className="text-xs text-gray-600">Pages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {formatFileSize(document.metadata.file_size)}
              </p>
              <p className="text-xs text-gray-600">Size</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {document.metadata.processing_time ? formatProcessingTime(document.metadata.processing_time) : '-'}
              </p>
              <p className="text-xs text-gray-600">Time</p>
            </div>
          </div>
        )}

        {/* Detailed Metadata */}
        {showMetadata && document.metadata && (
          <div className="space-y-3">
            <h4 className="font-medium">Document Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Language:</span> {document.metadata.language}
              </div>
              <div>
                <span className="font-medium">File Type:</span> {document.metadata.file_type}
              </div>
              <div>
                <span className="font-medium">Encoding:</span> {document.metadata.encoding}
              </div>
              <div>
                <span className="font-medium">Extraction Method:</span> {document.metadata.extraction_method}
              </div>
              {document.metadata.has_tables && (
                <div>
                  <span className="font-medium">Tables:</span> {document.metadata.table_count}
                </div>
              )}
              {document.metadata.has_images && (
                <div>
                  <span className="font-medium">Images:</span> {document.metadata.image_count}
                </div>
              )}
            </div>

            {/* Warnings */}
            {document.metadata.warnings && document.metadata.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <div>
                  <p className="font-medium">Processing Warnings</p>
                  <ul className="text-sm mt-1 list-disc list-inside">
                    {document.metadata.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </Alert>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
          {document.status === 'error' && onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Processing
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}