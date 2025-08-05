#!/usr/bin/env python3
"""
Demonstration script for the enhanced document processor.

This script showcases the new features and improvements in the document
processing functionality.
"""

import asyncio
import sys
import os
import json
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.services.document_processor import DocumentProcessor, DocumentMetadata
from app.services.exceptions import DocumentProcessingError


async def demonstrate_enhanced_features():
    """Demonstrate the enhanced document processing features."""
    print("Enhanced Document Processor Demonstration")
    print("=" * 50)
    
    # Initialize processor
    processor = DocumentProcessor()
    processor.documents_folder = "/Users/khaled/Projects/leaning_claude/document-chatbot/documents"
    
    print(f"Documents folder: {processor.documents_folder}")
    print(f"Max file size: {processor.max_file_size:,} bytes")
    print(f"Supported encodings: {', '.join(processor.supported_encodings)}")
    
    # 1. Scan documents
    print("\n1. Scanning Documents Folder")
    print("-" * 30)
    
    documents = await processor.scan_documents_folder()
    print(f"Found {len(documents)} documents:")
    
    for doc in documents:
        print(f"  - {doc.filename} (Status: {doc.status})")
    
    if not documents:
        print("No documents found. Please add some documents to test with.")
        return
    
    # 2. Demonstrate text extraction with metadata
    print("\n2. Enhanced Text Extraction")
    print("-" * 30)
    
    test_document = documents[0]  # Use first document
    print(f"Processing: {test_document.filename}")
    
    try:
        text, metadata = await processor.extract_text_from_file(
            test_document.file_path, extract_metadata=True
        )
        
        print(f"\nExtraction Results:")
        print(f"  Text length: {len(text):,} characters")
        print(f"  File type: {metadata.file_type}")
        print(f"  Encoding: {metadata.encoding}")
        print(f"  Language: {metadata.language}")
        print(f"  Word count: {metadata.word_count:,}")
        print(f"  Line count: {metadata.line_count:,}")
        print(f"  Page count: {metadata.page_count}")
        print(f"  Processing time: {metadata.processing_time:.3f}s")
        print(f"  Extraction method: {metadata.extraction_method}")
        
        if metadata.has_tables:
            print(f"  Contains {metadata.table_count} tables")
        
        if metadata.has_images:
            print(f"  Contains {metadata.image_count} images")
        
        if metadata.warnings:
            print(f"  Warnings ({len(metadata.warnings)}):")
            for warning in metadata.warnings[:3]:  # Show first 3
                print(f"    - {warning}")
        
        if metadata.errors:
            print(f"  Errors ({len(metadata.errors)}):")
            for error in metadata.errors[:3]:  # Show first 3
                print(f"    - {error}")
        
        # Show text preview
        print(f"\nText Preview (first 200 characters):")
        print(f"'{text[:200]}...'")
        
    except DocumentProcessingError as e:
        print(f"Processing error: {e}")
        print(f"Error details: {e.error_details}")
    
    # 3. Document integrity validation
    print(f"\n3. Document Integrity Validation")
    print("-" * 30)
    
    for doc in documents[:3]:  # Test first 3 documents
        try:
            is_valid, issues = await processor.validate_document_integrity(doc.file_path)
            status = "✓ VALID" if is_valid else "✗ ISSUES"
            print(f"  {status} {doc.filename}")
            
            if issues:
                for issue in issues:
                    print(f"    - {issue}")
        
        except Exception as e:
            print(f"  ✗ ERROR {doc.filename}: {e}")
    
    # 4. Processing statistics
    print(f"\n4. Comprehensive Processing Statistics")
    print("-" * 30)
    
    stats = await processor.get_processing_statistics()
    
    print(f"Total documents: {stats['total_documents']}")
    
    print(f"\nProcessing Summary:")
    for category, count in stats['processing_summary'].items():
        print(f"  {category}: {count}")
    
    print(f"\nFile Type Breakdown:")
    for file_type, count in stats['file_type_breakdown'].items():
        print(f"  {file_type}: {count}")
    
    print(f"\nSize Distribution:")
    for size_cat, count in stats['size_distribution'].items():
        print(f"  {size_cat}: {count}")
    
    print(f"\nHealth Check:")
    for status, count in stats['health_check'].items():
        print(f"  {status}: {count}")
    
    # 5. Process all documents
    print(f"\n5. Processing All Documents")
    print("-" * 30)
    
    result = await processor.process_all_documents()
    
    print(f"Total documents: {result['total_documents']}")
    print(f"Successfully processed: {result['processed_count']}")
    print(f"Failed to process: {result['failed_count']}")
    
    processing_stats = result['processing_stats']
    print(f"\nProcessing Performance:")
    print(f"  Total time: {processing_stats['total_time']:.2f}s")
    print(f"  Total characters: {processing_stats['total_characters']:,}")
    print(f"  Total words: {processing_stats['total_words']:,}")
    
    if result['processed_count'] > 0:
        avg_time = processing_stats['total_time'] / result['processed_count']
        print(f"  Average time per document: {avg_time:.2f}s")
    
    print(f"\nBy File Type:")
    for file_type, type_stats in processing_stats['by_file_type'].items():
        print(f"  {file_type}: {type_stats['count']} files, {type_stats['words']:,} words")
    
    if result['failed_documents']:
        print(f"\nFailed Documents:")
        for failed in result['failed_documents']:
            print(f"  {failed['filename']}: {failed['error']}")
    
    # 6. Demonstrate text cleaning
    print(f"\n6. Text Cleaning and Normalization")
    print("-" * 30)
    
    dirty_text = """This   has   excessive   whitespace
    
    
    
    And    many    empty    lines
    
    
    Special characters: \x00\x01\x02  
    """
    
    cleaned_text = processor._clean_and_normalize_text(dirty_text)
    
    print("Original text (with escaped special chars):")
    print(repr(dirty_text))
    print(f"\nCleaned text:")
    print(repr(cleaned_text))
    
    # 7. Error handling demonstration
    print(f"\n7. Error Handling Demonstration")
    print("-" * 30)
    
    # Try to process non-existent file
    try:
        await processor.extract_text_from_file("/nonexistent/file.txt")
    except DocumentProcessingError as e:
        print(f"Handled error correctly: {type(e).__name__}")
        print(f"  Message: {e.message}")
        print(f"  File: {e.file_path}")
        print(f"  Details: {e.error_details}")
    
    print(f"\nDemonstration complete!")
    print(f"The enhanced document processor provides:")
    print(f"  ✓ Robust error handling with specific exceptions")
    print(f"  ✓ Multiple extraction methods with fallbacks")
    print(f"  ✓ Comprehensive metadata extraction")
    print(f"  ✓ Text cleaning and normalization")
    print(f"  ✓ Document integrity validation")
    print(f"  ✓ Performance monitoring and statistics")
    print(f"  ✓ Support for tables in DOCX files")
    print(f"  ✓ Enhanced Markdown processing")
    print(f"  ✓ Encoding detection and recovery")
    print(f"  ✓ Language detection")


def create_sample_documents():
    """Create some sample documents for testing if none exist."""
    documents_folder = "/Users/khaled/Projects/leaning_claude/document-chatbot/documents"
    
    if not os.path.exists(documents_folder):
        os.makedirs(documents_folder)
    
    # Create a sample text file if it doesn't exist
    sample_txt = os.path.join(documents_folder, "sample_test.txt")
    if not os.path.exists(sample_txt):
        with open(sample_txt, 'w', encoding='utf-8') as f:
            f.write("""Enhanced Document Processor Test File

This is a sample document created for testing the enhanced document processor.

Features being tested:
- Text extraction
- Encoding detection
- Metadata analysis
- Language detection
- Performance monitoring

This document contains:
• Multiple paragraphs
• Special characters: café, naïve, résumé
• Numbers: 123, 456.78
• Email: test@example.com
• URL: https://example.com

End of test document.
""")
        print(f"Created sample document: {sample_txt}")
    
    # Create a sample Markdown file
    sample_md = os.path.join(documents_folder, "sample_test.md")
    if not os.path.exists(sample_md):
        with open(sample_md, 'w', encoding='utf-8') as f:
            f.write("""# Enhanced Document Processor Test

## Overview

This is a **test document** for the *enhanced document processor*.

## Features

- Enhanced text extraction
- Better error handling
- Comprehensive metadata
- Table support
- Image detection

## Code Example

```python
processor = DocumentProcessor()
text, metadata = await processor.extract_text_from_file(file_path)
```

## Table Example

| Feature | Status | Notes |
|---------|--------|-------|
| PDF Extraction | ✓ | Multiple methods |
| DOCX Tables | ✓ | Full support |
| Encoding Detection | ✓ | Automatic |
| Error Recovery | ✓ | Graceful |

## End

This completes the test document.
""")
        print(f"Created sample document: {sample_md}")


if __name__ == "__main__":
    # Create sample documents if needed
    create_sample_documents()
    
    # Run the demonstration
    asyncio.run(demonstrate_enhanced_features())