"""
Custom exceptions for document processing services.

This module defines specific exceptions for different types of document processing errors,
providing better error handling and debugging capabilities.
"""

from typing import Optional, Dict, Any


class DocumentProcessingError(Exception):
    """Base exception for all document processing errors."""
    
    def __init__(self, message: str, file_path: Optional[str] = None, error_details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.file_path = file_path
        self.error_details = error_details or {}
        super().__init__(self.message)


class UnsupportedFileTypeError(DocumentProcessingError):
    """Raised when attempting to process an unsupported file type."""
    
    def __init__(self, file_path: str, file_type: str, supported_types: list):
        message = f"Unsupported file type '{file_type}'. Supported types: {', '.join(supported_types)}"
        super().__init__(message, file_path, {"file_type": file_type, "supported_types": supported_types})


class FileAccessError(DocumentProcessingError):
    """Raised when there are issues accessing or reading the file."""
    
    def __init__(self, file_path: str, original_error: Exception):
        message = f"Failed to access file: {str(original_error)}"
        super().__init__(message, file_path, {"original_error": str(original_error)})


class PDFExtractionError(DocumentProcessingError):
    """Raised when PDF text extraction fails."""
    
    def __init__(self, file_path: str, page_number: Optional[int] = None, original_error: Optional[Exception] = None):
        if page_number is not None:
            message = f"Failed to extract text from PDF page {page_number}: {str(original_error) if original_error else 'Unknown error'}"
        else:
            message = f"Failed to extract text from PDF: {str(original_error) if original_error else 'Unknown error'}"
        
        error_details = {"page_number": page_number}
        if original_error:
            error_details["original_error"] = str(original_error)
            
        super().__init__(message, file_path, error_details)


class DOCXExtractionError(DocumentProcessingError):
    """Raised when DOCX text extraction fails."""
    
    def __init__(self, file_path: str, section: Optional[str] = None, original_error: Optional[Exception] = None):
        if section:
            message = f"Failed to extract text from DOCX section '{section}': {str(original_error) if original_error else 'Unknown error'}"
        else:
            message = f"Failed to extract text from DOCX: {str(original_error) if original_error else 'Unknown error'}"
        
        error_details = {"section": section}
        if original_error:
            error_details["original_error"] = str(original_error)
            
        super().__init__(message, file_path, error_details)


class TextExtractionError(DocumentProcessingError):
    """Raised when text file extraction fails."""
    
    def __init__(self, file_path: str, encoding: Optional[str] = None, original_error: Optional[Exception] = None):
        if encoding:
            message = f"Failed to extract text using encoding '{encoding}': {str(original_error) if original_error else 'Unknown error'}"
        else:
            message = f"Failed to extract text: {str(original_error) if original_error else 'Unknown error'}"
        
        error_details = {"encoding": encoding}
        if original_error:
            error_details["original_error"] = str(original_error)
            
        super().__init__(message, file_path, error_details)


class CorruptedFileError(DocumentProcessingError):
    """Raised when a file appears to be corrupted or unreadable."""
    
    def __init__(self, file_path: str, corruption_details: Optional[str] = None):
        message = f"File appears to be corrupted: {corruption_details or 'Unknown corruption'}"
        super().__init__(message, file_path, {"corruption_details": corruption_details})


class PasswordProtectedError(DocumentProcessingError):
    """Raised when attempting to process a password-protected file."""
    
    def __init__(self, file_path: str):
        message = "File is password-protected and cannot be processed"
        super().__init__(message, file_path)


class FileSizeError(DocumentProcessingError):
    """Raised when file size exceeds processing limits."""
    
    def __init__(self, file_path: str, file_size: int, max_size: int):
        message = f"File size ({file_size:,} bytes) exceeds maximum allowed size ({max_size:,} bytes)"
        super().__init__(message, file_path, {"file_size": file_size, "max_size": max_size})


class MetadataExtractionError(DocumentProcessingError):
    """Raised when document metadata extraction fails."""
    
    def __init__(self, file_path: str, metadata_type: str, original_error: Optional[Exception] = None):
        message = f"Failed to extract {metadata_type} metadata: {str(original_error) if original_error else 'Unknown error'}"
        
        error_details = {"metadata_type": metadata_type}
        if original_error:
            error_details["original_error"] = str(original_error)
            
        super().__init__(message, file_path, error_details)


class EmptyDocumentError(DocumentProcessingError):
    """Raised when a document contains no extractable text."""
    
    def __init__(self, file_path: str):
        message = "Document contains no extractable text content"
        super().__init__(message, file_path)