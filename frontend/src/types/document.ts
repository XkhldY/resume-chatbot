// Enhanced document processing types based on backend capabilities

export interface DocumentMetadata {
  file_path: string
  file_size: number
  word_count: number
  character_count: number
  line_count: number
  page_count: number
  language: string
  encoding: string
  creation_date?: string
  modification_date?: string
  file_type: string
  mime_type: string
  has_tables: boolean
  table_count: number
  has_images: boolean
  image_count: number
  is_password_protected: boolean
  extraction_method: string
  processing_time: number
  errors: string[]
  warnings: string[]
}

export interface Document {
  id: string
  filename: string
  file_path: string
  status: 'pending' | 'processing' | 'ready' | 'error'
  created_at: string
  chunk_count?: number
  metadata?: DocumentMetadata
  extracted_text?: string
  processing_error?: string
}

export interface DocumentListResponse {
  documents: Document[]
  total_count: number
}

export interface ProcessingResult {
  document_id: string
  filename: string
  status: 'success' | 'error' | 'skipped'
  processing_time: number
  chunk_count?: number
  error_message?: string
  metadata?: DocumentMetadata
}

export interface ProcessingStatistics {
  total_documents: number
  processed_successfully: number
  failed_processing: number
  total_processing_time: number
  average_processing_time: number
  documents_with_errors: number
  documents_with_warnings: number
  success_rate: number
}

export interface BulkProcessingResponse {
  message: string
  results: ProcessingResult[]
  statistics: ProcessingStatistics
  processing_started_at: string
  processing_completed_at?: string
}

export interface DocumentDetails {
  document: Document
  extracted_text: string
  chunks: DocumentChunk[]
  processing_log: ProcessingLogEntry[]
}

export interface DocumentChunk {
  id: string
  content: string
  metadata: {
    page_number?: number
    section?: string
    chunk_index: number
    word_count: number
  }
}

export interface ProcessingLogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  details?: Record<string, any>
}

export interface ProcessingProgress {
  document_id: string
  filename: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress_percentage: number
  current_step: string
  estimated_time_remaining?: number
  started_at: string
  completed_at?: string
  error?: string
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  database_status: 'connected' | 'disconnected' | 'error'
  vector_store_status: 'connected' | 'disconnected' | 'error'
  document_processing_status: 'active' | 'idle' | 'error'
  statistics: {
    total_documents: number
    documents_ready: number
    documents_processing: number
    documents_with_errors: number
    average_processing_time: number
  }
}

// Processing States
export type ProcessingState = 'idle' | 'scanning' | 'processing' | 'completed' | 'error'

// Error types for better error handling
export interface DocumentProcessingError {
  code: string
  message: string
  details?: Record<string, any>
  suggestions?: string[]
  recoverable: boolean
}

// Filter and sorting options
export interface DocumentFilter {
  status?: Document['status'][]
  file_type?: string[]
  has_errors?: boolean
  has_warnings?: boolean
  language?: string[]
  date_range?: {
    start: string
    end: string
  }
}

export interface DocumentSort {
  field: 'filename' | 'created_at' | 'file_size' | 'word_count' | 'processing_time'
  direction: 'asc' | 'desc'
}

// Component props interfaces
export interface DocumentListProps {
  documents: Document[]
  loading: boolean
  onRefresh: () => void
  onProcessDocument: (documentId: string) => void
  onViewDocument: (documentId: string) => void
  filter?: DocumentFilter
  sort?: DocumentSort
}

export interface DocumentProcessingStatusProps {
  document: Document
  onRetry?: () => void
  onViewDetails?: () => void
  showMetadata?: boolean
  compact?: boolean
}

export interface ProcessingTestingInterfaceProps {
  onProcessAll: () => void
  onClearAll: () => void
  onHealthCheck: () => void
  statistics?: ProcessingStatistics
  healthStatus?: HealthCheckResponse
}