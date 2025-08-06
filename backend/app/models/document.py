from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class Document(BaseModel):
    id: str
    filename: str
    file_path: str
    status: str  # "processing", "ready", "error"
    created_at: datetime
    chunk_count: Optional[int] = 0

class DocumentListResponse(BaseModel):
    documents: List[Document]
    total_count: int

class UploadedFileInfo(BaseModel):
    """Information about an uploaded file"""
    original_filename: str
    saved_filename: str
    file_size: int
    content_type: str
    upload_timestamp: datetime
    document_id: str
    integrity_warnings: Optional[List[str]] = []

class DocumentUploadResponse(BaseModel):
    """Response for document upload endpoint"""
    message: str
    uploaded_files: List[UploadedFileInfo]
    success_count: int
    error_count: int
    errors: Optional[List[str]] = None

class UploadValidationError(BaseModel):
    """Model for upload validation errors"""
    filename: str
    error_type: str
    message: str

class ProcessingStatus(BaseModel):
    """Status information for document processing"""
    document_id: str
    filename: str
    status: str  # "pending", "processing", "chunking", "embedding", "completed", "failed"
    progress: float  # 0.0 to 1.0
    chunks_created: int = 0
    embeddings_generated: int = 0
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time_seconds: Optional[float] = None

class DocumentProcessingResult(BaseModel):
    """Complete result of document processing"""
    total_documents: int
    processed_count: int
    failed_count: int
    total_chunks_created: int
    total_embeddings_generated: int
    processing_time_seconds: float
    failed_documents: List[Dict[str, Any]]
    processing_stats: Dict[str, Any]
    status_details: List[ProcessingStatus]