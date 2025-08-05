"""
Comprehensive tests for the enhanced document processor.

This test suite covers all extraction methods, error handling, metadata extraction,
and edge cases for the DocumentProcessor class.
"""

import pytest
import asyncio
import os
import tempfile
import shutil
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

# Import the components to test
from app.services.document_processor import DocumentProcessor, DocumentMetadata
from app.services.exceptions import (
    DocumentProcessingError, UnsupportedFileTypeError, FileAccessError,
    PDFExtractionError, DOCXExtractionError, TextExtractionError,
    CorruptedFileError, PasswordProtectedError, FileSizeError,
    MetadataExtractionError, EmptyDocumentError
)
from app.core.config import settings


@pytest.fixture
def temp_documents_dir():
    """Create a temporary directory for test documents."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def processor(temp_documents_dir):
    """Create a DocumentProcessor instance with temporary directory."""
    with patch.object(settings, 'documents_folder', temp_documents_dir):
        processor = DocumentProcessor()
        processor.documents_folder = temp_documents_dir
        return processor


@pytest.fixture
def sample_text_content():
    """Sample text content for testing."""
    return """This is a sample document for testing purposes.
    
It contains multiple paragraphs with various formatting.

• Bullet points
• Multiple items
    
And some special characters: é, ñ, ü, ß

Numbers: 123, 456.78, $99.99

Email: test@example.com
URL: https://example.com
    """


class TestDocumentMetadata:
    """Test the DocumentMetadata class."""
    
    def test_metadata_initialization(self):
        """Test metadata initialization with default values."""
        metadata = DocumentMetadata("/test/path.txt", 1024)
        
        assert metadata.file_path == "/test/path.txt"
        assert metadata.file_size == 1024
        assert metadata.word_count == 0
        assert metadata.character_count == 0
        assert metadata.language == "unknown"
        assert metadata.errors == []
        assert metadata.warnings == []
    
    def test_metadata_to_dict(self):
        """Test metadata conversion to dictionary."""
        metadata = DocumentMetadata("/test/path.txt", 1024)
        metadata.word_count = 100
        metadata.language = "en"
        metadata.creation_date = datetime(2023, 1, 1, 12, 0, 0)
        
        result = metadata.to_dict()
        
        assert result["file_path"] == "/test/path.txt"
        assert result["file_size"] == 1024
        assert result["word_count"] == 100
        assert result["language"] == "en"
        assert result["creation_date"] == "2023-01-01T12:00:00"


class TestDocumentProcessorInitialization:
    """Test DocumentProcessor initialization and setup."""
    
    def test_processor_initialization(self, processor):
        """Test processor initialization."""
        assert processor.documents_folder is not None
        assert processor.max_file_size > 0
        assert len(processor.supported_encodings) > 0
        assert 'utf-8' in processor.supported_encodings
    
    def test_supported_file_detection(self, processor):
        """Test supported file type detection."""
        assert processor._is_supported_file("test.pdf")
        assert processor._is_supported_file("test.docx")
        assert processor._is_supported_file("test.txt")
        assert processor._is_supported_file("test.md")
        assert processor._is_supported_file("TEST.PDF")  # Case insensitive
        
        assert not processor._is_supported_file("test.exe")
        assert not processor._is_supported_file("test.jpg")
        assert not processor._is_supported_file("test")  # No extension


class TestTextCleaning:
    """Test text cleaning and normalization utilities."""
    
    def test_clean_and_normalize_basic(self, processor):
        """Test basic text cleaning."""
        dirty_text = "  This   has    excessive    whitespace  \n\n\n\nAnd many empty lines\n\n\n  "
        
        cleaned = processor._clean_and_normalize_text(dirty_text)
        
        assert "excessive    whitespace" not in cleaned
        assert "This has excessive whitespace" in cleaned
        assert cleaned.count('\n\n\n') == 0  # No more than 2 consecutive empty lines
    
    def test_clean_and_normalize_unicode(self, processor):
        """Test Unicode normalization."""
        unicode_text = "Café naïve résumé"  # Various accented characters
        
        cleaned = processor._clean_and_normalize_text(unicode_text)
        
        assert "Café" in cleaned
        assert "naïve" in cleaned
        assert "résumé" in cleaned
    
    def test_clean_empty_text(self, processor):
        """Test cleaning empty or whitespace-only text."""
        assert processor._clean_and_normalize_text("") == ""
        assert processor._clean_and_normalize_text("   \n\n   ") == ""
        assert processor._clean_and_normalize_text(None) is None


class TestTextFileExtraction:
    """Test enhanced text file extraction."""
    
    @pytest.mark.asyncio
    async def test_extract_utf8_text(self, processor, temp_documents_dir, sample_text_content):
        """Test extracting UTF-8 text file."""
        file_path = os.path.join(temp_documents_dir, "test.txt")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(sample_text_content)
        
        text, metadata = await processor.extract_text_from_file(file_path, extract_metadata=True)
        
        assert sample_text_content.strip() in text
        assert metadata.file_type == "TXT"
        assert metadata.encoding == "utf-8"
        assert metadata.word_count > 0
        assert metadata.character_count > 0
        assert metadata.extraction_method.startswith("Direct decode")
    
    @pytest.mark.asyncio
    async def test_extract_latin1_text(self, processor, temp_documents_dir):
        """Test extracting Latin-1 encoded text file."""
        file_path = os.path.join(temp_documents_dir, "test.txt")
        content = "Café naïve résumé"
        
        with open(file_path, 'w', encoding='latin-1') as f:
            f.write(content)
        
        text, metadata = await processor.extract_text_from_file(file_path, extract_metadata=True)
        
        assert "Café" in text
        assert metadata.encoding in ["latin-1", "ISO-8859-1"]  # chardet may detect as ISO-8859-1
    
    @pytest.mark.asyncio
    async def test_extract_corrupted_encoding(self, processor, temp_documents_dir):
        """Test extracting file with encoding issues."""
        file_path = os.path.join(temp_documents_dir, "test.txt")
        
        # Write some bytes that will cause encoding issues
        with open(file_path, 'wb') as f:
            f.write(b'Valid text\x80\x81\x82 more text')
        
        text, metadata = await processor.extract_text_from_file(file_path, extract_metadata=True)
        
        assert "Valid text" in text
        assert "more text" in text
        assert "with error recovery" in metadata.extraction_method
        assert len(metadata.warnings) > 0
    
    @pytest.mark.asyncio
    async def test_extract_empty_text_file(self, processor, temp_documents_dir):
        """Test extracting empty text file."""
        file_path = os.path.join(temp_documents_dir, "empty.txt")
        
        with open(file_path, 'w') as f:
            f.write("")
        
        text, metadata = await processor.extract_text_from_file(file_path, extract_metadata=True)
        
        assert text == ""
        assert metadata.character_count == 0
        assert metadata.word_count == 0
        assert "No text could be extracted" in str(metadata.warnings)


class TestMarkdownExtraction:
    """Test enhanced Markdown extraction."""
    
    @pytest.mark.asyncio
    async def test_extract_basic_markdown(self, processor, temp_documents_dir):
        """Test extracting basic Markdown content."""
        file_path = os.path.join(temp_documents_dir, "test.md")
        markdown_content = """# Main Title
        
## Subtitle

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2

```python
def hello():
    print("Hello, world!")
```

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
"""
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        text, metadata = await processor.extract_text_from_file(file_path, extract_metadata=True)
        
        assert "Main Title" in text
        assert "Subtitle" in text
        assert "bold" in text and "italic" in text
        assert "List item 1" in text
        assert "Hello, world!" in text  # Code block should be included
        assert "Value 1" in text  # Table content should be included
        
        assert metadata.file_type == "Markdown"
        assert metadata.has_tables
        assert metadata.table_count == 1
        assert metadata.extraction_method == "markdown + BeautifulSoup"


class TestPDFExtraction:
    """Test enhanced PDF extraction with fallback methods."""
    
    @pytest.mark.asyncio
    async def test_extract_pdf_file_not_found(self, processor):
        """Test PDF extraction with non-existent file."""
        with pytest.raises(FileAccessError):
            await processor.extract_text_from_file("/nonexistent/file.pdf")
    
    @pytest.mark.asyncio
    async def test_extract_pdf_password_protected(self, processor, temp_documents_dir):
        """Test handling of password-protected PDFs."""
        file_path = os.path.join(temp_documents_dir, "protected.pdf")
        
        # Create a mock PDF file that appears password-protected
        with open(file_path, 'wb') as f:
            f.write(b'%PDF-1.4\n%encrypted content')
        
        # Mock the PDF libraries to simulate password protection
        with patch('fitz.open') as mock_fitz, \
             patch('PyPDF2.PdfReader') as mock_pypdf:
            
            mock_doc = MagicMock()
            mock_doc.is_encrypted = True
            mock_fitz.return_value = mock_doc
            
            mock_reader = MagicMock()
            mock_reader.is_encrypted = True
            mock_pypdf.return_value = mock_reader
            
            with pytest.raises(PasswordProtectedError):
                await processor.extract_text_from_file(file_path)
    
    @pytest.mark.asyncio
    async def test_pdf_extraction_fallback(self, processor, temp_documents_dir):
        """Test PDF extraction fallback from PyMuPDF to PyPDF2."""
        file_path = os.path.join(temp_documents_dir, "test.pdf")
        
        with open(file_path, 'wb') as f:
            f.write(b'%PDF-1.4\nfake pdf content')
        
        with patch('fitz.open') as mock_fitz, \
             patch('PyPDF2.PdfReader') as mock_pypdf:
            
            # Make PyMuPDF fail
            mock_fitz.side_effect = Exception("PyMuPDF failed")
            
            # Make PyPDF2 succeed
            mock_reader = MagicMock()
            mock_reader.is_encrypted = False
            mock_page = MagicMock()
            mock_page.extract_text.return_value = "Extracted text from PyPDF2"
            mock_reader.pages = [mock_page]
            mock_pypdf.return_value = mock_reader
            
            text, metadata = await processor.extract_text_from_file(file_path, extract_metadata=True)
            
            assert "Extracted text from PyPDF2" in text
            assert metadata.extraction_method == "PyPDF2"
            assert metadata.page_count == 1


class TestDOCXExtraction:
    """Test enhanced DOCX extraction with tables."""
    
    @pytest.mark.asyncio
    async def test_extract_docx_with_tables(self, processor, temp_documents_dir):
        """Test DOCX extraction including table content."""
        file_path = os.path.join(temp_documents_dir, "test.docx")
        
        # Mock the docx library
        with patch('docx.Document') as mock_docx:
            mock_doc = MagicMock()
            
            # Mock paragraphs
            mock_para1 = MagicMock()
            mock_para1.text = "First paragraph"
            mock_para2 = MagicMock()
            mock_para2.text = "Second paragraph"
            mock_doc.paragraphs = [mock_para1, mock_para2]
            
            # Mock tables
            mock_table = MagicMock()
            mock_row1 = MagicMock()
            mock_row2 = MagicMock()
            
            mock_cell1 = MagicMock()
            mock_cell1.text = "Header 1"
            mock_cell2 = MagicMock()
            mock_cell2.text = "Header 2"
            mock_row1.cells = [mock_cell1, mock_cell2]
            
            mock_cell3 = MagicMock()
            mock_cell3.text = "Data 1"
            mock_cell4 = MagicMock()
            mock_cell4.text = "Data 2"
            mock_row2.cells = [mock_cell3, mock_cell4]
            
            mock_table.rows = [mock_row1, mock_row2]
            mock_doc.tables = [mock_table]
            
            mock_docx.return_value = mock_doc
            
            # Create a dummy file
            with open(file_path, 'wb') as f:
                f.write(b'fake docx content')
            
            text, metadata = await processor.extract_text_from_file(file_path, extract_metadata=True)
            
            assert "First paragraph" in text
            assert "Second paragraph" in text
            assert "Header 1" in text
            assert "Data 1" in text
            assert "--- Table 1 ---" in text
            
            assert metadata.file_type == "DOCX"
            assert metadata.has_tables
            assert metadata.table_count == 1
            assert metadata.extraction_method == "python-docx"


class TestFileValidation:
    """Test document integrity validation."""
    
    @pytest.mark.asyncio
    async def test_validate_nonexistent_file(self, processor):
        """Test validation of non-existent file."""
        is_valid, issues = await processor.validate_document_integrity("/nonexistent/file.txt")
        
        assert not is_valid
        assert "File does not exist" in issues[0]
    
    @pytest.mark.asyncio
    async def test_validate_empty_file(self, processor, temp_documents_dir):
        """Test validation of empty file."""
        file_path = os.path.join(temp_documents_dir, "empty.txt")
        
        with open(file_path, 'w') as f:
            f.write("")
        
        is_valid, issues = await processor.validate_document_integrity(file_path)
        
        assert not is_valid
        assert "File is empty" in issues[0]
    
    @pytest.mark.asyncio
    async def test_validate_oversized_file(self, processor, temp_documents_dir):
        """Test validation of oversized file."""
        file_path = os.path.join(temp_documents_dir, "large.txt")
        
        # Create a file larger than the limit
        original_max_size = processor.max_file_size
        processor.max_file_size = 100  # Set very small limit
        
        with open(file_path, 'w') as f:
            f.write("x" * 200)  # Write more than limit
        
        try:
            is_valid, issues = await processor.validate_document_integrity(file_path)
            
            assert not is_valid
            assert "exceeds maximum" in issues[0].lower()
        finally:
            processor.max_file_size = original_max_size
    
    @pytest.mark.asyncio
    async def test_validate_valid_file(self, processor, temp_documents_dir, sample_text_content):
        """Test validation of valid file."""
        file_path = os.path.join(temp_documents_dir, "valid.txt")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(sample_text_content)
        
        is_valid, issues = await processor.validate_document_integrity(file_path)
        
        assert is_valid
        assert len(issues) == 0


class TestMetadataExtraction:
    """Test document metadata extraction."""
    
    @pytest.mark.asyncio
    async def test_analyze_text_metadata(self, processor, sample_text_content):
        """Test text analysis for metadata."""
        metadata = DocumentMetadata("/test/path.txt")
        
        processor._analyze_text_metadata(sample_text_content, metadata)
        
        assert metadata.character_count > 0
        assert metadata.word_count > 0
        assert metadata.line_count > 0
        # Language detection might work depending on text content
        assert metadata.language in ["en", "unknown"]  # May detect English or fail
    
    @pytest.mark.asyncio
    async def test_get_metadata_for_missing_file(self, processor):
        """Test metadata extraction for missing file."""
        metadata = await processor.get_document_metadata("/nonexistent/file.txt")
        
        assert len(metadata.errors) > 0
        assert "failed" in metadata.errors[0].lower()


class TestProcessingStatistics:
    """Test document processing statistics."""
    
    @pytest.mark.asyncio
    async def test_empty_folder_statistics(self, processor):
        """Test statistics for empty document folder."""
        stats = await processor.get_processing_statistics()
        
        assert stats["total_documents"] == 0
        assert stats["health_check"]["healthy"] == 0
        assert stats["health_check"]["errors"] == 0
    
    @pytest.mark.asyncio
    async def test_mixed_documents_statistics(self, processor, temp_documents_dir, sample_text_content):
        """Test statistics for folder with mixed document types."""
        # Create valid file
        valid_path = os.path.join(temp_documents_dir, "valid.txt")
        with open(valid_path, 'w', encoding='utf-8') as f:
            f.write(sample_text_content)
        
        # Create empty file
        empty_path = os.path.join(temp_documents_dir, "empty.txt")
        with open(empty_path, 'w') as f:
            f.write("")
        
        # Create large file
        large_path = os.path.join(temp_documents_dir, "large.pdf")
        with open(large_path, 'wb') as f:
            f.write(b'x' * 1000)  # Small file for testing
        
        stats = await processor.get_processing_statistics()
        
        assert stats["total_documents"] == 3
        assert ".txt" in stats["file_type_breakdown"]
        assert ".pdf" in stats["file_type_breakdown"]
        assert stats["file_type_breakdown"][".txt"] == 2
        assert stats["file_type_breakdown"][".pdf"] == 1
        
        # Size distribution
        assert stats["size_distribution"]["small"] > 0
        
        # Health check (depends on actual validation results)
        total_health = (stats["health_check"]["healthy"] + 
                       stats["health_check"]["warnings"] + 
                       stats["health_check"]["errors"])
        assert total_health == 3


class TestErrorHandling:
    """Test comprehensive error handling."""
    
    @pytest.mark.asyncio
    async def test_unsupported_file_type(self, processor, temp_documents_dir):
        """Test handling unsupported file types."""
        file_path = os.path.join(temp_documents_dir, "test.exe")
        
        with open(file_path, 'wb') as f:
            f.write(b'fake exe content')
        
        with pytest.raises(UnsupportedFileTypeError) as exc_info:
            await processor.extract_text_from_file(file_path)
        
        assert ".exe" in str(exc_info.value)
        assert "Supported types" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_file_access_error(self, processor):
        """Test file access errors."""
        with pytest.raises(FileAccessError):
            await processor.extract_text_from_file("/nonexistent/path/file.txt")
    
    @pytest.mark.asyncio
    async def test_file_size_error(self, processor, temp_documents_dir):
        """Test file size limit errors."""
        file_path = os.path.join(temp_documents_dir, "huge.txt")
        
        # Temporarily set a very small max file size
        original_max_size = processor.max_file_size
        processor.max_file_size = 10
        
        try:
            with open(file_path, 'w') as f:
                f.write("This file is too large for the test limit")
            
            with pytest.raises(FileSizeError) as exc_info:
                await processor.extract_text_from_file(file_path)
            
            assert "exceeds maximum" in str(exc_info.value)
        finally:
            processor.max_file_size = original_max_size


# Integration test fixtures and helpers
@pytest.fixture
def create_test_documents(temp_documents_dir, sample_text_content):
    """Create a variety of test documents for integration testing."""
    documents = {}
    
    # Create a simple text file
    txt_path = os.path.join(temp_documents_dir, "sample.txt")
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(sample_text_content)
    documents['txt'] = txt_path
    
    # Create a markdown file
    md_path = os.path.join(temp_documents_dir, "sample.md")
    markdown_content = """# Test Document

This is a **test** document with *formatting*.

## Features

- Lists
- Tables
- Code blocks

```python
print("Hello, world!")
```

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
"""
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    documents['md'] = md_path
    
    return documents


class TestIntegration:
    """Integration tests using real document processing."""
    
    @pytest.mark.asyncio
    async def test_process_multiple_documents(self, processor, create_test_documents):
        """Test processing multiple different document types."""
        result = await processor.process_all_documents()
        
        assert result["total_documents"] >= 2
        assert result["processed_count"] > 0
        assert "processing_stats" in result
        assert result["processing_stats"]["total_words"] > 0
        assert result["processing_stats"]["total_characters"] > 0
    
    @pytest.mark.asyncio
    async def test_scan_and_extract_workflow(self, processor, create_test_documents):
        """Test the complete workflow of scanning and extracting documents."""
        # Scan documents
        documents = await processor.scan_documents_folder()
        assert len(documents) >= 2
        
        # Extract text from each document
        for document in documents:
            text, metadata = await processor.extract_text_from_file(
                document.file_path, extract_metadata=True
            )
            
            assert isinstance(text, str)
            assert isinstance(metadata, DocumentMetadata)
            assert metadata.file_size > 0
            assert metadata.processing_time > 0
            
            if text.strip():  # If text was extracted
                assert metadata.character_count > 0
                assert metadata.word_count > 0


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])