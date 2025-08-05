'use client'

import React from 'react'
import { Card } from './card'
import { Button } from './button'
import { Progress } from './progress'
import { Document } from '@/types/document'
import { 
  DocumentTextIcon as FileText,
  ClockIcon as Clock,
  CheckCircleIcon as CheckCircle,
  ExclamationCircleIcon as AlertCircle,
  ArrowPathIcon as Loader2,
  EyeIcon as Eye,
  PlayIcon as Play,
  ArrowPathIcon as RotateCcw,
  GlobeAmericasIcon as Globe,
  HashtagIcon as Hash
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface DocumentListItemProps {
  document: Document
  onProcess?: (documentId: string) => void
  onView?: (documentId: string) => void
  onRetry?: (documentId: string) => void
  showMetadata?: boolean
  compact?: boolean
}

export function DocumentListItem({ 
  document, 
  onProcess, 
  onView, 
  onRetry, 
  showMetadata = true, 
  compact = false 
}: DocumentListItemProps) {
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
        return 'Pending'
      case 'processing':
        return 'Processing'
      case 'ready':
        return 'Ready'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  const getStatusBadgeClass = () => {
    switch (document.status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getFileTypeIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    const iconClass = "h-6 w-6"
    
    switch (extension) {
      case 'pdf':
        return <FileText className={`${iconClass} text-red-500`} />
      case 'docx':
        return <FileText className={`${iconClass} text-blue-500`} />
      case 'txt':
        return <FileText className={`${iconClass} text-gray-500`} />
      case 'md':
        return <FileText className={`${iconClass} text-purple-500`} />
      default:
        return <FileText className={`${iconClass} text-gray-400`} />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors",
        document.status === 'error' && "border-red-200 bg-red-50",
        document.status === 'ready' && "border-green-200",
        document.status === 'processing' && "border-blue-200"
      )}>
        {getFileTypeIcon(document.filename)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{document.filename}</span>
            <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadgeClass()}`}>
              {getStatusText()}
            </span>
          </div>
          {document.metadata && (
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
              <span>{document.metadata.word_count.toLocaleString()} words</span>
              <span>{formatFileSize(document.metadata.file_size)}</span>
              <span>{document.metadata.language}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {getStatusIcon()}
        </div>
      </div>
    )
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getFileTypeIcon(document.filename)}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {document.filename}
              </h3>
              <p className="text-xs text-gray-500">
                {formatDate(document.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getStatusBadgeClass()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Progress for processing documents */}
        {document.status === 'processing' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Processing...</span>
              <span className="text-gray-600">{getProgressValue()}%</span>
            </div>
            <Progress value={getProgressValue()} className="h-1" />
          </div>
        )}

        {/* Error message */}
        {document.status === 'error' && document.processing_error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
            {document.processing_error}
          </div>
        )}

        {/* Metadata summary */}
        {showMetadata && document.metadata && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">{document.metadata.word_count.toLocaleString()} words</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">{formatFileSize(document.metadata.file_size)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">{document.metadata.language}</span>
            </div>
            {document.chunk_count && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{document.chunk_count} chunks</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {document.status === 'ready' && onView && (
            <Button variant="outline" size="sm" onClick={() => onView(document.id)}>
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          )}
          {document.status === 'pending' && onProcess && (
            <Button variant="outline" size="sm" onClick={() => onProcess(document.id)}>
              <Play className="h-3 w-3 mr-1" />
              Process
            </Button>
          )}
          {document.status === 'error' && onRetry && (
            <Button variant="outline" size="sm" onClick={() => onRetry(document.id)}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}