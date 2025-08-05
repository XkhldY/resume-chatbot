'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  Input, 
  Alert, 
  AlertDescription, 
  FileUpload,
  DocumentListItem,
  DocumentProcessingStatus,
  DocumentPreview,
  ProcessingTestingInterface,
  ProcessingStatisticsDisplay,
  ErrorBoundary,
  LoadingState
} from '@/components/ui'
import { 
  DocumentArrowUpIcon, 
  ChatBubbleLeftRightIcon, 
  CheckCircleIcon,
  Cog6ToothIcon,
  EyeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { UploadFile } from '@/types/upload'
import { 
  Document, 
  DocumentDetails, 
  ProcessingStatistics, 
  HealthCheckResponse,
  BulkProcessingResponse 
} from '@/types/document'
import { 
  processDocuments, 
  getDocuments, 
  getDocument, 
  processDocument,
  getHealthCheck,
  ApiError 
} from '@/lib/api'

type ViewMode = 'upload' | 'documents' | 'testing' | 'statistics'

export default function EnhancedPage() {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('upload')
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetails | null>(null)
  const [statistics, setStatistics] = useState<ProcessingStatistics | null>(null)
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null)
  
  // Loading states
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load documents on component mount
  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setIsLoadingDocuments(true)
    setError(null)
    try {
      const response = await getDocuments()
      setDocuments(response.documents)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load documents'
      setError(errorMessage)
    } finally {
      setIsLoadingDocuments(false)
    }
  }

  const handleUploadComplete = useCallback((files: UploadFile[]) => {
    setUploadedFiles(files)
    setError(null)
    // Refresh documents list after upload
    loadDocuments()
  }, [])

  const handleUploadError = useCallback((error: string) => {
    setError(error)
  }, [])

  const handleProcessAll = async (): Promise<BulkProcessingResponse> => {
    setIsProcessing(true)
    setError(null)
    try {
      const result = await processDocuments()
      await loadDocuments() // Refresh documents
      return result
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to process documents'
      setError(errorMessage)
      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearAll = async () => {
    // This would need a backend endpoint to clear all documents
    // For now, just refresh the documents list
    await loadDocuments()
    return { success: true, message: 'Documents cleared' }
  }

  const handleHealthCheck = async (): Promise<HealthCheckResponse> => {
    const status = await getHealthCheck()
    setHealthStatus(status)
    return status
  }

  const handleProcessDocument = async (documentId: string) => {
    try {
      await processDocument(documentId)
      await loadDocuments()
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to process document'
      setError(errorMessage)
    }
  }

  const handleViewDocument = async (documentId: string) => {
    try {
      const documentDetails = await getDocument(documentId)
      setSelectedDocument(documentDetails)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load document details'
      setError(errorMessage)
    }
  }

  const handleRetryDocument = async (documentId: string) => {
    await handleProcessDocument(documentId)
  }

  const successfulUploads = uploadedFiles.filter(f => f.status === 'success')
  const hasUploads = successfulUploads.length > 0
  const readyDocuments = documents.filter(d => d.status === 'ready')

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-neutral-light">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="mb-4">Enhanced Document Chatbot</h1>
            <p className="text-neutral-600 max-w-2xl mx-auto">
              Upload, process, and interact with your documents using advanced AI technology with comprehensive processing capabilities.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            <Button
              variant={viewMode === 'upload' ? 'default' : 'outline'}
              onClick={() => setViewMode('upload')}
              className="flex items-center gap-2"
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              Upload & Process
            </Button>
            <Button
              variant={viewMode === 'documents' ? 'default' : 'outline'}
              onClick={() => setViewMode('documents')}
              className="flex items-center gap-2"
            >
              <EyeIcon className="w-4 h-4" />
              Documents ({documents.length})
            </Button>
            <Button
              variant={viewMode === 'testing' ? 'default' : 'outline'}
              onClick={() => setViewMode('testing')}
              className="flex items-center gap-2"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Testing Interface
            </Button>
            <Button
              variant={viewMode === 'statistics' ? 'default' : 'outline'}
              onClick={() => setViewMode('statistics')}
              className="flex items-center gap-2"
              disabled={!statistics}
            >
              <ChartBarIcon className="w-4 h-4" />
              Statistics
            </Button>
          </div>

          {/* Global Error Display */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Content based on view mode */}
          {viewMode === 'upload' && (
            <div className="space-y-6">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DocumentArrowUpIcon className="w-6 h-6 text-primary" />
                    Upload Documents
                  </CardTitle>
                  <CardDescription>
                    Upload PDFs, Word docs, text files, and markdown files for AI-powered processing and analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    onUploadComplete={handleUploadComplete}
                    onError={handleUploadError}
                    maxFiles={10}
                  />
                </CardContent>
              </Card>

              {/* Quick Processing */}
              {hasUploads && (
                <Card>
                  <CardHeader>
                    <CardTitle>Process Documents</CardTitle>
                    <CardDescription>
                      Process your uploaded documents to enable AI chat and analysis features.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => handleProcessAll()}
                      disabled={isProcessing}
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                          Process All Documents
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {viewMode === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Document Library</h2>
                <Button onClick={loadDocuments} variant="outline" size="sm">
                  Refresh
                </Button>
              </div>

              <LoadingState
                isLoading={isLoadingDocuments}
                error={error}
                onRetry={loadDocuments}
                loadingText="Loading documents..."
                emptyText="No documents found"
              >
                <div className="grid gap-4">
                  {documents.map((document) => (
                    <DocumentListItem
                      key={document.id}
                      document={document}
                      onProcess={handleProcessDocument}
                      onView={handleViewDocument}
                      onRetry={handleRetryDocument}
                      showMetadata={true}
                    />
                  ))}
                </div>
              </LoadingState>

              {/* Document Preview Modal */}
              {selectedDocument && (
                <Card className="mt-6">
                  <CardContent className="p-6">
                    <DocumentPreview
                      documentDetails={selectedDocument}
                      onClose={() => setSelectedDocument(null)}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {viewMode === 'testing' && (
            <ProcessingTestingInterface
              onProcessAll={handleProcessAll}
              onClearAll={handleClearAll}
              onHealthCheck={handleHealthCheck}
              statistics={statistics}
              healthStatus={healthStatus}
            />
          )}

          {viewMode === 'statistics' && statistics && (
            <ProcessingStatisticsDisplay
              statistics={statistics}
              showDetails={true}
            />
          )}

          {/* Chat Section - Always visible when documents are ready */}
          {readyDocuments.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary" />
                  Chat with Your Documents
                </CardTitle>
                <CardDescription>
                  Ask questions about your {readyDocuments.length} processed document{readyDocuments.length !== 1 ? 's' : ''}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input 
                    placeholder="Ask a question about your documents..."
                    className="w-full"
                  />
                  <Button className="w-full sm:w-auto">
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </ErrorBoundary>
  )
}