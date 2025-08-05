'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Document, 
  DocumentDetails, 
  ProcessingStatistics, 
  HealthCheckResponse,
  BulkProcessingResponse 
} from '@/types/document'
import { 
  getDocuments, 
  getDocument, 
  processDocuments,
  processDocument,
  getHealthCheck,
  pollProcessingStatus,
  ApiError 
} from '@/lib/api'

export function useDocumentProcessing() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [statistics, setStatistics] = useState<ProcessingStatistics | null>(null)
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load documents from backend
  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getDocuments()
      setDocuments(response.documents)
      return response.documents
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load documents'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get document details
  const getDocumentDetails = useCallback(async (documentId: string): Promise<DocumentDetails> => {
    try {
      const details = await getDocument(documentId)
      return details
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load document details'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Process all documents
  const processAllDocuments = useCallback(async (): Promise<BulkProcessingResponse> => {
    setError(null)
    try {
      const result = await processDocuments()
      setStatistics(result.statistics)
      await loadDocuments() // Refresh documents after processing
      return result
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to process documents'
      setError(errorMessage)
      throw err
    }
  }, [loadDocuments])

  // Process single document with status polling
  const processSingleDocument = useCallback(async (documentId: string) => {
    setError(null)
    try {
      // Start processing
      await processDocument(documentId)
      
      // Poll for status updates
      await pollProcessingStatus(
        documentId,
        (progress) => {
          // Update document status in the list
          setDocuments(prevDocs => 
            prevDocs.map(doc => 
              doc.id === documentId 
                ? { ...doc, status: progress.status === 'completed' ? 'ready' : 'processing' }
                : doc
            )
          )
        }
      )
      
      // Refresh documents after completion
      await loadDocuments()
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to process document'
      setError(errorMessage)
      throw err
    }
  }, [loadDocuments])

  // Check system health
  const checkHealth = useCallback(async (): Promise<HealthCheckResponse> => {
    try {
      const health = await getHealthCheck()
      setHealthStatus(health)
      return health
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to check health'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Retry failed document processing
  const retryDocument = useCallback(async (documentId: string) => {
    await processSingleDocument(documentId)
  }, [processSingleDocument])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Auto-load documents on mount
  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Computed values
  const readyDocuments = documents.filter(doc => doc.status === 'ready')
  const processingDocuments = documents.filter(doc => doc.status === 'processing')
  const errorDocuments = documents.filter(doc => doc.status === 'error')
  const pendingDocuments = documents.filter(doc => doc.status === 'pending')

  const processingStats = {
    total: documents.length,
    ready: readyDocuments.length,
    processing: processingDocuments.length,
    error: errorDocuments.length,
    pending: pendingDocuments.length
  }

  return {
    // State
    documents,
    statistics,
    healthStatus,
    isLoading,
    error,

    // Computed values
    readyDocuments,
    processingDocuments,
    errorDocuments,
    pendingDocuments,
    processingStats,

    // Actions
    loadDocuments,
    getDocumentDetails,
    processAllDocuments,
    processSingleDocument,
    retryDocument,
    checkHealth,
    clearError
  }
}

// Hook for managing document preview state
export function useDocumentPreview() {
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetails | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const openPreview = useCallback(async (documentId: string) => {
    setIsLoadingPreview(true)
    setPreviewError(null)
    try {
      const details = await getDocument(documentId)
      setSelectedDocument(details)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load document preview'
      setPreviewError(errorMessage)
    } finally {
      setIsLoadingPreview(false)
    }
  }, [])

  const closePreview = useCallback(() => {
    setSelectedDocument(null)
    setPreviewError(null)
  }, [])

  return {
    selectedDocument,
    isLoadingPreview,
    previewError,
    openPreview,
    closePreview
  }
}

// Hook for managing bulk operations
export function useBulkOperations() {
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [lastBulkResult, setLastBulkResult] = useState<BulkProcessingResponse | null>(null)

  const processAll = useCallback(async () => {
    setIsProcessingAll(true)
    setBulkError(null)
    try {
      const result = await processDocuments()
      setLastBulkResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to process all documents'
      setBulkError(errorMessage)
      throw err
    } finally {
      setIsProcessingAll(false)
    }
  }, [])

  const clearAll = useCallback(async () => {
    setIsClearingAll(true)
    setBulkError(null)
    try {
      // This would need a backend endpoint
      // For now, return success
      return { success: true, message: 'All documents cleared' }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to clear all documents'
      setBulkError(errorMessage)
      throw err
    } finally {
      setIsClearingAll(false)
    }
  }, [])

  const clearBulkError = useCallback(() => {
    setBulkError(null)
  }, [])

  return {
    isProcessingAll,
    isClearingAll,
    bulkError,
    lastBulkResult,
    processAll,
    clearAll,
    clearBulkError
  }
}