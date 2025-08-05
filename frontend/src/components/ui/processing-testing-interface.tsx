'use client'

import React, { useState, useEffect } from 'react'
import { Card } from './card'
import { Button } from './button'
import { Alert } from './alert'
import { Progress } from './progress'
import { 
  ProcessingStatistics, 
  HealthCheckResponse, 
  BulkProcessingResponse 
} from '@/types/document'
import {
  PlayIcon as Play,
  QuestionMarkCircleIcon as Trash2,
  QuestionMarkCircleIcon as Activity,
  ArrowPathIcon as RefreshCw,
  ExclamationCircleIcon as AlertCircle,
  CheckCircleIcon as CheckCircle,
  ClockIcon as Clock,
  QuestionMarkCircleIcon as Zap,
  QuestionMarkCircleIcon as Database,
  QuestionMarkCircleIcon as Server,
  DocumentTextIcon as FileText,
  ArrowTrendingUpIcon as TrendingUp,
  CogIcon as Settings
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface ProcessingTestingInterfaceProps {
  onProcessAll: () => Promise<BulkProcessingResponse>
  onClearAll: () => Promise<{ success: boolean; message: string }>
  onHealthCheck: () => Promise<HealthCheckResponse>
  statistics?: ProcessingStatistics
  healthStatus?: HealthCheckResponse
}

export function ProcessingTestingInterface({
  onProcessAll,
  onClearAll,
  onHealthCheck,
  statistics,
  healthStatus: initialHealthStatus
}: ProcessingTestingInterfaceProps) {
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | undefined>(initialHealthStatus)
  const [lastProcessingResult, setLastProcessingResult] = useState<BulkProcessingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setHealthStatus(initialHealthStatus)
  }, [initialHealthStatus])

  const handleProcessAll = async () => {
    setIsProcessingAll(true)
    setError(null)
    try {
      const result = await onProcessAll()
      setLastProcessingResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process documents')
    } finally {
      setIsProcessingAll(false)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all processed documents? This action cannot be undone.')) {
      return
    }
    
    setIsClearingAll(true)
    setError(null)
    try {
      await onClearAll()
      setLastProcessingResult(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear documents')
    } finally {
      setIsClearingAll(false)
    }
  }

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true)
    setError(null)
    try {
      const result = await onHealthCheck()
      setHealthStatus(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check health status')
    } finally {
      setIsCheckingHealth(false)
    }
  }

  const getHealthStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getHealthStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatProcessingTime = (seconds: number) => {
    if (seconds < 1) return '< 1s'
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  }

  const getSuccessRate = () => {
    if (!statistics) return 0
    if (statistics.total_documents === 0) return 0
    return Math.round((statistics.processed_successfully / statistics.total_documents) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-blue-500" />
        <h2 className="text-xl font-semibold">Processing Test Interface</h2>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-medium">Operation Failed</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </Alert>
      )}

      {/* Control Panel */}
      <Card className="p-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Bulk Operations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Button
              onClick={handleProcessAll}
              disabled={isProcessingAll}
              className="w-full"
              size="lg"
            >
              {isProcessingAll ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Process All Documents
                </>
              )}
            </Button>
            <p className="text-xs text-gray-600">
              Process all documents in the folder
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleClearAll}
              disabled={isClearingAll}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {isClearingAll ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </>
              )}
            </Button>
            <p className="text-xs text-gray-600">
              Remove all processed documents
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleHealthCheck}
              disabled={isCheckingHealth}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {isCheckingHealth ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Health Check
                </>
              )}
            </Button>
            <p className="text-xs text-gray-600">
              Check system health status
            </p>
          </div>
        </div>
      </Card>

      {/* Health Status */}
      {healthStatus && (
        <Card className="p-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Server className="h-4 w-4" />
            System Health
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getHealthStatusIcon(healthStatus.status)}
                <span className="font-medium">Overall Status</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getHealthStatusColor(healthStatus.status)}`}>
                {healthStatus.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Uptime:</span>
                </div>
                <span className="text-gray-600">{formatUptime(healthStatus.uptime)}</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Database:</span>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded text-xs",
                  healthStatus.database_status === 'connected' ? 'bg-green-100 text-green-800' :
                  healthStatus.database_status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                )}>
                  {healthStatus.database_status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Vector Store:</span>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded text-xs",
                  healthStatus.vector_store_status === 'connected' ? 'bg-green-100 text-green-800' :
                  healthStatus.vector_store_status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                )}>
                  {healthStatus.vector_store_status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Processing:</span>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded text-xs",
                  healthStatus.document_processing_status === 'active' ? 'bg-green-100 text-green-800' :
                  healthStatus.document_processing_status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                )}>
                  {healthStatus.document_processing_status}
                </span>
              </div>
            </div>

            {healthStatus.statistics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {healthStatus.statistics.total_documents}
                  </p>
                  <p className="text-xs text-gray-600">Total Documents</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {healthStatus.statistics.documents_ready}
                  </p>
                  <p className="text-xs text-gray-600">Ready</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {healthStatus.statistics.documents_processing}
                  </p>
                  <p className="text-xs text-gray-600">Processing</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {healthStatus.statistics.documents_with_errors}
                  </p>
                  <p className="text-xs text-gray-600">Errors</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Processing Statistics */}
      {statistics && (
        <Card className="p-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Processing Statistics
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">
                  {statistics.total_documents}
                </p>
                <p className="text-sm text-gray-600">Total Documents</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {statistics.processed_successfully}
                </p>
                <p className="text-sm text-gray-600">Successful</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">
                  {statistics.failed_processing}
                </p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">
                  {getSuccessRate()}%
                </p>
                <p className="text-sm text-gray-600">Success Rate</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span>{getSuccessRate()}%</span>
              </div>
              <Progress value={getSuccessRate()} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Average Processing Time:</span>
                <span className="ml-2 text-gray-600">
                  {formatProcessingTime(statistics.average_processing_time)}
                </span>
              </div>
              <div>
                <span className="font-medium">Total Processing Time:</span>
                <span className="ml-2 text-gray-600">
                  {formatProcessingTime(statistics.total_processing_time)}
                </span>
              </div>
              <div>
                <span className="font-medium">Documents with Errors:</span>
                <span className="ml-2 text-gray-600">
                  {statistics.documents_with_errors}
                </span>
              </div>
              <div>
                <span className="font-medium">Documents with Warnings:</span>
                <span className="ml-2 text-gray-600">
                  {statistics.documents_with_warnings}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Last Processing Result */}
      {lastProcessingResult && (
        <Card className="p-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Last Processing Results
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{lastProcessingResult.message}</span>
              <span className="text-sm text-gray-600">
                {new Date(lastProcessingResult.processing_started_at).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {lastProcessingResult.statistics.processed_successfully}
                </p>
                <p className="text-xs text-gray-600">Successful</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {lastProcessingResult.statistics.failed_processing}
                </p>
                <p className="text-xs text-gray-600">Failed</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {formatProcessingTime(lastProcessingResult.statistics.total_processing_time)}
                </p>
                <p className="text-xs text-gray-600">Total Time</p>
              </div>
            </div>

            {lastProcessingResult.results.some(r => r.status === 'error') && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Failed Documents:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {lastProcessingResult.results
                    .filter(r => r.status === 'error')
                    .map((result, index) => (
                      <div key={index} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                        <span className="font-medium">{result.filename}:</span>
                        <span className="ml-2 text-red-600">{result.error_message}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}