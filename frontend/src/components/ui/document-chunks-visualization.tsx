'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './card'
import { Alert, AlertDescription } from './alert'
import { Button } from './button'
import { Input } from './input'
import { Progress } from './progress'
import { getDocumentChunks } from '@/lib/api'
import { DocumentChunk, DocumentChunksVisualizationProps } from '@/types/vector'

const ChunkCard: React.FC<{
  chunk: DocumentChunk
  onSelect?: (chunk: DocumentChunk) => void
  isSelected?: boolean
}> = ({ chunk, onSelect, isSelected }) => {
  const getEmbeddingStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800 border-success-200'
      case 'generating':
        return 'bg-warning-100 text-warning-800 border-warning-200'
      case 'failed':
        return 'bg-error-100 text-error-800 border-error-200'
      case 'pending':
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200'
    }
  }

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
        isSelected ? 'ring-2 ring-primary-500 border-primary-200' : ''
      }`}
      onClick={() => onSelect?.(chunk)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-neutral-900 truncate">
              {chunk.document_filename}
            </h4>
            <p className="text-xs text-neutral-500 mt-1">
              Chunk {chunk.metadata.chunk_index + 1}
              {chunk.metadata.page_number && ` • Page ${chunk.metadata.page_number}`}
              {chunk.metadata.section && ` • ${chunk.metadata.section}`}
            </p>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getEmbeddingStatusColor(chunk.embedding_status)}`}>
            {chunk.embedding_status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="text-sm text-neutral-700 leading-relaxed">
            {truncateText(chunk.content)}
          </div>
          
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center space-x-4">
              <span>{chunk.metadata.word_count} words</span>
              <span>{chunk.metadata.character_count} chars</span>
            </div>
            <div>
              Updated: {formatDate(chunk.updated_at)}
            </div>
          </div>

          {chunk.embedding_status === 'generating' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-neutral-600">
                <span>Generating embedding...</span>
              </div>
              <Progress value={50} max={100} className="h-1" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const ChunkDetailModal: React.FC<{
  chunk: DocumentChunk | null
  onClose: () => void
}> = ({ chunk, onClose }) => {
  if (!chunk) return null

  const formatPosition = (start: number, end: number) => {
    return `Characters ${start.toLocaleString()} - ${end.toLocaleString()}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{chunk.document_filename}</h3>
            <p className="text-sm text-neutral-600 mt-1">
              Chunk {chunk.metadata.chunk_index + 1}
              {chunk.metadata.page_number && ` • Page ${chunk.metadata.page_number}`}
              {chunk.metadata.section && ` • Section: ${chunk.metadata.section}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Status</p>
                <p className="text-sm font-medium text-neutral-900 mt-1">{chunk.embedding_status}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Word Count</p>
                <p className="text-sm font-medium text-neutral-900 mt-1">{chunk.metadata.word_count.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Position</p>
                <p className="text-sm font-medium text-neutral-900 mt-1">
                  {formatPosition(chunk.metadata.start_position, chunk.metadata.end_position)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Embedding ID</p>
                <p className="text-sm font-medium text-neutral-900 mt-1 font-mono">
                  {chunk.embedding_id ? chunk.embedding_id.substring(0, 8) + '...' : 'Not generated'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-neutral-900 mb-2">Content</h4>
              <div className="bg-white border border-neutral-200 rounded-lg p-4 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                {chunk.content}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-500">
              <div>
                <strong>Created:</strong> {new Date(chunk.created_at).toLocaleString()}
              </div>
              <div>
                <strong>Last Updated:</strong> {new Date(chunk.updated_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const DocumentChunksVisualization: React.FC<DocumentChunksVisualizationProps> = ({
  documentId,
  searchQuery = '',
  pageSize = 20,
  showEmbeddingStatus = true,
  onChunkSelect
}) => {
  const [chunks, setChunks] = useState<DocumentChunk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalChunks, setTotalChunks] = useState(0)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [selectedChunk, setSelectedChunk] = useState<DocumentChunk | null>(null)
  const [embeddingStats, setEmbeddingStats] = useState({
    completed: 0,
    generating: 0,
    failed: 0,
    pending: 0
  })

  const fetchChunks = async (page: number = 1, search?: string) => {
    try {
      setLoading(true)
      const response = await getDocumentChunks(
        documentId,
        page,
        pageSize,
        search || localSearchQuery || undefined
      )
      
      setChunks(response.chunks)
      setTotalChunks(response.total)
      setCurrentPage(response.page)
      
      // Calculate embedding statistics
      const stats = response.chunks.reduce((acc, chunk) => {
        acc[chunk.embedding_status] = (acc[chunk.embedding_status] || 0) + 1
        return acc
      }, {} as any)
      
      setEmbeddingStats({
        completed: stats.completed || 0,
        generating: stats.generating || 0,
        failed: stats.failed || 0,
        pending: stats.pending || 0
      })
      
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch document chunks')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchChunks(1, localSearchQuery)
  }

  const handleChunkSelect = (chunk: DocumentChunk) => {
    setSelectedChunk(chunk)
    onChunkSelect?.(chunk)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchChunks(newPage)
  }

  useEffect(() => {
    fetchChunks()
  }, [documentId])

  const totalPages = Math.ceil(totalChunks / pageSize)
  const totalEmbeddings = embeddingStats.completed + embeddingStats.generating + embeddingStats.failed + embeddingStats.pending
  const embeddingProgress = totalEmbeddings > 0 ? (embeddingStats.completed / totalEmbeddings) * 100 : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Document Chunks</CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="Search within chunks..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="w-64"
              />
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-error-200 bg-error-50">
              <AlertDescription className="text-error-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {showEmbeddingStatus && totalEmbeddings > 0 && (
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-neutral-900">Embedding Status</h4>
                <span className="text-sm text-neutral-600">
                  {embeddingStats.completed} of {totalEmbeddings} completed
                </span>
              </div>
              <Progress value={embeddingProgress} max={100} className="mb-3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <p className="font-medium text-success-600">{embeddingStats.completed}</p>
                  <p className="text-neutral-600">Completed</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-warning-600">{embeddingStats.generating}</p>
                  <p className="text-neutral-600">Generating</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-error-600">{embeddingStats.failed}</p>
                  <p className="text-neutral-600">Failed</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-neutral-600">{embeddingStats.pending}</p>
                  <p className="text-neutral-600">Pending</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-neutral-600">Loading chunks...</span>
            </div>
          ) : chunks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-600">No chunks found.</p>
              {localSearchQuery && (
                <p className="text-sm text-neutral-500 mt-2">
                  Try adjusting your search query or check if documents have been processed for embedding.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {chunks.map((chunk) => (
                  <ChunkCard
                    key={chunk.id}
                    chunk={chunk}
                    onSelect={handleChunkSelect}
                    isSelected={selectedChunk?.id === chunk.id}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-200">
                  <p className="text-sm text-neutral-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalChunks)} of {totalChunks} chunks
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-neutral-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ChunkDetailModal
        chunk={selectedChunk}
        onClose={() => setSelectedChunk(null)}
      />
    </div>
  )
}