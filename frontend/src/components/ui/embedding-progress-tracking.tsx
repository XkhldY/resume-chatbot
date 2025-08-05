'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './card'
import { Alert, AlertDescription } from './alert'
import { Button } from './button'
import { Progress } from './progress'
import { getEmbeddingProgress, startBulkEmbedding, pollEmbeddingProgress } from '@/lib/api'
import { EmbeddingProgress, EmbeddingBatchStatus, EmbeddingProgressTrackingProps } from '@/types/vector'

const ProgressCard: React.FC<{
  progress: EmbeddingProgress
  onRetry?: (documentId: string) => void
}> = ({ progress, onRetry }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success-600 bg-success-50 border-success-200'
      case 'processing':
        return 'text-primary-600 bg-primary-50 border-primary-200'
      case 'failed':
        return 'text-error-600 bg-error-50 border-error-200'
      case 'paused':
        return 'text-warning-600 bg-warning-50 border-warning-200'
      case 'queued':
      default:
        return 'text-neutral-600 bg-neutral-50 border-neutral-200'
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString()
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.round((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  const formatSpeed = (speed?: number) => {
    if (!speed) return 'N/A'
    return `${speed.toFixed(1)} chunks/s`
  }

  const formatETA = (seconds?: number) => {
    if (!seconds) return 'Unknown'
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-neutral-900 truncate">
              {progress.filename}
            </h4>
            <p className="text-xs text-neutral-500 mt-1">
              ID: {progress.document_id.substring(0, 8)}...
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(progress.status)}`}>
              {progress.status}
            </span>
            {progress.status === 'failed' && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(progress.document_id)}
                className="text-xs"
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-700">
                {progress.completed_chunks} of {progress.total_chunks} chunks
              </span>
              <span className="font-medium text-neutral-900">
                {progress.progress_percentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={progress.progress_percentage} 
              max={100} 
              className={`h-2 ${
                progress.status === 'failed' ? 'bg-error-100' :
                progress.status === 'completed' ? 'bg-success-100' :
                'bg-primary-100'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-neutral-600">Started</p>
              <p className="font-medium text-neutral-900">{formatTime(progress.started_at)}</p>
            </div>
            {progress.completed_at && (
              <div>
                <p className="text-neutral-600">Completed</p>
                <p className="font-medium text-neutral-900">{formatTime(progress.completed_at)}</p>
              </div>
            )}
            {progress.status === 'processing' && (
              <>
                <div>
                  <p className="text-neutral-600">Speed</p>
                  <p className="font-medium text-neutral-900">{formatSpeed(progress.processing_speed_chunks_per_second)}</p>
                </div>
                <div>
                  <p className="text-neutral-600">ETA</p>
                  <p className="font-medium text-neutral-900">{formatETA(progress.estimated_time_remaining)}</p>
                </div>
              </>
            )}
            {(progress.status === 'completed' || progress.status === 'failed') && (
              <div>
                <p className="text-neutral-600">Duration</p>
                <p className="font-medium text-neutral-900">
                  {formatDuration(progress.started_at, progress.completed_at)}
                </p>
              </div>
            )}
          </div>

          {progress.current_chunk_index !== undefined && progress.status === 'processing' && (
            <div className="text-xs text-neutral-600">
              Currently processing chunk {progress.current_chunk_index + 1}
            </div>
          )}

          {progress.failed_chunks > 0 && (
            <div className="text-xs text-error-600">
              {progress.failed_chunks} chunks failed to process
            </div>
          )}

          {progress.error_message && (
            <Alert className="border-error-200 bg-error-50">
              <AlertDescription className="text-error-800 text-xs">
                <strong>Error:</strong> {progress.error_message}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const BatchOverview: React.FC<{
  batchStatus: EmbeddingBatchStatus
  onStartBatch?: (documentIds: string[]) => void
  onPauseBatch?: () => void
  onResumeBatch?: () => void
}> = ({ batchStatus, onStartBatch, onPauseBatch, onResumeBatch }) => {
  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.round((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success-600 bg-success-50 border-success-200'
      case 'processing':
        return 'text-primary-600 bg-primary-50 border-primary-200'
      case 'failed':
        return 'text-error-600 bg-error-50 border-error-200'
      case 'paused':
        return 'text-warning-600 bg-warning-50 border-warning-200'
      case 'queued':
      default:
        return 'text-neutral-600 bg-neutral-50 border-neutral-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Batch Progress Overview</CardTitle>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border ${getStatusColor(batchStatus.overall_status)}`}>
              {batchStatus.overall_status}
            </span>
            {batchStatus.overall_status === 'processing' && onPauseBatch && (
              <Button size="sm" variant="outline" onClick={onPauseBatch}>
                Pause
              </Button>
            )}
            {batchStatus.overall_status === 'paused' && onResumeBatch && (
              <Button size="sm" onClick={onResumeBatch}>
                Resume
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-700">
                {batchStatus.completed_documents} of {batchStatus.total_documents} documents
              </span>
              <span className="font-medium text-neutral-900">
                {batchStatus.overall_progress.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={batchStatus.overall_progress} 
              max={100} 
              className="h-3"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-neutral-50 rounded-lg">
              <p className="text-lg font-bold text-neutral-900">{batchStatus.total_documents}</p>
              <p className="text-xs text-neutral-600">Total Documents</p>
            </div>
            <div className="text-center p-3 bg-success-50 rounded-lg">
              <p className="text-lg font-bold text-success-600">{batchStatus.completed_documents}</p>
              <p className="text-xs text-neutral-600">Completed</p>
            </div>
            <div className="text-center p-3 bg-error-50 rounded-lg">
              <p className="text-lg font-bold text-error-600">{batchStatus.failed_documents}</p>
              <p className="text-xs text-neutral-600">Failed</p>
            </div>
            <div className="text-center p-3 bg-primary-50 rounded-lg">
              <p className="text-lg font-bold text-primary-600">
                {batchStatus.total_documents - batchStatus.completed_documents - batchStatus.failed_documents}
              </p>
              <p className="text-xs text-neutral-600">Remaining</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-600">Batch ID</p>
              <p className="font-mono text-neutral-900">{batchStatus.batch_id}</p>
            </div>
            <div>
              <p className="text-neutral-600">Started</p>
              <p className="text-neutral-900">{new Date(batchStatus.started_at).toLocaleString()}</p>
            </div>
            {batchStatus.completed_at && (
              <>
                <div>
                  <p className="text-neutral-600">Completed</p>
                  <p className="text-neutral-900">{new Date(batchStatus.completed_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-neutral-600">Duration</p>
                  <p className="text-neutral-900">{formatDuration(batchStatus.started_at, batchStatus.completed_at)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const EmbeddingProgressTracking: React.FC<EmbeddingProgressTrackingProps> = ({
  documentIds,
  showBatchProgress = true,
  refreshInterval = 3000,
  onProgressComplete
}) => {
  const [batchStatus, setBatchStatus] = useState<EmbeddingBatchStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const fetchProgress = async () => {
    try {
      const progress = await getEmbeddingProgress(documentIds)
      setBatchStatus(progress)
      setError(null)

      // Check if any documents completed and notify
      progress.documents.forEach(doc => {
        if (doc.status === 'completed') {
          onProgressComplete?.(doc.document_id)
        }
      })
    } catch (err: any) {
      setError(err.message || 'Failed to fetch embedding progress')
    } finally {
      setLoading(false)
    }
  }

  const startPolling = () => {
    if (documentIds && documentIds.length > 0) {
      setIsPolling(true)
      pollEmbeddingProgress(
        documentIds,
        (progress) => {
          setBatchStatus(progress)
          // Check for completed documents
          progress.documents.forEach(doc => {
            if (doc.status === 'completed') {
              onProgressComplete?.(doc.document_id)
            }
          })
        },
        refreshInterval
      ).then(() => {
        setIsPolling(false)
      }).catch((err) => {
        setError(err.message || 'Polling failed')
        setIsPolling(false)
      })
    }
  }

  const handleRetry = async (documentId: string) => {
    try {
      await startBulkEmbedding({
        document_ids: [documentId],
        force_reprocess: true
      })
      // Restart polling to track the retry
      startPolling()
    } catch (err: any) {
      setError(err.message || 'Failed to retry embedding')
    }
  }

  const handleRefresh = () => {
    fetchProgress()
  }

  useEffect(() => {
    fetchProgress()
  }, [documentIds])

  useEffect(() => {
    if (refreshInterval > 0 && batchStatus && 
        (batchStatus.overall_status === 'processing' || batchStatus.overall_status === 'queued')) {
      const interval = setInterval(fetchProgress, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, batchStatus?.overall_status])

  if (loading && !batchStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Embedding Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-neutral-600">Loading progress...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!batchStatus || batchStatus.documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Embedding Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-neutral-600">No embedding progress to track</p>
            <p className="text-sm text-neutral-500 mt-2">
              Start document processing to see embedding progress here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-error-200 bg-error-50">
          <AlertDescription className="text-error-800">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={handleRefresh}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showBatchProgress && (
        <BatchOverview
          batchStatus={batchStatus}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Document Progress</CardTitle>
          <div className="flex items-center space-x-2">
            {isPolling && (
              <div className="flex items-center text-sm text-neutral-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                Live updates
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {batchStatus.documents.map((progress) => (
              <ProgressCard
                key={progress.document_id}
                progress={progress}
                onRetry={handleRetry}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}