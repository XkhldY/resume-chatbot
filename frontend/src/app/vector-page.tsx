'use client'

import React, { useState, useCallback } from 'react'
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
  DocumentPreview,
  ProcessingTestingInterface,
  ProcessingStatisticsDisplay,
  ErrorBoundary,
  LoadingState,
  VectorDashboard
} from '@/components/ui'
import { 
  DocumentArrowUpIcon, 
  ChatBubbleLeftRightIcon, 
  CheckCircleIcon,
  Cog6ToothIcon,
  EyeIcon,
  ChartBarIcon,
  CircleStackIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { UploadFile } from '@/types/upload'
import { useDocumentProcessing, useDocumentPreview, useBulkOperations } from '@/hooks/useDocumentProcessing'

type ViewMode = 'upload' | 'documents' | 'vector' | 'testing' | 'statistics'

export default function VectorPage() {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('vector')
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([])

  // Hooks for document processing
  const {
    documents,
    statistics,
    healthStatus,
    isLoading,
    error,
    readyDocuments,
    processingStats,
    loadDocuments,
    processSingleDocument,
    retryDocument,
    checkHealth,
    clearError
  } = useDocumentProcessing()

  const {
    selectedDocument,
    isLoadingPreview,
    previewError,
    openPreview,
    closePreview
  } = useDocumentPreview()

  const {
    isProcessingAll,
    bulkError,
    lastBulkResult,
    processAll,
    clearAll
  } = useBulkOperations()

  // Upload handlers
  const handleUploadComplete = useCallback((files: UploadFile[]) => {
    setUploadedFiles(files)
    clearError()
    // Refresh documents list after upload
    loadDocuments()
  }, [loadDocuments, clearError])

  const handleUploadError = useCallback((error: string) => {
    console.error('Upload error:', error)
  }, [])

  // Document handlers
  const handleProcessDocument = useCallback(async (documentId: string) => {
    try {
      await processSingleDocument(documentId)
    } catch (err) {
      console.error('Process document error:', err)
    }
  }, [processSingleDocument])

  const handleViewDocument = useCallback(async (documentId: string) => {
    await openPreview(documentId)
  }, [openPreview])

  const handleRetryDocument = useCallback(async (documentId: string) => {
    try {
      await retryDocument(documentId)
    } catch (err) {
      console.error('Retry document error:', err)
    }
  }, [retryDocument])

  // Bulk operation handlers
  const handleProcessAll = useCallback(async () => {
    try {
      await processAll()
      await loadDocuments()
    } catch (err) {
      console.error('Process all error:', err)
    }
  }, [processAll, loadDocuments])

  const handleClearAll = useCallback(async () => {
    try {
      await clearAll()
      await loadDocuments()
    } catch (err) {
      console.error('Clear all error:', err)
    }
  }, [clearAll, loadDocuments])

  const handleHealthCheck = useCallback(async () => {
    try {
      await checkHealth()
    } catch (err) {
      console.error('Health check error:', err)
    }
  }, [checkHealth])

  const successfulUploads = uploadedFiles.filter(f => f.status === 'success')
  const hasUploads = successfulUploads.length > 0

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-neutral-light">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="mb-4">Document Chatbot with Vector Database</h1>
            <p className="text-neutral-600 max-w-3xl mx-auto">
              Advanced document processing with ChromaDB vector database integration. Upload, process, and interact with your documents using state-of-the-art embedding technology for semantic search and RAG capabilities.
            </p>
          </div>

          {/* Enhanced Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            <Button
              variant={viewMode === 'vector' ? 'default' : 'outline'}
              onClick={() => setViewMode('vector')}
              className="flex items-center gap-2"
            >
              <CircleStackIcon className="w-4 h-4" />
              Vector Database
            </Button>
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
              System Testing
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
          {(error || bulkError) && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error || bulkError}</AlertDescription>
            </Alert>
          )}

          {/* Content based on view mode */}
          {viewMode === 'vector' && (
            <VectorDashboard
              initialTab="overview"
              showManagementFeatures={true}
              allowDangerousOperations={false}
            />
          )}

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
                    Upload PDFs, Word docs, text files, and markdown files for AI-powered processing and vector embedding.
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
              {(hasUploads || documents.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Process Documents for Vector Database</CardTitle>
                    <CardDescription>
                      Process documents to extract text, generate embeddings, and enable semantic search capabilities.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={handleProcessAll}
                        disabled={isProcessingAll}
                        size="lg"
                        className="flex-1"
                      >
                        {isProcessingAll ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Processing & Embedding...
                          </>
                        ) : (
                          <>
                            <CircleStackIcon className="w-4 h-4 mr-2" />
                            Process All & Generate Embeddings
                          </>
                        )}
                      </Button>
                      
                      {processingStats.total > 0 && (
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Total: {processingStats.total}</span>
                          <span className="text-green-600">Ready: {processingStats.ready}</span>
                          <span className="text-blue-600">Processing: {processingStats.processing}</span>
                          <span className="text-red-600">Errors: {processingStats.error}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {viewMode === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Document Library</h2>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setViewMode('vector')} 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    Vector Search
                  </Button>
                  <Button onClick={loadDocuments} variant="outline" size="sm">
                    Refresh
                  </Button>
                </div>
              </div>

              <LoadingState
                isLoading={isLoading}
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
                      onClose={closePreview}
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
              recentResults={lastBulkResult?.results}
              showDetails={true}
            />
          )}

          {/* Enhanced Chat Section - Always visible when documents are ready */}
          {readyDocuments.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary" />
                  AI Chat with Vector Search
                </CardTitle>
                <CardDescription>
                  Ask questions about your {readyDocuments.length} processed document{readyDocuments.length !== 1 ? 's' : ''} using semantic search powered by vector embeddings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <CircleStackIcon className="w-5 h-5 text-primary-600" />
                    <span className="text-sm text-primary-800">
                      Enhanced with vector database for intelligent semantic search and context retrieval
                    </span>
                  </div>
                  <Input 
                    placeholder="Ask a question about your documents using natural language..."
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1 sm:flex-none">
                      <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setViewMode('vector')}
                      className="flex items-center gap-2"
                    >
                      <CircleStackIcon className="w-4 h-4" />
                      Open Vector Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Getting Started Help */}
          {documents.length === 0 && !hasUploads && (
            <Alert className="mt-8">
              <AlertDescription>
                <strong>Getting Started with Vector Database:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• <strong>Upload:</strong> Add your documents (PDF, DOCX, TXT, MD)</li>
                  <li>• <strong>Process:</strong> Documents are chunked and embedded into ChromaDB</li>
                  <li>• <strong>Search:</strong> Use semantic search to find relevant content</li>
                  <li>• <strong>Chat:</strong> AI-powered conversations with intelligent context retrieval</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-neutral-200">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setViewMode('vector')}
                    className="flex items-center gap-2"
                  >
                    <CircleStackIcon className="w-4 h-4" />
                    Explore Vector Database Features
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </main>
    </ErrorBoundary>
  )
}