from fastapi import APIRouter, HTTPException, UploadFile, File, status
from typing import List
from app.models.document import DocumentListResponse, Document, DocumentUploadResponse
from app.services.document_processor import DocumentProcessor
from datetime import datetime
import os

router = APIRouter()
doc_processor = DocumentProcessor()

@router.get("/documents", response_model=DocumentListResponse)
async def list_documents():
    """List all documents in the documents folder"""
    try:
        documents = await doc_processor.scan_documents_folder()
        return DocumentListResponse(
            documents=documents,
            total_count=len(documents)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")

@router.post("/documents/process")
async def process_documents():
    """Process all documents in the folder"""
    try:
        result = await doc_processor.process_all_documents()
        return {"message": "Documents processing started", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing documents: {str(e)}")

@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    """Get details of a specific document"""
    return {"document_id": document_id, "status": "placeholder"}

@router.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_documents(
    files: List[UploadFile] = File(..., description="Documents to upload (PDF, DOCX, TXT, MD)")
):
    """
    Upload multiple documents to the system.
    
    Supports file types: PDF, DOCX, TXT, MD
    Maximum file size: 10MB per file
    Maximum files per upload: 10 files
    """
    try:
        # Validate that files were provided
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files provided for upload"
            )
        
        # Process file uploads
        uploaded_files, errors = await doc_processor.process_file_uploads(files)
        
        # Prepare response
        error_messages = [f"{error.filename}: {error.message}" for error in errors]
        
        # Determine response status and message
        success_count = len(uploaded_files)
        error_count = len(errors)
        
        if success_count == 0 and error_count > 0:
            # All files failed
            response_message = "All file uploads failed"
            response_status = status.HTTP_400_BAD_REQUEST
        elif success_count > 0 and error_count > 0:
            # Partial success
            response_message = f"Uploaded {success_count} files successfully, {error_count} failed"
            response_status = status.HTTP_207_MULTI_STATUS
        else:
            # All files succeeded
            response_message = f"Successfully uploaded {success_count} files"
            response_status = status.HTTP_201_CREATED
        
        response = DocumentUploadResponse(
            message=response_message,
            uploaded_files=uploaded_files,
            success_count=success_count,
            error_count=error_count,
            errors=error_messages if error_messages else None
        )
        
        # For partial failures, we still want to return a success status
        # but include error information in the response
        if error_count > 0 and success_count == 0:
            raise HTTPException(
                status_code=response_status,
                detail=response.dict()
            )
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during file upload: {str(e)}"
        )