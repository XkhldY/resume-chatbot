'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './card'
import { Button } from './button'
import { 
  VectorDatabaseStatus,
  DocumentChunksVisualization,
  VectorSearchInterface,
  DatabaseManagementUI,
  EmbeddingProgressTracking,
  VectorTestingPanel
} from './index'
import { getDocuments } from '@/lib/api'
import { Document } from '@/types/document'
import { VectorSearchResponse } from '@/types/vector'

type TabType = 'overview' | 'search' | 'chunks' | 'embedding' | 'management' | 'testing'

interface VectorDashboardProps {
  initialTab?: TabType
  showManagementFeatures?: boolean
  allowDangerousOperations?: boolean
}

const TabButton: React.FC<{
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
  badge?: string | number
}> = ({ isActive, onClick, children, badge }) => (
  <button
    onClick={onClick}
    className={`relative px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-800 border border-primary-200'
        : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900'
    }`}
  >
    {children}
    {badge !== undefined && (
      <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-medium rounded-full ${
        isActive ? 'bg-primary-600 text-white' : 'bg-neutral-400 text-white'
      }`}>
        {badge}
      </span>
    )}
  </button>
)

export const VectorDashboard: React.FC<VectorDashboardProps> = ({
  initialTab = 'overview',
  showManagementFeatures = true,
  allowDangerousOperations = false
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>()
  const [searchResults, setSearchResults] = useState<VectorSearchResponse | null>(null)
  const [documentsWithEmbeddings, setDocumentsWithEmbeddings] = useState<string[]>([])

  const fetchDocuments = async () => {
    try {
      const response = await getDocuments()
      setDocuments(response.documents)
      
      // Filter documents that are likely to have embeddings (processed documents)
      const processedDocs = response.documents
        .filter(doc => doc.status === 'ready')
        .map(doc => doc.id)
      setDocumentsWithEmbeddings(processedDocs)
    } catch (err: any) {
      console.warn('Failed to fetch documents:', err.message)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleSearchComplete = (results: VectorSearchResponse) => {
    setSearchResults(results)
  }

  const handleEmbeddingComplete = (documentId: string) => {
    if (!documentsWithEmbeddings.includes(documentId)) {
      setDocumentsWithEmbeddings(prev => [...prev, documentId])
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <VectorDatabaseStatus
              showDetailedMetrics={true}
              refreshInterval={30000}
            />
          </div>
        )

      case 'search':
        return (
          <div className="space-y-6">
            <VectorSearchInterface
              maxResults={20}
              showAdvancedOptions={true}
              onSearchComplete={handleSearchComplete}
            />
            {searchResults && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Search Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-neutral-900">{searchResults.total_results}</p>
                      <p className="text-sm text-neutral-600">Total Results</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary-600">{searchResults.search_time_ms}ms</p>
                      <p className="text-sm text-neutral-600">Search Time</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-neutral-900">{searchResults.results.length}</p>
                      <p className="text-sm text-neutral-600">Results Shown</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 'chunks':
        return (
          <div className="space-y-6">
            {documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Document Filter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedDocumentId ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => setSelectedDocumentId(undefined)}
                    >
                      All Documents ({documents.length})
                    </Button>
                    {documents.slice(0, 10).map((doc) => (
                      <Button
                        key={doc.id}
                        variant={selectedDocumentId === doc.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDocumentId(doc.id)}
                        className="max-w-xs truncate"
                      >
                        {doc.filename}
                        {doc.chunk_count && ` (${doc.chunk_count})`}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <DocumentChunksVisualization
              documentId={selectedDocumentId}
              pageSize={25}
              showEmbeddingStatus={true}
            />
          </div>
        )

      case 'embedding':
        return (
          <div className="space-y-6">
            <EmbeddingProgressTracking
              documentIds={documentsWithEmbeddings.length > 0 ? documentsWithEmbeddings : undefined}
              showBatchProgress={true}
              refreshInterval={3000}
              onProgressComplete={handleEmbeddingComplete}
            />
          </div>
        )

      case 'management':
        return showManagementFeatures ? (
          <div className="space-y-6">
            <DatabaseManagementUI
              allowDangerousOperations={allowDangerousOperations}
            />
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-neutral-600">Management features are not enabled</p>
            </CardContent>
          </Card>
        )

      case 'testing':
        return (
          <div className="space-y-6">
            <VectorTestingPanel
              showBenchmarks={true}
              defaultTestText="This is a sample text for testing embeddings."
            />
          </div>
        )

      default:
        return null
    }
  }

  const getTabBadge = (tab: TabType): string | number | undefined => {
    switch (tab) {
      case 'chunks':
        return documents.reduce((total, doc) => total + (doc.chunk_count || 0), 0) || undefined
      case 'embedding':
        return documentsWithEmbeddings.length || undefined
      case 'search':
        return searchResults?.total_results || undefined
      default:
        return undefined
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Vector Database Dashboard</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-neutral-600">
              <span>Documents: {documents.length}</span>
              <span>•</span>
              <span>With Embeddings: {documentsWithEmbeddings.length}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <TabButton
              isActive={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </TabButton>
            <TabButton
              isActive={activeTab === 'search'}
              onClick={() => setActiveTab('search')}
              badge={getTabBadge('search')}
            >
              Search
            </TabButton>
            <TabButton
              isActive={activeTab === 'chunks'}
              onClick={() => setActiveTab('chunks')}
              badge={getTabBadge('chunks')}
            >
              Chunks
            </TabButton>
            <TabButton
              isActive={activeTab === 'embedding'}
              onClick={() => setActiveTab('embedding')}
              badge={getTabBadge('embedding')}
            >
              Embedding
            </TabButton>
            {showManagementFeatures && (
              <TabButton
                isActive={activeTab === 'management'}
                onClick={() => setActiveTab('management')}
              >
                Management
              </TabButton>
            )}
            <TabButton
              isActive={activeTab === 'testing'}
              onClick={() => setActiveTab('testing')}
            >
              Testing
            </TabButton>
          </div>
        </CardContent>
      </Card>

      {renderTabContent()}
    </div>
  )
}