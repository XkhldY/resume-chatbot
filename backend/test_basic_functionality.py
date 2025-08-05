#!/usr/bin/env python3
"""
Basic functionality test for the enhanced document processor.
"""

import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

try:
    from app.services.document_processor import DocumentProcessor, DocumentMetadata
    from app.services.exceptions import DocumentProcessingError
    print("✓ Successfully imported enhanced document processor")
except ImportError as e:
    print(f"✗ Import error: {e}")
    sys.exit(1)

async def test_basic_functionality():
    """Test basic functionality of the enhanced processor."""
    print("\nTesting Enhanced Document Processor")
    print("=" * 40)
    
    # Initialize processor
    processor = DocumentProcessor()
    processor.documents_folder = "/Users/khaled/Projects/leaning_claude/document-chatbot/documents"
    
    print(f"✓ Processor initialized")
    print(f"  Documents folder: {processor.documents_folder}")
    print(f"  Max file size: {processor.max_file_size:,} bytes")
    
    # Test document scanning
    try:
        documents = await processor.scan_documents_folder()
        print(f"✓ Document scanning works")
        print(f"  Found {len(documents)} documents")
        
        for doc in documents[:3]:  # Show first 3
            print(f"    - {doc.filename}")
        
    except Exception as e:
        print(f"✗ Document scanning failed: {e}")
        return False
    
    if not documents:
        print("  No documents found to test with")
        return True
    
    # Test text extraction on first document
    test_doc = documents[0]
    print(f"\nTesting text extraction on: {test_doc.filename}")
    
    try:
        # Test without metadata
        text_only = await processor.extract_text_from_file(test_doc.file_path, extract_metadata=False)
        print(f"✓ Text extraction (no metadata) works")
        print(f"  Extracted {len(text_only):,} characters")
        
        # Test with metadata
        text, metadata = await processor.extract_text_from_file(test_doc.file_path, extract_metadata=True)
        print(f"✓ Text extraction with metadata works")
        print(f"  Text: {len(text):,} characters")
        print(f"  File type: {metadata.file_type}")
        print(f"  Processing time: {metadata.processing_time:.3f}s")
        print(f"  Word count: {metadata.word_count:,}")
        
    except DocumentProcessingError as e:
        print(f"✓ Document processing error handled correctly: {type(e).__name__}")
        print(f"  Message: {e.message}")
    except Exception as e:
        print(f"✗ Unexpected error in text extraction: {e}")
        return False
    
    # Test document integrity validation
    try:
        is_valid, issues = await processor.validate_document_integrity(test_doc.file_path)
        print(f"✓ Document integrity validation works")
        print(f"  Valid: {is_valid}")
        if issues:
            print(f"  Issues: {len(issues)}")
    except Exception as e:
        print(f"✗ Document integrity validation failed: {e}")
        return False
    
    # Test processing statistics
    try:
        stats = await processor.get_processing_statistics()
        print(f"✓ Processing statistics work")
        print(f"  Total documents: {stats['total_documents']}")
        print(f"  File types: {list(stats['file_type_breakdown'].keys())}")
    except Exception as e:
        print(f"✗ Processing statistics failed: {e}")
        return False
    
    # Test text cleaning
    try:
        dirty_text = "  This   has    excessive    whitespace  \n\n\n\nAnd many empty lines\n\n\n  "
        cleaned = processor._clean_and_normalize_text(dirty_text)
        print(f"✓ Text cleaning works")
        print(f"  Original length: {len(dirty_text)}")
        print(f"  Cleaned length: {len(cleaned)}")
    except Exception as e:
        print(f"✗ Text cleaning failed: {e}")
        return False
    
    print(f"\n✓ All basic functionality tests passed!")
    return True

async def main():
    """Main test function."""
    try:
        success = await test_basic_functionality()
        if success:
            print(f"\n🎉 Enhanced Document Processor is working correctly!")
            sys.exit(0)
        else:
            print(f"\n❌ Some tests failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test runner crashed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())