/**
 * Analytics Dashboard Component
 * 
 * Comprehensive analytics dashboard showing usage statistics,
 * system performance, and user engagement metrics.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { ChartBarIcon, DocumentIcon, ChatBubbleLeftIcon, ClockIcon } from '@heroicons/react/24/outline'

interface AnalyticsData {
  usage: {
    totalDocuments: number
    totalConversations: number
    totalMessages: number
    activeUsers: number
  }
  performance: {
    avgResponseTime: number
    avgProcessingTime: number
    systemUptime: number
    errorRate: number
  }
  trends: {
    documentsProcessed: Array<{ date: string; count: number }>
    messagesPerDay: Array<{ date: string; count: number }>
    popularDocuments: Array<{ filename: string; accessCount: number }>
  }
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [dateRange, setDateRange] = useState('7d')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalyticsData()
  }, [dateRange])

  const loadAnalyticsData = async () => {
    setIsLoading(true)
    try {
      // API calls to analytics endpoints
      // const [usage, performance, trends] = await Promise.all([
      //   fetch('/api/analytics/usage/summary').then(r => r.json()),
      //   fetch('/api/analytics/system/performance').then(r => r.json()),
      //   fetch('/api/analytics/trends').then(r => r.json())
      // ])
      
      // Mock data for demonstration
      setData({
        usage: {
          totalDocuments: 1247,
          totalConversations: 3482,
          totalMessages: 15670,
          activeUsers: 127
        },
        performance: {
          avgResponseTime: 1.2,
          avgProcessingTime: 3.4,
          systemUptime: 99.8,
          errorRate: 0.2
        },
        trends: {
          documentsProcessed: [
            { date: '2024-01-01', count: 45 },
            { date: '2024-01-02', count: 67 },
            { date: '2024-01-03', count: 52 }
          ],
          messagesPerDay: [
            { date: '2024-01-01', count: 234 },
            { date: '2024-01-02', count: 287 },
            { date: '2024-01-03', count: 195 }
          ],
          popularDocuments: [
            { filename: 'user-manual.pdf', accessCount: 456 },
            { filename: 'api-docs.md', accessCount: 321 },
            { filename: 'faq.docx', accessCount: 289 }
          ]
        }
      })
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Analytics Dashboard</h1>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Documents"
          value={data.usage.totalDocuments.toLocaleString()}
          icon={<DocumentIcon className="h-8 w-8" />}
          color="bg-blue-500"
        />
        <MetricCard
          title="Total Conversations"
          value={data.usage.totalConversations.toLocaleString()}
          icon={<ChatBubbleLeftIcon className="h-8 w-8" />}
          color="bg-green-500"
        />
        <MetricCard
          title="Total Messages"
          value={data.usage.totalMessages.toLocaleString()}
          icon={<ChartBarIcon className="h-8 w-8" />}
          color="bg-purple-500"
        />
        <MetricCard
          title="Active Users"
          value={data.usage.activeUsers.toLocaleString()}
          icon={<ClockIcon className="h-8 w-8" />}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Metrics */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">System Performance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-neutral-700">Average Response Time</span>
              <span className="font-medium">{data.performance.avgResponseTime}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-700">Processing Time</span>
              <span className="font-medium">{data.performance.avgProcessingTime}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-700">System Uptime</span>
              <span className="font-medium text-green-600">{data.performance.systemUptime}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-700">Error Rate</span>
              <span className="font-medium text-red-600">{data.performance.errorRate}%</span>
            </div>
          </div>
        </div>

        {/* Popular Documents */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Most Accessed Documents</h2>
          <div className="space-y-3">
            {data.trends.popularDocuments.map((doc, index) => (
              <div key={doc.filename} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-neutral-100 rounded-full flex items-center justify-center text-sm font-medium text-neutral-600 mr-3">
                    {index + 1}
                  </span>
                  <span className="text-neutral-900 truncate">{doc.filename}</span>
                </div>
                <span className="text-sm text-neutral-500">{doc.accessCount} views</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  color: string
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <div className="flex items-center">
        <div className={`${color} text-white p-3 rounded-lg mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
        </div>
      </div>
    </div>
  )
}