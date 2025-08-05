"""
Edge case and performance tests for the document processor.

This test suite covers edge cases, stress testing, and performance benchmarks
for the enhanced document processing functionality.
"""

import pytest
import asyncio
import os
import tempfile
import shutil
import time
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch, MagicMock

from app.services.document_processor import DocumentProcessor, DocumentMetadata
from app.services.exceptions import (
    DocumentProcessingError, FileSizeError, PasswordProtectedError,
    TextExtractionError, PDFExtractionError, DOCXExtractionError
)


class TestEdgeCases:
    """Test edge cases and unusual scenarios."""
    
    @pytest.fixture
    def processor_with_limits(self, temp_documents_dir):
        """Create processor with custom limits for testing."""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.documents_folder = temp_documents_dir
            processor = DocumentProcessor()
            processor.documents_folder = temp_documents_dir
            processor.max_file_size = 1024  # 1KB limit for testing
            return processor
    
    @pytest.mark.asyncio
    async def test_extract_from_binary_file_as_text(self, processor, temp_documents_dir):
        """Test attempting to extract text from a binary file."""
        binary_path = os.path.join(temp_documents_dir, "binary.txt")
        
        # Create a file with binary content
        with open(binary_path, 'wb') as f:
            f.write(b'\\x00\\x01\\x02\\x03\\xFF\\xFE\\xFD' + b'Some text' + b'\\x80\\x81\\x82')
        
        text, metadata = await processor.extract_text_from_file(binary_path, extract_metadata=True)
        
        # Should extract some text using error recovery
        assert "Some text" in text
        assert "with error recovery" in metadata.extraction_method
        assert len(metadata.warnings) > 0
    
    @pytest.mark.asyncio
    async def test_extract_from_very_long_lines(self, processor, temp_documents_dir):
        """Test extracting from file with extremely long lines."""
        long_line_path = os.path.join(temp_documents_dir, "long_lines.txt")
        
        # Create file with very long lines
        long_line = "This is a very long line. " * 1000  # ~26KB line
        content = long_line + "\\n" + "Short line" + "\\n" + long_line
        
        with open(long_line_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        text, metadata = await processor.extract_text_from_file(long_line_path, extract_metadata=True)
        
        assert "very long line" in text
        assert "Short line" in text
        assert metadata.line_count == 3
        assert metadata.character_count > 50000
    
    @pytest.mark.asyncio
    async def test_extract_from_file_with_null_bytes(self, processor, temp_documents_dir):
        """Test extracting from file containing null bytes."""
        null_bytes_path = os.path.join(temp_documents_dir, "null_bytes.txt")
        
        content = "Start of file\\x00null byte here\\x00and another\\x00end of file"
        
        with open(null_bytes_path, 'wb') as f:
            f.write(content.encode('utf-8'))
        
        text, metadata = await processor.extract_text_from_file(null_bytes_path, extract_metadata=True)
        
        # Null bytes should be cleaned out
        assert "\\x00" not in text
        assert "Start of file" in text
        assert "end of file" in text
    
    @pytest.mark.asyncio
    async def test_extract_from_file_with_mixed_encodings(self, processor, temp_documents_dir):
        """Test file that appears to have mixed encodings (corrupted)."""
        mixed_path = os.path.join(temp_documents_dir, "mixed_encoding.txt")
        
        # Create a file with mixed encoding issues
        with open(mixed_path, 'wb') as f:
            f.write("UTF-8 text: Café\\n".encode('utf-8'))
            f.write("Latin-1 text: ".encode('utf-8'))
            f.write("résumé\\n".encode('latin-1'))  # This will create encoding issues
            f.write("More UTF-8: naïve\\n".encode('utf-8'))
        
        text, metadata = await processor.extract_text_from_file(mixed_path, extract_metadata=True)
        
        # Should extract most text with some recovery
        assert "UTF-8 text" in text
        assert "Café" in text
        assert "More UTF-8" in text
        assert len(metadata.warnings) > 0
    
    @pytest.mark.asyncio
    async def test_file_size_edge_cases(self, processor_with_limits, temp_documents_dir):
        """Test files at size limits."""
        # Test file exactly at limit
        exact_limit_path = os.path.join(temp_documents_dir, "exact_limit.txt")
        content = "x" * 1024  # Exactly 1KB
        
        with open(exact_limit_path, 'w') as f:
            f.write(content)
        
        text, metadata = await processor_with_limits.extract_text_from_file(
            exact_limit_path, extract_metadata=True
        )
        
        assert len(text) == 1024
        assert metadata.character_count == 1024
        
        # Test file over limit
        over_limit_path = os.path.join(temp_documents_dir, "over_limit.txt")
        with open(over_limit_path, 'w') as f:
            f.write("x" * 1025)  # Over 1KB limit
        
        with pytest.raises(FileSizeError):
            await processor_with_limits.extract_text_from_file(over_limit_path)
    
    @pytest.mark.asyncio
    async def test_special_filename_characters(self, processor, temp_documents_dir):
        """Test files with special characters in filenames."""
        special_chars = ["café.txt", "naïve résumé.txt", "测试文档.txt", "файл.txt"]
        
        for filename in special_chars:
            try:
                file_path = os.path.join(temp_documents_dir, filename)
                content = f"This is the content of {filename}"
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                text, metadata = await processor.extract_text_from_file(file_path, extract_metadata=True)
                
                assert content in text
                assert metadata.character_count > 0
                
            except (OSError, UnicodeError) as e:
                # Some filesystems might not support certain characters
                pytest.skip(f"Filesystem doesn't support filename '{filename}': {e}")
    
    @pytest.mark.asyncio
    async def test_deeply_nested_docx_tables(self, processor, temp_documents_dir):
        """Test DOCX with complex nested table structures."""
        docx_path = os.path.join(temp_documents_dir, "complex_tables.docx")
        
        with patch('docx.Document') as mock_docx:
            mock_doc = MagicMock()
            mock_doc.paragraphs = []
            
            # Create mock nested tables
            mock_table1 = MagicMock()
            mock_table2 = MagicMock()
            
            # Table 1 with nested structure
            mock_row1 = MagicMock()
            mock_cell1 = MagicMock()
            mock_cell1.text = "Outer Table\\nCell 1\\nMultiple lines"
            mock_cell2 = MagicMock()
            mock_cell2.text = "Header\\tTabbed\\tContent"
            mock_row1.cells = [mock_cell1, mock_cell2]
            
            mock_table1.rows = [mock_row1]
            
            # Table 2 with many rows
            rows = []
            for i in range(50):  # Large table
                mock_row = MagicMock()
                mock_cell_a = MagicMock()
                mock_cell_a.text = f"Row {i} Col A"
                mock_cell_b = MagicMock()
                mock_cell_b.text = f"Row {i} Col B"
                mock_row.cells = [mock_cell_a, mock_cell_b]
                rows.append(mock_row)
            
            mock_table2.rows = rows
            mock_doc.tables = [mock_table1, mock_table2]
            
            mock_docx.return_value = mock_doc
            
            with open(docx_path, 'wb') as f:
                f.write(b'fake docx content')
            
            text, metadata = await processor.extract_text_from_file(docx_path, extract_metadata=True)
            
            assert "Outer Table" in text
            assert "Row 0 Col A" in text
            assert "Row 49 Col B" in text
            assert metadata.table_count == 2
            assert metadata.has_tables


class TestStressAndPerformance:
    """Stress testing and performance validation."""
    
    @pytest.fixture
    def stress_processor(self, temp_documents_dir):
        """Create processor for stress testing."""
        processor = DocumentProcessor()
        processor.documents_folder = temp_documents_dir
        return processor
    
    @pytest.mark.asyncio
    async def test_process_many_small_files(self, stress_processor, temp_documents_dir):
        """Test processing many small files simultaneously."""
        # Create 50 small text files
        file_paths = []
        for i in range(50):
            file_path = os.path.join(temp_documents_dir, f"small_file_{i:03d}.txt")
            content = f"This is small file number {i}. " * 10  # ~300 characters each
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            file_paths.append(file_path)
        
        start_time = time.time()
        
        # Process all files
        tasks = []
        for file_path in file_paths:
            task = stress_processor.extract_text_from_file(file_path, extract_metadata=True)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Count successful extractions
        successful = sum(1 for result in results if not isinstance(result, Exception))
        
        print(f"\\nProcessed {successful}/{len(file_paths)} files in {total_time:.2f}s")
        print(f"Average time per file: {total_time/len(file_paths):.3f}s")
        
        assert successful == len(file_paths), "Should process all files successfully"
        assert total_time < 30, "Should process all files within reasonable time"
    
    @pytest.mark.asyncio
    async def test_process_large_text_file(self, stress_processor, temp_documents_dir):
        """Test processing a very large text file."""
        large_file_path = os.path.join(temp_documents_dir, "large_file.txt")
        
        # Create a large text file (~1MB)
        chunk = "This is a chunk of text that will be repeated many times. " * 100
        content = chunk * 200  # ~1MB
        
        with open(large_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        start_time = time.time()
        text, metadata = await stress_processor.extract_text_from_file(
            large_file_path, extract_metadata=True
        )
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        print(f"\\nProcessed large file ({metadata.file_size:,} bytes) in {processing_time:.2f}s")
        print(f"Characters: {metadata.character_count:,}")
        print(f"Words: {metadata.word_count:,}")
        print(f"Processing rate: {metadata.character_count/processing_time:,.0f} chars/s")
        
        assert len(text) > 500000, "Should extract large amount of text"
        assert processing_time < 10, "Should process large file efficiently"
        assert metadata.character_count == len(text)
    
    @pytest.mark.asyncio
    async def test_memory_usage_with_multiple_large_files(self, stress_processor, temp_documents_dir):
        """Test memory usage when processing multiple large files."""
        import psutil
        import os as os_module
        
        process = psutil.Process(os_module.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create multiple moderately large files
        file_paths = []
        for i in range(10):
            file_path = os.path.join(temp_documents_dir, f"large_file_{i}.txt")
            content = f"Large file {i} content. " * 10000  # ~250KB each
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            file_paths.append(file_path)
        
        # Process files sequentially to check memory growth
        for file_path in file_paths:
            await stress_processor.extract_text_from_file(file_path, extract_metadata=True)
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_growth = final_memory - initial_memory
        
        print(f"\\nMemory usage:")
        print(f"  Initial: {initial_memory:.1f} MB")
        print(f"  Final: {final_memory:.1f} MB")
        print(f"  Growth: {memory_growth:.1f} MB")
        
        # Memory growth should be reasonable (less than 100MB for this test)
        assert memory_growth < 100, f"Memory growth too high: {memory_growth:.1f} MB"
    
    @pytest.mark.asyncio
    async def test_concurrent_extraction_performance(self, stress_processor, temp_documents_dir):
        """Test performance of concurrent extraction operations."""
        # Create files of different types and sizes
        files_to_create = [
            ("small.txt", "Small file content. " * 10),
            ("medium.txt", "Medium file content. " * 1000),
            ("large.txt", "Large file content. " * 10000),
        ]
        
        # Create multiple copies of each type
        file_paths = []
        for file_type, content in files_to_create:
            for i in range(5):
                file_path = os.path.join(temp_documents_dir, f"{i}_{file_type}")
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                file_paths.append(file_path)
        
        # Test sequential processing
        start_time = time.time()
        sequential_results = []
        for file_path in file_paths:
            result = await stress_processor.extract_text_from_file(file_path, extract_metadata=True)
            sequential_results.append(result)
        sequential_time = time.time() - start_time
        
        # Test concurrent processing
        start_time = time.time()
        tasks = [
            stress_processor.extract_text_from_file(file_path, extract_metadata=True)
            for file_path in file_paths
        ]
        concurrent_results = await asyncio.gather(*tasks)
        concurrent_time = time.time() - start_time
        
        print(f"\\nConcurrency Performance:")
        print(f"  Sequential: {sequential_time:.2f}s")
        print(f"  Concurrent: {concurrent_time:.2f}s")
        print(f"  Speedup: {sequential_time/concurrent_time:.1f}x")
        
        # Concurrent should be faster (allowing for some overhead)
        assert concurrent_time <= sequential_time * 1.1, "Concurrent processing should not be significantly slower"
        
        # Results should be the same
        assert len(sequential_results) == len(concurrent_results)
        for seq_result, conc_result in zip(sequential_results, concurrent_results):
            seq_text, seq_meta = seq_result
            conc_text, conc_meta = conc_result
            assert seq_text == conc_text
            assert seq_meta.character_count == conc_meta.character_count


class TestErrorRecovery:
    """Test error recovery and resilience."""
    
    @pytest.mark.asyncio
    async def test_recovery_from_partial_pdf_corruption(self, processor, temp_documents_dir):
        """Test recovery when PDF has some corrupted pages."""
        pdf_path = os.path.join(temp_documents_dir, "partial_corrupt.pdf")
        
        with open(pdf_path, 'wb') as f:
            f.write(b'%PDF-1.4\\nsome corrupted content')
        
        with patch('fitz.open') as mock_fitz, patch('PyPDF2.PdfReader') as mock_pypdf:
            # Simulate PyMuPDF partially working
            mock_doc = MagicMock()
            mock_doc.is_encrypted = False
            
            # Some pages work, some fail
            def mock_load_page(page_num):
                mock_page = MagicMock()
                if page_num == 1:  # Second page fails
                    mock_page.get_text.side_effect = Exception("Corrupted page")
                else:
                    mock_page.get_text.return_value = f"Text from page {page_num}"
                return mock_page
            
            mock_doc.load_page = mock_load_page
            mock_doc.__len__ = lambda x: 3  # 3 pages total
            mock_fitz.return_value = mock_doc
            
            text, metadata = await processor.extract_text_from_file(pdf_path, extract_metadata=True)
            
            # Should extract text from working pages
            assert "Text from page 0" in text
            assert "Text from page 2" in text
            assert metadata.page_count == 3
            assert len(metadata.warnings) > 0  # Should warn about failed page
    
    @pytest.mark.asyncio
    async def test_graceful_handling_of_timeout_simulation(self, processor, temp_documents_dir):
        """Test graceful handling when extraction takes too long."""
        slow_file_path = os.path.join(temp_documents_dir, "slow_file.txt")
        
        with open(slow_file_path, 'w') as f:
            f.write("This file will simulate slow processing")
        
        # Mock a slow extraction process
        original_extract = processor._extract_from_txt_enhanced
        
        async def slow_extract(*args, **kwargs):
            await asyncio.sleep(0.1)  # Simulate slow processing
            return await original_extract(*args, **kwargs)
        
        with patch.object(processor, '_extract_from_txt_enhanced', slow_extract):
            start_time = time.time()
            text, metadata = await processor.extract_text_from_file(
                slow_file_path, extract_metadata=True
            )
            end_time = time.time()
            
            # Should still complete successfully
            assert "slow processing" in text
            assert end_time - start_time >= 0.1
            assert metadata.processing_time >= 0.1


class TestLanguageDetection:
    """Test language detection functionality."""
    
    @pytest.mark.asyncio
    async def test_detect_multiple_languages(self, processor, temp_documents_dir):
        """Test language detection for various languages."""
        
        languages_content = {
            'english.txt': 'This is a document written in English. It contains multiple sentences to help with language detection.',
            'spanish.txt': 'Este es un documento escrito en español. Contiene múltiples oraciones para ayudar con la detección de idioma.',
            'french.txt': 'Ceci est un document écrit en français. Il contient plusieurs phrases pour aider à la détection de langue.',
            'german.txt': 'Dies ist ein Dokument in deutscher Sprache. Es enthält mehrere Sätze zur Unterstützung der Spracherkennung.',
        }
        
        for filename, content in languages_content.items():
            file_path = os.path.join(temp_documents_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            text, metadata = await processor.extract_text_from_file(file_path, extract_metadata=True)
            
            print(f"\\n{filename}: Detected language = {metadata.language}")
            
            # Language detection might not be perfect, but should not crash
            assert isinstance(metadata.language, str)
            assert len(metadata.language) >= 2  # Language codes are at least 2 characters
    
    @pytest.mark.asyncio
    async def test_language_detection_insufficient_text(self, processor, temp_documents_dir):
        """Test language detection with insufficient text."""
        short_file_path = os.path.join(temp_documents_dir, "short.txt")
        
        with open(short_file_path, 'w', encoding='utf-8') as f:
            f.write("Hi")  # Very short text
        
        text, metadata = await processor.extract_text_from_file(short_file_path, extract_metadata=True)
        
        # Should handle short text gracefully
        assert metadata.language == "unknown"


if __name__ == "__main__":
    # Run edge case tests
    pytest.main([__file__, "-v", "-s"])