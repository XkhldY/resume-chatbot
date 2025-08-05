// Vector database types for ChromaDB integration

export interface VectorDatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  chroma_status: 'connected' | 'disconnected' | 'error'
  version: string
  host: string
  port: number
  last_heartbeat: string
  response_time_ms: number
  error_message?: string
}

export interface VectorCollection {
  id: string
  name: string
  document_count: number
  vector_count: number
  metadata_count: number
  created_at: string
  last_modified: string
  embedding_function: string
  distance_function: 'cosine' | 'l2' | 'ip'
  dimensions: number
}

export interface VectorCollectionStats {
  total_collections: number
  total_documents: number
  total_vectors: number
  total_size_bytes: number
  average_vector_size: number
  collections: VectorCollection[]
}

export interface DocumentChunk {
  id: string
  document_id: string
  document_filename: string
  content: string
  metadata: {
    chunk_index: number
    page_number?: number
    section?: string
    word_count: number
    character_count: number
    start_position: number
    end_position: number
  }
  embedding_status: 'pending' | 'generating' | 'completed' | 'failed'
  embedding_id?: string
  created_at: string
  updated_at: string
}

export interface VectorSearchQuery {
  query: string
  n_results?: number
  collection_name?: string
  where_document?: Record<string, any>
  where_metadata?: Record<string, any>
  include_metadata?: boolean
  include_documents?: boolean
  include_distances?: boolean
}

export interface VectorSearchResult {
  id: string
  document: string
  metadata: Record<string, any>
  distance: number
  similarity_score: number
  chunk: DocumentChunk
  document_info: {
    filename: string
    document_id: string
  }
}

export interface VectorSearchResponse {
  query: string
  results: VectorSearchResult[]
  search_time_ms: number
  total_results: number
  collection_name: string
}

export interface EmbeddingProgress {
  document_id: string
  filename: string
  total_chunks: number
  completed_chunks: number
  failed_chunks: number
  progress_percentage: number
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused'
  current_chunk_index?: number
  estimated_time_remaining?: number
  started_at: string
  completed_at?: string
  error_message?: string
  processing_speed_chunks_per_second?: number
}

export interface EmbeddingBatchStatus {
  batch_id: string
  documents: EmbeddingProgress[]
  overall_progress: number
  overall_status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused'
  started_at: string
  completed_at?: string
  total_documents: number
  completed_documents: number
  failed_documents: number
}

export interface VectorDatabaseStats {
  database_info: {
    version: string
    uptime_seconds: number
    memory_usage_mb: number
    disk_usage_mb: number
    cpu_usage_percent: number
  }
  performance_metrics: {
    average_search_time_ms: number
    average_insert_time_ms: number
    total_searches: number
    total_inserts: number
    cache_hit_rate: number
  }
  collection_summary: VectorCollectionStats
  recent_activity: {
    searches_last_hour: number
    embeddings_last_hour: number
    errors_last_hour: number
  }
}

export interface VectorOperationResult {
  success: boolean
  message: string
  operation_time_ms: number
  affected_count?: number
  error_details?: string
}

export interface EmbeddingTestRequest {
  text: string
  collection_name?: string
}

export interface EmbeddingTestResponse {
  text: string
  embedding_dimensions: number
  processing_time_ms: number
  embedding_preview: number[] // First few dimensions for display
  success: boolean
  error_message?: string
}

export interface VectorSimilarityTest {
  text1: string
  text2: string
  similarity_score: number
  distance: number
  processing_time_ms: number
}

export interface VectorBenchmarkResult {
  operation: 'search' | 'insert' | 'update' | 'delete'
  iterations: number
  total_time_ms: number
  average_time_ms: number
  min_time_ms: number
  max_time_ms: number
  operations_per_second: number
  success_rate: number
  errors: string[]
}

// Component props interfaces
export interface VectorDatabaseStatusProps {
  refreshInterval?: number
  showDetailedMetrics?: boolean
  onConnectionError?: (error: string) => void
}

export interface DocumentChunksVisualizationProps {
  documentId?: string
  searchQuery?: string
  pageSize?: number
  showEmbeddingStatus?: boolean
  onChunkSelect?: (chunk: DocumentChunk) => void
}

export interface VectorSearchInterfaceProps {
  defaultCollection?: string
  maxResults?: number
  showAdvancedOptions?: boolean
  onSearchComplete?: (results: VectorSearchResponse) => void
}

export interface DatabaseManagementUIProps {
  allowDangerousOperations?: boolean
  onCollectionChange?: (collections: VectorCollection[]) => void
}

export interface EmbeddingProgressTrackingProps {
  documentIds?: string[]
  showBatchProgress?: boolean
  refreshInterval?: number
  onProgressComplete?: (documentId: string) => void
}

export interface VectorTestingPanelProps {
  showBenchmarks?: boolean
  defaultTestText?: string
  onTestComplete?: (result: any) => void
}

// API request/response types
export interface CreateCollectionRequest {
  name: string
  embedding_function?: string
  distance_function?: 'cosine' | 'l2' | 'ip'
  metadata?: Record<string, any>
}

export interface UpdateCollectionRequest {
  name?: string
  metadata?: Record<string, any>
}

export interface BulkEmbedRequest {
  document_ids: string[]
  collection_name?: string
  force_reprocess?: boolean
}

export interface ClearCollectionRequest {
  collection_name: string
  confirm: boolean
}

// Error types specific to vector operations
export interface VectorDatabaseError {
  code: 'CONNECTION_ERROR' | 'COLLECTION_ERROR' | 'EMBEDDING_ERROR' | 'SEARCH_ERROR' | 'UNKNOWN_ERROR'
  message: string
  details?: Record<string, any>
  suggestions?: string[]
  recoverable: boolean
  retry_after_seconds?: number
}