/**
 * Source Citations Component
 * 
 * Enhanced display of document sources and citations for AI responses,
 * with expandable content, relevance scoring, and document preview functionality.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  DocumentIcon,
  EyeIcon,
  ShareIcon,
  BookmarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { DocumentSource } from '@/types/chat'
import { getDocument } from '@/lib/api'

interface SourceCitationsProps {
  sources: DocumentSource[]
  maxVisible?: number
  onSourceSelect?: (source: DocumentSource) => void
}

interface DocumentPreview {
  isLoading: boolean
  content?: string
  error?: string
}

export function SourceCitations({ 
  sources, 
  maxVisible = 3,
  onSourceSelect
}: SourceCitationsProps) {
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set())
  const [showAllSources, setShowAllSources] = useState(false)
  const [documentPreviews, setDocumentPreviews] = useState<Record<string, DocumentPreview>>({})
  const [selectedSource, setSelectedSource] = useState<DocumentSource | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const toggleSourceExpansion = (index: number) => {
    const newExpanded = new Set(expandedSources)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSources(newExpanded)
  }

  const loadDocumentPreview = useCallback(async (source: DocumentSource) => {
    if (!source.document_id) return
    
    const previewKey = source.document_id
    if (documentPreviews[previewKey]) return
    
    setDocumentPreviews(prev => ({
      ...prev,
      [previewKey]: { isLoading: true }
    }))
    
    try {
      const documentDetails = await getDocument(source.document_id)
      setDocumentPreviews(prev => ({
        ...prev,
        [previewKey]: { 
          isLoading: false, 
          content: documentDetails.document.content?.substring(0, 1000) || 'No preview available'
        }
      }))
    } catch (error) {
      setDocumentPreviews(prev => ({
        ...prev,
        [previewKey]: { 
          isLoading: false, 
          error: 'Failed to load preview' 
        }
      }))
    }
  }, [documentPreviews])

  const handlePreviewDocument = (source: DocumentSource) => {
    setSelectedSource(source)
    setShowPreviewModal(true)
    loadDocumentPreview(source)
  }

  const handleCopySource = async (source: DocumentSource) => {
    const citationText = `"${source.chunk_text}" - ${source.filename} (Relevance: ${Math.round(source.relevance_score * 100)}%)`
    
    try {
      await navigator.clipboard.writeText(citationText)
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy citation:', error)
    }
  }

  const visibleSources = showAllSources ? sources : sources.slice(0, maxVisible)
  const hasMoreSources = sources.length > maxVisible

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-success-100 text-success-800 border-success-200'
    if (score >= 0.6) return 'bg-warning-100 text-warning-800 border-warning-200'
    return 'bg-neutral-100 text-neutral-600 border-neutral-200'
  }

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.8) return 'High'
    if (score >= 0.6) return 'Medium'
    return 'Low'
  }

  const getConfidenceDescription = (score: number) => {
    if (score >= 0.8) return 'This source closely matches your query'
    if (score >= 0.6) return 'This source is somewhat related to your query'
    return 'This source has limited relevance to your query'
  }

  if (sources.length === 0) {
    return null
  }

  return (
    <>
      <div className="mt-4 p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 rounded-lg border border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-neutral-700 flex items-center">
            <DocumentIcon className="h-4 w-4 mr-2" />
            Sources ({sources.length})
            <div className="ml-2 group relative">
              <InformationCircleIcon className="h-4 w-4 text-neutral-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-neutral-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Sources are ranked by relevance to your question. Higher scores indicate more relevant content.
              </div>
            </div>
          </h4>
          {hasMoreSources && (
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors font-medium"
            >
              {showAllSources ? 'Show Less' : `Show All (${sources.length})`}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {visibleSources.map((source, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div 
                className="p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                onClick={() => toggleSourceExpansion(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <DocumentIcon className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                      <h5 className="text-sm font-medium text-neutral-900 truncate">
                        {source.filename}
                      </h5>
                      <div className="flex items-center space-x-2">
                        <span className={`
                          px-2 py-1 text-xs rounded-full border
                          ${getRelevanceColor(source.relevance_score)}
                        `}>
                          {getRelevanceLabel(source.relevance_score)}
                        </span>
                        <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                          {Math.round(source.relevance_score * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-neutral-600 line-clamp-2 leading-relaxed">
                      {source.chunk_text.length > 150 
                        ? `${source.chunk_text.substring(0, 150)}...`
                        : source.chunk_text
                      }
                    </p>

                    <p className="text-xs text-neutral-500 mt-1">
                      {getConfidenceDescription(source.relevance_score)}
                    </p>
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-2">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreviewDocument(source)
                        }}
                        className="p-1 text-neutral-400 hover:text-primary-500 transition-colors rounded"
                        title="Preview document"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopySource(source)
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors rounded"
                        title="Copy citation"
                      >
                        <ShareIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-neutral-400">
                      {expandedSources.has(index) ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {expandedSources.has(index) && (
                <div className="px-4 pb-4 border-t border-neutral-100 bg-neutral-25">
                  <div className="mt-3">
                    <div className="prose prose-sm max-w-none text-neutral-700">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap bg-white p-3 rounded border">
                        {source.chunk_text}
                      </p>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-neutral-200">
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <div className="flex items-center space-x-4">
                          <span>Document: {source.filename}</span>
                          <span>Relevance: {Math.round(source.relevance_score * 100)}%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onSourceSelect?.(source)}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            View Full Document
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Document Preview Modal */}
      {showPreviewModal && selectedSource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  Document Preview
                </h3>
                <p className="text-sm text-neutral-600">{selectedSource.filename}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {selectedSource.document_id && documentPreviews[selectedSource.document_id] ? (
                <div>
                  {documentPreviews[selectedSource.document_id].isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                      <span className="ml-2 text-neutral-600">Loading preview...</span>
                    </div>
                  ) : documentPreviews[selectedSource.document_id].error ? (
                    <div className="text-center py-8">
                      <p className="text-red-600">{documentPreviews[selectedSource.document_id].error}</p>
                    </div>
                  ) : (
                    <div className="prose max-w-none">
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Relevant section:</strong> "{selectedSource.chunk_text}"
                        </p>
                      </div>
                      <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                        {documentPreviews[selectedSource.document_id].content}
                        {documentPreviews[selectedSource.document_id].content?.length === 1000 && (
                          <p className="text-neutral-500 italic mt-4">
                            Preview truncated. View full document for complete content.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DocumentIcon className="h-12 w-12 text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-600">No document ID available for preview</p>
                  <div className="mt-4 bg-neutral-50 p-4 rounded-lg">
                    <p className="text-sm text-neutral-700 italic">
                      "{selectedSource.chunk_text}"
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-neutral-200 bg-neutral-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600">
                  Relevance Score: <span className="font-medium">{Math.round(selectedSource.relevance_score * 100)}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopySource(selectedSource)}
                    className="px-3 py-1 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
                  >
                    Copy Citation
                  </button>
                  {onSourceSelect && (
                    <button
                      onClick={() => {
                        onSourceSelect(selectedSource)
                        setShowPreviewModal(false)
                      }}
                      className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors"
                    >
                      View Full Document
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}