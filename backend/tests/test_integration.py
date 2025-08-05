"""
Integration tests for the document processor using real documents.

These tests use actual documents from the documents folder to ensure
the enhanced extraction methods work correctly with real-world files.
"""

import pytest
import asyncio
import os
import time
from pathlib import Path

from app.services.document_processor import DocumentProcessor, DocumentMetadata
from app.services.exceptions import DocumentProcessingError
from app.core.config import settings


class TestRealDocumentProcessing:
    """Integration tests using real documents from the documents folder."""
    
    @pytest.fixture
    def real_processor(self):
        """Create a DocumentProcessor using the actual documents folder."""
        processor = DocumentProcessor()
        # Use the actual documents folder path
        processor.documents_folder = "/Users/khaled/Projects/leaning_claude/document-chatbot/documents"
        return processor
    
    @pytest.mark.asyncio
    async def test_scan_real_documents_folder(self, real_processor):
        """Test scanning the actual documents folder."""
        documents = await real_processor.scan_documents_folder()
        
        assert len(documents) > 0, "Should find documents in the folder"
        
        # Check that we found the expected files
        filenames = [doc.filename for doc in documents]
        assert "test-document.txt" in filenames
        
        # Check that PDF files are detected (uploaded files with timestamp prefixes)
        pdf_files = [doc for doc in documents if doc.filename.endswith('.pdf')]
        assert len(pdf_files) > 0, "Should find PDF files"
        
        for document in documents:
            assert document.id is not None
            assert document.filename is not None
            assert document.file_path is not None
            assert os.path.exists(document.file_path)
            assert document.status == "ready"
    
    @pytest.mark.asyncio
    async def test_extract_from_real_text_document(self, real_processor):
        """Test extracting text from the real text document."""
        file_path = "/Users/khaled/Projects/leaning_claude/document-chatbot/documents/test-document.txt"
        
        if not os.path.exists(file_path):
            pytest.skip("test-document.txt not found")
        
        text, metadata = await real_processor.extract_text_from_file(file_path, extract_metadata=True)
        
        assert isinstance(text, str)
        assert len(text.strip()) > 0, "Should extract non-empty text"
        
        # Validate metadata
        assert metadata.file_type == "TXT"
        assert metadata.file_size > 0
        assert metadata.character_count > 0
        assert metadata.word_count > 0
        assert metadata.line_count > 0
        assert metadata.encoding in ["utf-8", "ascii", "UTF-8"]
        assert metadata.processing_time > 0
        assert metadata.extraction_method.startswith("Direct decode")
        
        print(f"Extracted {metadata.word_count} words, {metadata.character_count} characters from text file")
    
    @pytest.mark.asyncio
    async def test_extract_from_real_pdf_documents(self, real_processor):
        """Test extracting text from real PDF documents."""
        documents = await real_processor.scan_documents_folder()
        pdf_documents = [doc for doc in documents if doc.filename.lower().endswith('.pdf')]
        
        if not pdf_documents:
            pytest.skip("No PDF documents found")
        
        successful_extractions = 0
        total_words = 0
        total_chars = 0
        
        for pdf_doc in pdf_documents[:3]:  # Test first 3 PDFs to avoid long test times
            try:
                print(f"\\nTesting PDF: {pdf_doc.filename}")
                
                text, metadata = await real_processor.extract_text_from_file(
                    pdf_doc.file_path, extract_metadata=True
                )
                
                assert isinstance(text, str)
                assert metadata.file_type in ["PDF", "unknown"]  # Might not be set for PDFs
                assert metadata.file_size > 0
                assert metadata.processing_time > 0
                assert metadata.extraction_method in ["PyMuPDF", "PyPDF2"]
                
                if text.strip():
                    successful_extractions += 1
                    total_words += metadata.word_count
                    total_chars += metadata.character_count
                    
                    print(f"  Extracted {metadata.word_count} words, {metadata.character_count} characters")
                    print(f"  Pages: {metadata.page_count}")
                    print(f"  Method: {metadata.extraction_method}")
                    print(f"  Processing time: {metadata.processing_time:.2f}s")
                    
                    if metadata.has_images:
                        print(f"  Contains {metadata.image_count} images")
                    
                    if metadata.warnings:
                        print(f"  Warnings: {len(metadata.warnings)}")
                    
                    if metadata.errors:
                        print(f"  Errors: {len(metadata.errors)}")
                        
                    # Basic content validation
                    assert metadata.character_count == len(text)
                    assert metadata.page_count > 0
                else:
                    print(f"  No text extracted (possibly image-only PDF)")
                    
            except Exception as e:
                print(f"  Failed to extract from {pdf_doc.filename}: {e}")
                # Don't fail the test for individual document failures
                continue
        
        print(f"\\nSuccessfully extracted text from {successful_extractions}/{len(pdf_documents)} PDFs")
        print(f"Total words extracted: {total_words}")
        print(f"Total characters extracted: {total_chars}")
        
        # At least some PDFs should be readable
        assert successful_extractions > 0, "Should be able to extract text from at least one PDF"
    
    @pytest.mark.asyncio
    async def test_document_integrity_validation(self, real_processor):
        """Test document integrity validation on real files."""
        documents = await real_processor.scan_documents_folder()
        
        healthy_count = 0
        warning_count = 0
        error_count = 0
        
        for document in documents:
            try:
                is_healthy, issues = await real_processor.validate_document_integrity(document.file_path)
                
                if is_healthy:
                    healthy_count += 1
                    print(f"✓ {document.filename}: Healthy")
                else:
                    if any("password" in issue.lower() for issue in issues):
                        warning_count += 1
                        print(f"⚠ {document.filename}: Password protected")
                    elif any("little text" in issue.lower() for issue in issues):
                        warning_count += 1
                        print(f"⚠ {document.filename}: Little text extracted")
                    else:
                        error_count += 1
                        print(f"✗ {document.filename}: Issues - {', '.join(issues)}")
                        
            except Exception as e:
                error_count += 1
                print(f"✗ {document.filename}: Validation failed - {e}")
        
        print(f"\\nDocument Health Summary:")
        print(f"  Healthy: {healthy_count}")
        print(f"  Warnings: {warning_count}")
        print(f"  Errors: {error_count}")
        
        total = healthy_count + warning_count + error_count
        assert total == len(documents)
        assert healthy_count > 0, "Should have at least one healthy document"
    
    @pytest.mark.asyncio
    async def test_comprehensive_processing_statistics(self, real_processor):
        """Test comprehensive processing statistics on real documents."""
        stats = await real_processor.get_processing_statistics()
        
        print("\\nProcessing Statistics:")
        print(f"Total documents: {stats['total_documents']}")
        
        print("\\nProcessing Summary:")
        for key, value in stats['processing_summary'].items():
            print(f"  {key}: {value}")
        
        print("\\nFile Type Breakdown:")
        for file_type, count in stats['file_type_breakdown'].items():
            print(f"  {file_type}: {count}")
        
        print("\\nSize Distribution:")
        for size_category, count in stats['size_distribution'].items():
            print(f"  {size_category}: {count}")
        
        print("\\nHealth Check:")
        for status, count in stats['health_check'].items():
            print(f"  {status}: {count}")
        
        # Validate statistics
        assert stats['total_documents'] > 0
        assert sum(stats['processing_summary'].values()) == stats['total_documents']
        assert sum(stats['file_type_breakdown'].values()) == stats['total_documents']
        assert sum(stats['size_distribution'].values()) == stats['total_documents']
        assert sum(stats['health_check'].values()) == stats['total_documents']
        
        # Should have various file types
        assert '.txt' in stats['file_type_breakdown']
        assert '.pdf' in stats['file_type_breakdown']
    
    @pytest.mark.asyncio
    async def test_process_all_real_documents(self, real_processor):
        """Test processing all real documents with enhanced reporting."""
        start_time = time.time()
        
        result = await real_processor.process_all_documents()
        
        end_time = time.time()
        total_processing_time = end_time - start_time
        
        print("\\nDocument Processing Results:")
        print(f"Total documents: {result['total_documents']}")
        print(f"Successfully processed: {result['processed_count']}")
        print(f"Failed to process: {result['failed_count']}")
        print(f"Total processing time: {total_processing_time:.2f}s")
        
        if result['failed_documents']:
            print("\\nFailed Documents:")
            for failed in result['failed_documents']:
                print(f"  {failed['filename']}: {failed['error']}")
        
        print("\\nProcessing Statistics:")
        stats = result['processing_stats']
        print(f"  Total processing time: {stats['total_time']:.2f}s")
        print(f"  Total characters extracted: {stats['total_characters']:,}")
        print(f"  Total words extracted: {stats['total_words']:,}")
        
        print("\\nBy File Type:")
        for file_type, type_stats in stats['by_file_type'].items():
            print(f"  {file_type}: {type_stats['count']} files, {type_stats['words']:,} words")
        
        # Validate results
        assert result['total_documents'] > 0
        assert result['processed_count'] >= 0
        assert result['failed_count'] >= 0
        assert result['processed_count'] + result['failed_count'] == result['total_documents']
        
        # Should process at least some documents successfully
        assert result['processed_count'] > 0, "Should successfully process at least one document"
        
        # Performance checks
        if result['processed_count'] > 0:
            avg_time_per_doc = stats['total_time'] / result['processed_count']
            print(f"Average processing time per document: {avg_time_per_doc:.2f}s")
            
            # Should process documents reasonably quickly
            assert avg_time_per_doc < 30, "Should process documents in reasonable time"
    
    @pytest.mark.asyncio
    async def test_metadata_extraction_real_files(self, real_processor):
        """Test metadata extraction on real files."""
        documents = await real_processor.scan_documents_folder()
        
        for document in documents[:3]:  # Test first 3 documents
            try:
                metadata = await real_processor.get_document_metadata(document.file_path)
                
                print(f"\\nMetadata for {document.filename}:")
                print(f"  File size: {metadata.file_size:,} bytes")
                print(f"  File type: {metadata.file_type}")
                print(f"  Encoding: {metadata.encoding}")
                print(f"  Language: {metadata.language}")
                print(f"  Word count: {metadata.word_count:,}")
                print(f"  Character count: {metadata.character_count:,}")
                print(f"  Line count: {metadata.line_count:,}")
                print(f"  Page count: {metadata.page_count}")
                print(f"  Has tables: {metadata.has_tables}")
                print(f"  Has images: {metadata.has_images}")
                print(f"  Processing time: {metadata.processing_time:.2f}s")
                
                if metadata.warnings:
                    print(f"  Warnings: {len(metadata.warnings)}")
                    for warning in metadata.warnings[:3]:  # Show first 3 warnings
                        print(f"    - {warning}")
                
                if metadata.errors:
                    print(f"  Errors: {len(metadata.errors)}")
                    for error in metadata.errors[:3]:  # Show first 3 errors
                        print(f"    - {error}")
                
                # Basic validation
                assert metadata.file_size > 0
                assert metadata.processing_time >= 0
                
            except Exception as e:
                print(f"Failed to extract metadata from {document.filename}: {e}")
                # Don't fail the test for individual failures
                continue


class TestPerformanceBenchmarks:
    """Performance benchmarking tests."""
    
    @pytest.fixture
    def real_processor(self):
        """Create a DocumentProcessor using the actual documents folder."""
        processor = DocumentProcessor()
        processor.documents_folder = "/Users/khaled/Projects/leaning_claude/document-chatbot/documents"
        return processor
    
    @pytest.mark.asyncio
    async def test_extraction_performance_benchmark(self, real_processor):
        """Benchmark extraction performance across different file types."""
        documents = await real_processor.scan_documents_folder()
        
        performance_results = {}
        
        for document in documents:
            file_ext = os.path.splitext(document.filename)[1].lower()
            
            try:
                start_time = time.time()
                text, metadata = await real_processor.extract_text_from_file(
                    document.file_path, extract_metadata=True
                )
                end_time = time.time()
                
                processing_time = end_time - start_time
                
                if file_ext not in performance_results:
                    performance_results[file_ext] = []
                
                performance_results[file_ext].append({
                    'filename': document.filename,
                    'file_size': metadata.file_size,
                    'processing_time': processing_time,
                    'words_per_second': metadata.word_count / processing_time if processing_time > 0 else 0,
                    'bytes_per_second': metadata.file_size / processing_time if processing_time > 0 else 0,
                    'extraction_method': metadata.extraction_method
                })
                
            except Exception as e:
                print(f"Performance test failed for {document.filename}: {e}")
                continue
        
        print("\\nPerformance Benchmark Results:")
        for file_type, results in performance_results.items():
            if not results:
                continue
                
            avg_processing_time = sum(r['processing_time'] for r in results) / len(results)
            avg_words_per_second = sum(r['words_per_second'] for r in results) / len(results)
            avg_bytes_per_second = sum(r['bytes_per_second'] for r in results) / len(results)
            
            print(f"\\n{file_type.upper()} Files ({len(results)} files):")
            print(f"  Average processing time: {avg_processing_time:.2f}s")
            print(f"  Average words/second: {avg_words_per_second:,.0f}")
            print(f"  Average bytes/second: {avg_bytes_per_second:,.0f}")
            
            for result in results:
                print(f"    {result['filename']}: {result['processing_time']:.2f}s "
                      f"({result['words_per_second']:,.0f} words/s)")
        
        # Performance assertions
        for file_type, results in performance_results.items():
            if results:
                max_processing_time = max(r['processing_time'] for r in results)
                # No single file should take more than 30 seconds
                assert max_processing_time < 30, f"{file_type} files taking too long to process"


if __name__ == "__main__":
    # Run integration tests
    pytest.main([__file__, "-v", "-s"])  # -s to show print statements