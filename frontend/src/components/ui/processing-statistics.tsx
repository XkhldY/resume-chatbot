'use client'

import React from 'react'
import { Card } from './card'
import { Progress } from './progress'
import { ProcessingStatistics, ProcessingResult } from '@/types/document'
import {
  ArrowTrendingUpIcon as TrendingUp,
  ClockIcon as Clock,
  CheckCircleIcon as CheckCircle,
  QuestionMarkCircleIcon as XCircle,
  QuestionMarkCircleIcon as AlertTriangle,
  DocumentTextIcon as FileText,
  QuestionMarkCircleIcon as Zap,
  QuestionMarkCircleIcon as BarChart3
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface ProcessingStatisticsProps {
  statistics: ProcessingStatistics
  recentResults?: ProcessingResult[]
  showDetails?: boolean
  className?: string
}

export function ProcessingStatisticsDisplay({ 
  statistics, 
  recentResults = [], 
  showDetails = true,
  className 
}: ProcessingStatisticsProps) {
  const formatProcessingTime = (seconds: number) => {
    if (seconds < 1) return '< 1s'
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  }

  const getSuccessRate = () => {
    if (statistics.total_documents === 0) return 0
    return Math.round((statistics.processed_successfully / statistics.total_documents) * 100)
  }

  const getPerformanceRating = () => {
    const successRate = getSuccessRate()
    if (successRate >= 95) return { rating: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50' }
    if (successRate >= 85) return { rating: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-50' }
    if (successRate >= 70) return { rating: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
    return { rating: 'Poor', color: 'text-red-600', bgColor: 'bg-red-50' }
  }

  const performance = getPerformanceRating()

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold">{statistics.total_documents}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Successfully Processed</p>
              <p className="text-2xl font-bold text-green-600">{statistics.processed_successfully}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{statistics.failed_processing}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold">{getSuccessRate()}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Performance Overview */}
      <Card className="p-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Overview
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Performance</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${performance.color} ${performance.bgColor}`}>
              {performance.rating}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span>{getSuccessRate()}%</span>
            </div>
            <Progress value={getSuccessRate()} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="font-medium">Average Processing Time:</span>
              </div>
              <span className="text-gray-600 pl-6">
                {formatProcessingTime(statistics.average_processing_time)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-400" />
                <span className="font-medium">Total Processing Time:</span>
              </div>
              <span className="text-gray-600 pl-6">
                {formatProcessingTime(statistics.total_processing_time)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Detailed Statistics */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Error Statistics */}
          <Card className="p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Error Analysis
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {statistics.documents_with_errors}
                  </p>
                  <p className="text-xs text-gray-600">Documents with Errors</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {statistics.documents_with_warnings}
                  </p>
                  <p className="text-xs text-gray-600">Documents with Warnings</p>
                </div>
              </div>

              {statistics.documents_with_errors > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Error Rate</span>
                  <div className="flex justify-between text-sm">
                    <span>
                      {statistics.total_documents > 0 
                        ? Math.round((statistics.documents_with_errors / statistics.total_documents) * 100)
                        : 0
                      }%
                    </span>
                    <span className="text-gray-600">
                      {statistics.documents_with_errors} of {statistics.total_documents}
                    </span>
                  </div>
                  <Progress 
                    value={statistics.total_documents > 0 
                      ? (statistics.documents_with_errors / statistics.total_documents) * 100
                      : 0
                    } 
                    variant="error" 
                    className="h-2" 
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Performance Metrics
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Average Processing Time:</span>
                  <span className="text-gray-600">
                    {formatProcessingTime(statistics.average_processing_time)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Total Processing Time:</span>
                  <span className="text-gray-600">
                    {formatProcessingTime(statistics.total_processing_time)}
                  </span>
                </div>

                {statistics.total_documents > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium">Throughput:</span>
                    <span className="text-gray-600">
                      {(statistics.total_documents / (statistics.total_processing_time / 60)).toFixed(1)} docs/min
                    </span>
                  </div>
                )}
              </div>

              {/* Performance Trend Indicator */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Processing Efficiency</span>
                  <span className={cn(
                    "text-sm font-medium",
                    statistics.average_processing_time < 5 ? "text-green-600" :
                    statistics.average_processing_time < 15 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {statistics.average_processing_time < 5 ? "Fast" :
                     statistics.average_processing_time < 15 ? "Average" : "Slow"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <Card className="p-6">
          <h3 className="font-medium mb-4">Recent Processing Results</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentResults.slice(0, 10).map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {result.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : result.status === 'error' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="font-medium text-sm">{result.filename}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>{formatProcessingTime(result.processing_time)}</span>
                  {result.chunk_count && (
                    <span>{result.chunk_count} chunks</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}