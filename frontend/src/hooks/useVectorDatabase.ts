'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  VectorDatabaseHealth,
  VectorCollectionStats,
  VectorSearchQuery,
  VectorSearchResponse,
  DocumentChunk,
  EmbeddingBatchStatus,
  VectorDatabaseStats,
  VectorCollection
} from '@/types/vector'
import { 
  getVectorDatabaseHealth,
  getVectorCollections,
  getDocumentChunks,
  vectorSearch,
  getVectorDatabaseStats,
  getEmbeddingProgress,
  pollEmbeddingProgress,
  ApiError 
} from '@/lib/api'

export function useVectorDatabaseHealth(refreshInterval?: number) {
  const [health, setHealth] = useState<VectorDatabaseHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const healthData = await getVectorDatabaseHealth()
      setHealth(healthData)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch vector database health'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchHealth, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchHealth])

  return { health, loading, error, lastUpdated, refetch: fetchHealth }
}

export function useVectorCollections() {
  const [collections, setCollections] = useState<VectorCollection[]>([])
  const [stats, setStats] = useState<VectorCollectionStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const collectionsData = await getVectorCollections()
      setCollections(collectionsData.collections)
      setStats(collectionsData)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch collections'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  return { collections, stats, loading, error, refetch: fetchCollections }
}

export function useVectorSearch() {
  const [results, setResults] = useState<VectorSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchHistory, setSearchHistory] = useState<VectorSearchResponse[]>([])

  const search = useCallback(async (query: VectorSearchQuery) => {
    setLoading(true)
    setError(null)
    try {
      const searchResults = await vectorSearch(query)
      setResults(searchResults)
      setSearchHistory(prev => [searchResults, ...prev.slice(0, 9)]) // Keep last 10 searches
      return searchResults
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Search failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults(null)
    setError(null)
  }, [])

  const clearHistory = useCallback(() => {
    setSearchHistory([])
  }, [])

  return { 
    results, 
    loading, 
    error, 
    searchHistory, 
    search, 
    clearResults, 
    clearHistory 
  }
}

export function useDocumentChunks(documentId?: string, pageSize: number = 20) {
  const [chunks, setChunks] = useState<DocumentChunk[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalChunks, setTotalChunks] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchChunks = useCallback(async (page: number = 1, search?: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await getDocumentChunks(documentId, page, pageSize, search)
      setChunks(response.chunks)
      setTotalChunks(response.total)
      setCurrentPage(response.page)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch chunks'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [documentId, pageSize])

  const searchChunks = useCallback(async (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
    await fetchChunks(1, query)
  }, [fetchChunks])

  const loadPage = useCallback(async (page: number) => {
    await fetchChunks(page, searchQuery)
  }, [fetchChunks, searchQuery])

  useEffect(() => {
    fetchChunks()
  }, [fetchChunks])

  const totalPages = Math.ceil(totalChunks / pageSize)

  return { 
    chunks, 
    loading, 
    error, 
    currentPage, 
    totalPages, 
    totalChunks,
    searchQuery,
    searchChunks, 
    loadPage, 
    refetch: () => fetchChunks(currentPage, searchQuery) 
  }
}

export function useEmbeddingProgress(documentIds?: string[], refreshInterval: number = 3000) {
  const [progress, setProgress] = useState<EmbeddingBatchStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const fetchProgress = useCallback(async () => {
    if (!documentIds || documentIds.length === 0) return
    
    setLoading(true)
    setError(null)
    try {
      const progressData = await getEmbeddingProgress(documentIds)
      setProgress(progressData)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch embedding progress'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [documentIds])

  const startPolling = useCallback(() => {
    if (!documentIds || documentIds.length === 0) return

    setIsPolling(true)
    pollEmbeddingProgress(
      documentIds,
      (progressData) => setProgress(progressData),
      refreshInterval
    ).then(() => {
      setIsPolling(false)
    }).catch((err) => {
      const errorMessage = err instanceof ApiError ? err.message : 'Polling failed'
      setError(errorMessage)
      setIsPolling(false)
    })
  }, [documentIds, refreshInterval])

  const stopPolling = useCallback(() => {
    setIsPolling(false)
  }, [])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return { 
    progress, 
    loading, 
    error, 
    isPolling, 
    fetchProgress, 
    startPolling, 
    stopPolling 
  }
}

export function useVectorDatabaseStats(refreshInterval?: number) {
  const [stats, setStats] = useState<VectorDatabaseStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const statsData = await getVectorDatabaseStats()
      setStats(statsData)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch database stats'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}

// Combined hook for comprehensive vector database management
export function useVectorDatabase(options?: {
  healthRefreshInterval?: number
  statsRefreshInterval?: number
  embeddingRefreshInterval?: number
  documentIds?: string[]
}) {
  const health = useVectorDatabaseHealth(options?.healthRefreshInterval)
  const collections = useVectorCollections()
  const search = useVectorSearch()
  const stats = useVectorDatabaseStats(options?.statsRefreshInterval)
  const embedding = useEmbeddingProgress(options?.documentIds, options?.embeddingRefreshInterval)

  const isHealthy = health.health?.status === 'healthy' && health.health?.chroma_status === 'connected'
  const isLoading = health.loading || collections.loading || stats.loading
  const hasErrors = !!(health.error || collections.error || stats.error || embedding.error)

  const refreshAll = useCallback(() => {
    health.refetch()
    collections.refetch()
    stats.refetch()
    embedding.fetchProgress()
  }, [health, collections, stats, embedding])

  return {
    health,
    collections,
    search,
    stats,
    embedding,
    isHealthy,
    isLoading,
    hasErrors,
    refreshAll
  }
}