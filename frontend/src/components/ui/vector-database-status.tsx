'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './card'
import { Alert, AlertDescription } from './alert'
import { Button } from './button'
import { Progress } from './progress'
import { getVectorDatabaseHealth, getVectorDatabaseStats } from '@/lib/api'
import { VectorDatabaseHealth, VectorDatabaseStats, VectorDatabaseStatusProps } from '@/types/vector'

const StatusBadge: React.FC<{ status: string; label: string }> = ({ status, label }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'bg-success-100 text-success-800 border-success-200'
      case 'degraded':
        return 'bg-warning-100 text-warning-800 border-warning-200'
      case 'unhealthy':
      case 'disconnected':
      case 'error':
        return 'bg-error-100 text-error-800 border-error-200'
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200'
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium border ${getStatusColor(status)}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${
        status === 'healthy' || status === 'connected' ? 'bg-success-500' :
        status === 'degraded' ? 'bg-warning-500' :
        status === 'unhealthy' || status === 'disconnected' || status === 'error' ? 'bg-error-500' :
        'bg-neutral-500'
      }`} />
      {label}
    </span>
  )
}

const MetricCard: React.FC<{ title: string; value: string | number; subtitle?: string; trend?: 'up' | 'down' | 'stable' }> = ({ 
  title, 
  value, 
  subtitle, 
  trend 
}) => (
  <div className="bg-white rounded-lg border border-neutral-200 p-4">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      {trend && (
        <div className={`text-sm font-medium ${
          trend === 'up' ? 'text-success-600' :
          trend === 'down' ? 'text-error-600' :
          'text-neutral-600'
        }`}>
          {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
        </div>
      )}
    </div>
    <div className="mt-2">
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
    </div>
  </div>
)

export const VectorDatabaseStatus: React.FC<VectorDatabaseStatusProps> = ({
  refreshInterval = 30000, // 30 seconds
  showDetailedMetrics = true,
  onConnectionError
}) => {
  const [health, setHealth] = useState<VectorDatabaseHealth | null>(null)
  const [stats, setStats] = useState<VectorDatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchHealth = async () => {
    try {
      const healthData = await getVectorDatabaseHealth()
      setHealth(healthData)
      setError(null)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch vector database health'
      setError(errorMessage)
      onConnectionError?.(errorMessage)
    }
  }

  const fetchStats = async () => {
    if (!showDetailedMetrics) return
    
    try {
      const statsData = await getVectorDatabaseStats()
      setStats(statsData)
    } catch (err: any) {
      console.warn('Failed to fetch detailed stats:', err.message)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchHealth(), fetchStats()])
    setLoading(false)
    setLastRefresh(new Date())
  }

  const handleRefresh = () => {
    fetchData()
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatMemoryUsage = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb.toFixed(0)} MB`
  }

  if (loading && !health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vector Database Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-neutral-600">Loading database status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vector Database Status</CardTitle>
          <div className="flex items-center space-x-2">
            {lastRefresh && (
              <span className="text-sm text-neutral-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
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
          {error && (
            <Alert className="mb-4 border-error-200 bg-error-50">
              <AlertDescription className="text-error-800">
                <strong>Connection Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {health && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <StatusBadge status={health.status} label={`Database ${health.status}`} />
                <StatusBadge status={health.chroma_status} label={`ChromaDB ${health.chroma_status}`} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Version"
                  value={health.version}
                  subtitle={`${health.host}:${health.port}`}
                />
                <MetricCard
                  title="Response Time"
                  value={`${health.response_time_ms}ms`}
                  trend={health.response_time_ms < 100 ? 'up' : health.response_time_ms > 500 ? 'down' : 'stable'}
                />
                <MetricCard
                  title="Last Heartbeat"
                  value={new Date(health.last_heartbeat).toLocaleTimeString()}
                />
                {health.error_message && (
                  <div className="col-span-full">
                    <Alert className="border-error-200 bg-error-50">
                      <AlertDescription className="text-error-800">
                        {health.error_message}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showDetailedMetrics && stats && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Database Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Memory Usage"
                  value={formatMemoryUsage(stats.database_info.memory_usage_mb)}
                  subtitle={`${formatMemoryUsage(stats.database_info.disk_usage_mb)} disk`}
                />
                <MetricCard
                  title="CPU Usage"
                  value={`${stats.database_info.cpu_usage_percent.toFixed(1)}%`}
                />
                <MetricCard
                  title="Uptime"
                  value={formatUptime(stats.database_info.uptime_seconds)}
                />
                <MetricCard
                  title="Cache Hit Rate"
                  value={`${(stats.performance_metrics.cache_hit_rate * 100).toFixed(1)}%`}
                  trend={stats.performance_metrics.cache_hit_rate > 0.8 ? 'up' : 'down'}
                />
              </div>
              
              <div className="mt-6">
                <h4 className="text-lg font-medium text-neutral-900 mb-4">Performance Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard
                    title="Average Search Time"
                    value={`${stats.performance_metrics.average_search_time_ms.toFixed(1)}ms`}
                    subtitle={`${stats.performance_metrics.total_searches.toLocaleString()} total searches`}
                  />
                  <MetricCard
                    title="Average Insert Time"
                    value={`${stats.performance_metrics.average_insert_time_ms.toFixed(1)}ms`}
                    subtitle={`${stats.performance_metrics.total_inserts.toLocaleString()} total inserts`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collection Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  title="Total Collections"
                  value={stats.collection_summary.total_collections}
                />
                <MetricCard
                  title="Total Documents"
                  value={stats.collection_summary.total_documents.toLocaleString()}
                />
                <MetricCard
                  title="Total Vectors"
                  value={stats.collection_summary.total_vectors.toLocaleString()}
                />
                <MetricCard
                  title="Storage Size"
                  value={formatMemoryUsage(stats.collection_summary.total_size_bytes / (1024 * 1024))}
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-medium text-neutral-900">Recent Activity</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard
                    title="Searches (Last Hour)"
                    value={stats.recent_activity.searches_last_hour}
                  />
                  <MetricCard
                    title="Embeddings (Last Hour)"
                    value={stats.recent_activity.embeddings_last_hour}
                  />
                  <MetricCard
                    title="Errors (Last Hour)"
                    value={stats.recent_activity.errors_last_hour}
                    trend={stats.recent_activity.errors_last_hour === 0 ? 'up' : 'down'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}