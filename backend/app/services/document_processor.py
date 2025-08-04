import os
import uuid
import magic
import re
import aiofiles
from datetime import datetime
from typing import List, Tuple, Optional
from pathlib import Path
from fastapi import UploadFile
from app.models.document import Document, UploadedFileInfo, UploadValidationError
from app.core.config import settings
import PyPDF2
from docx import Document as DocxDocument
import markdown

class DocumentProcessor:
    def __init__(self):
        self.documents_folder = settings.documents_folder
    
    async def scan_documents_folder(self) -> List[Document]:
        """Scan the documents folder and return list of documents"""
        documents = []
        
        if not os.path.exists(self.documents_folder):
            return documents
        
        for filename in os.listdir(self.documents_folder):
            if self._is_supported_file(filename):
                file_path = os.path.join(self.documents_folder, filename)
                
                # Extract original filename if this was an uploaded file
                display_filename = self._extract_original_filename(filename)
                
                document = Document(
                    id=str(uuid.uuid4()),
                    filename=display_filename,
                    file_path=file_path,
                    status="ready",
                    created_at=datetime.fromtimestamp(os.path.getctime(file_path)),
                    chunk_count=0
                )
                documents.append(document)
        
        return documents
    
    def _extract_original_filename(self, filename: str) -> str:
        """Extract original filename from uploaded file naming convention"""
        # Check if filename follows our upload naming pattern: YYYYMMDD_HHMMSS_XXXXXXXX_originalname.ext
        import re
        pattern = r'^\d{8}_\d{6}_[a-f0-9]{8}_(.+)$'
        match = re.match(pattern, filename)
        
        if match:
            return match.group(1)  # Return the original filename part
        else:
            return filename  # Return as-is for non-uploaded files
    
    def _is_supported_file(self, filename: str) -> bool:
        """Check if file type is supported"""
        supported_extensions = ['.pdf', '.docx', '.txt', '.md']
        return any(filename.lower().endswith(ext) for ext in supported_extensions)
    
    async def extract_text_from_file(self, file_path: str) -> str:
        """Extract text from a file based on its type"""
        filename = os.path.basename(file_path).lower()
        
        try:
            if filename.endswith('.pdf'):
                return self._extract_from_pdf(file_path)
            elif filename.endswith('.docx'):
                return self._extract_from_docx(file_path)
            elif filename.endswith('.txt'):
                return self._extract_from_txt(file_path)
            elif filename.endswith('.md'):
                return self._extract_from_markdown(file_path)
            else:
                return ""
        except Exception as e:
            print(f"Error extracting text from {file_path}: {e}")
            return ""
    
    def _extract_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text
    
    def _extract_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        doc = DocxDocument(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    
    def _extract_from_txt(self, file_path: str) -> str:
        """Extract text from TXT file"""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    def _extract_from_markdown(self, file_path: str) -> str:
        """Extract text from Markdown file"""
        with open(file_path, 'r', encoding='utf-8') as file:
            md_content = file.read()
            # Convert markdown to plain text (basic)
            return markdown.markdown(md_content)
    
    async def process_all_documents(self) -> dict:
        """Process all documents in the folder"""
        documents = await self.scan_documents_folder()
        processed_count = 0
        
        for document in documents:
            try:
                text = await self.extract_text_from_file(document.file_path)
                if text.strip():
                    processed_count += 1
                    # Here we would normally chunk the text and create embeddings
                    # For now, just count as processed
            except Exception as e:
                print(f"Error processing {document.filename}: {e}")
        
        return {
            "total_documents": len(documents),
            "processed_count": processed_count
        }
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent directory traversal and other security issues"""
        # Remove directory components
        filename = os.path.basename(filename)
        
        # Remove or replace dangerous characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        # Remove leading/trailing dots and spaces
        filename = filename.strip('. ')
        
        # Ensure filename is not empty and not reserved
        if not filename or filename.lower() in ['con', 'prn', 'aux', 'nul'] + [f'com{i}' for i in range(1, 10)] + [f'lpt{i}' for i in range(1, 10)]:
            filename = f"file_{uuid.uuid4().hex[:8]}"
        
        return filename
    
    def _generate_unique_filename(self, original_filename: str) -> str:
        """Generate a unique filename with timestamp and UUID to prevent conflicts"""
        sanitized = self._sanitize_filename(original_filename)
        name, ext = os.path.splitext(sanitized)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        return f"{timestamp}_{unique_id}_{name}{ext}"
    
    def _validate_file_type(self, file_content: bytes, filename: str) -> Tuple[bool, str, str]:
        """Validate file type using both extension and MIME type detection"""
        # Check extension
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in settings.allowed_extensions:
            return False, "Invalid file extension", ""
        
        # Detect MIME type from content
        try:
            mime_type = magic.from_buffer(file_content, mime=True)
        except Exception as e:
            return False, f"Failed to detect file type: {str(e)}", ""
        
        # Check if MIME type is allowed
        if mime_type not in settings.allowed_file_types:
            # Handle some common MIME type variations
            mime_mappings = {
                "text/x-markdown": "text/markdown",
                "application/x-empty": "text/plain"  # Empty files
            }
            mime_type = mime_mappings.get(mime_type, mime_type)
            
            if mime_type not in settings.allowed_file_types:
                return False, f"File type not allowed: {mime_type}", mime_type
        
        return True, "Valid", mime_type
    
    def _validate_file_size(self, file_size: int) -> Tuple[bool, str]:
        """Validate file size against configured limits"""
        if file_size > settings.max_file_size_bytes:
            return False, f"File size ({file_size / 1024 / 1024:.2f}MB) exceeds maximum allowed size ({settings.max_file_size_mb}MB)"
        
        if file_size == 0:
            return False, "File is empty"
        
        return True, "Valid"
    
    async def validate_upload_file(self, upload_file: UploadFile) -> Tuple[bool, List[UploadValidationError]]:
        """Validate an uploaded file for size, type, and content"""
        errors = []
        
        if not upload_file.filename:
            errors.append(UploadValidationError(
                filename="unknown",
                error_type="filename",
                message="No filename provided"
            ))
            return False, errors
        
        # Read file content for validation
        try:
            file_content = await upload_file.read()
            await upload_file.seek(0)  # Reset file pointer
        except Exception as e:
            errors.append(UploadValidationError(
                filename=upload_file.filename,
                error_type="read_error",
                message=f"Failed to read file: {str(e)}"
            ))
            return False, errors
        
        # Validate file size
        file_size = len(file_content)
        size_valid, size_message = self._validate_file_size(file_size)
        if not size_valid:
            errors.append(UploadValidationError(
                filename=upload_file.filename,
                error_type="size",
                message=size_message
            ))
        
        # Validate file type
        type_valid, type_message, mime_type = self._validate_file_type(file_content, upload_file.filename)
        if not type_valid:
            errors.append(UploadValidationError(
                filename=upload_file.filename,
                error_type="type",
                message=type_message
            ))
        
        return len(errors) == 0, errors
    
    async def save_uploaded_file(self, upload_file: UploadFile) -> UploadedFileInfo:
        """Save an uploaded file to the documents folder"""
        # Generate unique filename
        unique_filename = self._generate_unique_filename(upload_file.filename)
        file_path = os.path.join(self.documents_folder, unique_filename)
        
        # Ensure documents folder exists
        os.makedirs(self.documents_folder, exist_ok=True)
        
        # Read file content
        file_content = await upload_file.read()
        
        # Get MIME type
        try:
            mime_type = magic.from_buffer(file_content, mime=True)
        except Exception:
            # Fallback to content type from upload
            mime_type = upload_file.content_type or "application/octet-stream"
        
        # Save file asynchronously
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        # Create file info
        file_info = UploadedFileInfo(
            original_filename=upload_file.filename,
            saved_filename=unique_filename,
            file_size=len(file_content),
            content_type=mime_type,
            upload_timestamp=datetime.now(),
            document_id=str(uuid.uuid4())
        )
        
        return file_info
    
    async def process_file_uploads(self, upload_files: List[UploadFile]) -> Tuple[List[UploadedFileInfo], List[UploadValidationError]]:
        """Process multiple file uploads with validation"""
        uploaded_files = []
        all_errors = []
        
        # Validate number of files
        if len(upload_files) > settings.max_files_per_upload:
            all_errors.append(UploadValidationError(
                filename="multiple",
                error_type="count",
                message=f"Too many files. Maximum {settings.max_files_per_upload} files allowed per upload."
            ))
            return uploaded_files, all_errors
        
        # Process each file
        for upload_file in upload_files:
            try:
                # Validate file
                is_valid, validation_errors = await self.validate_upload_file(upload_file)
                
                if is_valid:
                    # Save file
                    file_info = await self.save_uploaded_file(upload_file)
                    uploaded_files.append(file_info)
                else:
                    all_errors.extend(validation_errors)
                    
            except Exception as e:
                all_errors.append(UploadValidationError(
                    filename=upload_file.filename or "unknown",
                    error_type="processing",
                    message=f"Unexpected error processing file: {str(e)}"
                ))
        
        return uploaded_files, all_errors
    
    async def get_upload_statistics(self) -> dict:
        """Get statistics about uploaded files"""
        if not os.path.exists(self.documents_folder):
            return {"total_files": 0, "uploaded_files": 0, "original_files": 0}
        
        total_files = 0
        uploaded_files = 0
        original_files = 0
        
        for filename in os.listdir(self.documents_folder):
            if self._is_supported_file(filename):
                total_files += 1
                # Check if it's an uploaded file based on naming pattern
                if re.match(r'^\d{8}_\d{6}_[a-f0-9]{8}_', filename):
                    uploaded_files += 1
                else:
                    original_files += 1
        
        return {
            "total_files": total_files,
            "uploaded_files": uploaded_files,
            "original_files": original_files
        }