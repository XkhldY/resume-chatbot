from pydantic import BaseModel, Field
from typing import List, Optional
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