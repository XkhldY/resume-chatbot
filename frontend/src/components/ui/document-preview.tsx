'use client'

import React, { useState } from 'react'
import { Card } from './card'
import { Button } from './button'
import { Alert } from './alert'
import { DocumentDetails, DocumentChunk } from '@/types/document'
import {
  DocumentTextIcon as FileText,
  EyeIcon as Eye,
  QuestionMarkCircleIcon as EyeOff,
  QuestionMarkCircleIcon as Copy,
  MagnifyingGlassIcon as Search,
  QuestionMarkCircleIcon as ChevronDown,
  QuestionMarkCircleIcon as ChevronRight,
  ExclamationCircleIcon as AlertCircle,
  InformationCircleIcon as Info,
  HashtagIcon as Hash,
  GlobeAmericasIcon as Globe,
  ClockIcon as Clock,
  ArrowDownTrayIcon as Download
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface DocumentPreviewProps {
  documentDetails: DocumentDetails
  onClose?: () => void
  className?: string
}

export function DocumentPreview({ documentDetails, onClose, className }: DocumentPreviewProps) {
  const [showFullText, setShowFullText] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChunk, setSelectedChunk] = useState<number | null>(null)
  const [showMetadata, setShowMetadata] = useState(true)
  const [copiedText, setCopiedText] = useState(false)

  const { document, extracted_text, chunks, processing_log } = documentDetails

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatProcessingTime = (seconds: number) => {
    if (seconds < 1) return '< 1s'
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  }

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text
    const regex = new RegExp(`(${term})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const getPreviewText = () => {
    if (showFullText) return extracted_text
    return extracted_text.slice(0, 1000) + (extracted_text.length > 1000 ? '...' : '')
  }

  const filteredChunks = chunks.filter(chunk =>
    !searchTerm || chunk.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold">{document.filename}</h2>
            <p className="text-sm text-gray-600">
              Created: {new Date(document.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
        )}
      </div>

      {/* Document Metadata */}
      {document.metadata && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Document Information
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              {showMetadata ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {showMetadata && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Word Count:</span>
                  <span>{document.metadata.word_count.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">File Size:</span>
                  <span>{formatFileSize(document.metadata.file_size)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Pages:</span>
                  <span>{document.metadata.page_count}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Language:</span>
                  <span>{document.metadata.language}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">File Type:</span>
                  <span>{document.metadata.file_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Encoding:</span>
                  <span>{document.metadata.encoding}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Processing Time:</span>
                  <span>{formatProcessingTime(document.metadata.processing_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Extraction Method:</span>
                  <span>{document.metadata.extraction_method}</span>
                </div>
                {document.metadata.has_tables && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">Tables:</span>
                    <span>{document.metadata.table_count}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {document.metadata.warnings && document.metadata.warnings.length > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <div>
                <p className="font-medium">Processing Warnings</p>
                <ul className="text-sm mt-1 list-disc list-inside">
                  {document.metadata.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}
        </Card>
      )}

      {/* Text Preview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Extracted Text</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(extracted_text)}
            >
              <Copy className="h-4 w-4 mr-1" />
              {copiedText ? 'Copied!' : 'Copy All'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullText(!showFullText)}
            >
              {showFullText ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showFullText ? 'Show Less' : 'Show Full Text'}
            </Button>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm font-mono">
            {getPreviewText()}
          </pre>
        </div>

        {!showFullText && extracted_text.length > 1000 && (
          <p className="text-xs text-gray-500 mt-2">
            Showing first 1,000 characters of {extracted_text.length.toLocaleString()} total
          </p>
        )}
      </Card>

      {/* Document Chunks */}
      {chunks && chunks.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Document Chunks ({chunks.length})</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chunks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredChunks.map((chunk, index) => {
              const originalIndex = chunks.indexOf(chunk)
              const isSelected = selectedChunk === originalIndex
              
              return (
                <div key={chunk.id} className="border rounded-lg">
                  <button
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
                    onClick={() => setSelectedChunk(isSelected ? null : originalIndex)}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium text-sm">
                        Chunk {originalIndex + 1}
                        {chunk.metadata.page_number && ` (Page ${chunk.metadata.page_number})`}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {chunk.metadata.word_count} words
                    </span>
                  </button>
                  {isSelected && (
                    <div className="p-3 border-t bg-gray-50">
                      <div 
                        className="text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: highlightSearchTerm(chunk.content, searchTerm)
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {searchTerm && filteredChunks.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No chunks found matching "{searchTerm}"
            </p>
          )}
        </Card>
      )}

      {/* Processing Log */}
      {processing_log && processing_log.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Processing Log</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto text-sm">
            {processing_log.map((entry, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className={cn(
                  "px-2 py-1 text-xs rounded",
                  entry.level === 'error' && "bg-red-100 text-red-800",
                  entry.level === 'warning' && "bg-yellow-100 text-yellow-800",
                  entry.level === 'info' && "bg-blue-100 text-blue-800"
                )}>
                  {entry.level}
                </span>
                <span className="flex-1">{entry.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}