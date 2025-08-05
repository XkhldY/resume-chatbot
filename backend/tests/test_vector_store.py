"""
Comprehensive tests for the ChromaDB vector store implementation.
"""

import pytest
import asyncio
import tempfile
import shutil
import os
from unittest.mock import patch, MagicMock, AsyncMock
from typing import List, Dict, Any

# Import the modules under test
from app.services.vector_store import VectorStore, DocumentChunk, get_vector_store
from app.services.exceptions import DocumentProcessingError
from app.core.config import settings


class TestDocumentChunk:
    """Test the DocumentChunk class."""
    
    def test_document_chunk_creation(self):
        """Test creating a DocumentChunk instance."""
        chunk = DocumentChunk(
            chunk_id="test_chunk_1",
            text="This is test text content.",
            document_id="doc_123",
            document_name="test.txt",
            chunk_index=0,
            start_char=0,
            end_char=25,
            metadata={"author": "test_user"}
        )
        
        assert chunk.chunk_id == "test_chunk_1"
        assert chunk.text == "This is test text content."
        assert chunk.document_id == "doc_123"
        assert chunk.document_name == "test.txt"
        assert chunk.chunk_index == 0
        assert chunk.start_char == 0
        assert chunk.end_char == 25
        assert chunk.metadata["author"] == "test_user"
        assert chunk.created_at is not None
    
    def test_document_chunk_to_dict(self):
        """Test converting DocumentChunk to dictionary."""
        chunk = DocumentChunk(
            chunk_id="test_chunk_1",
            text="Test content",
            document_id="doc_123",
            document_name="test.txt",
            chunk_index=0,
            start_char=0,
            end_char=12
        )
        
        chunk_dict = chunk.to_dict()
        
        assert chunk_dict["chunk_id"] == "test_chunk_1"
        assert chunk_dict["text"] == "Test content"
        assert chunk_dict["document_id"] == "doc_123"
        assert chunk_dict["document_name"] == "test.txt"
        assert chunk_dict["chunk_index"] == 0
        assert chunk_dict["start_char"] == 0
        assert chunk_dict["end_char"] == 12
        assert "created_at" in chunk_dict


class TestVectorStore:
    """Test the VectorStore class."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for testing."""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    async def vector_store(self, temp_dir):
        """Create a VectorStore instance for testing."""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.vector_store_path = temp_dir
            mock_settings.chroma_collection_name = "test_collection"
            mock_settings.chunk_size = 100
            mock_settings.chunk_overlap = 20
            mock_settings.max_search_results = 10
            mock_settings.similarity_threshold = 0.5
            
            # Mock ChromaDB as not available to test fallback functionality
            with patch('app.services.vector_store.CHROMADB_AVAILABLE', False):
                store = VectorStore()
                await store.ensure_initialized()
                yield store
    
    @pytest.fixture
    async def chromadb_vector_store(self, temp_dir):
        """Create a VectorStore instance with ChromaDB mocked as available."""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.vector_store_path = temp_dir
            mock_settings.chroma_collection_name = "test_collection"
            mock_settings.chunk_size = 100
            mock_settings.chunk_overlap = 20
            mock_settings.max_search_results = 10
            mock_settings.similarity_threshold = 0.5
            
            # Mock ChromaDB as available
            with patch('app.services.vector_store.CHROMADB_AVAILABLE', True):
                # Mock the chromadb module
                mock_chromadb = MagicMock()
                mock_client = MagicMock()
                mock_collection = MagicMock()
                mock_collection.count.return_value = 0
                mock_collection.add = MagicMock()
                mock_collection.query.return_value = {
                    "documents": [[]],
                    "metadatas": [[]],
                    "distances": [[]]
                }
                mock_client.get_collection.side_effect = Exception("Collection not found")
                mock_client.create_collection.return_value = mock_collection
                mock_chromadb.PersistentClient.return_value = mock_client
                
                with patch('app.services.vector_store.chromadb', mock_chromadb):
                    store = VectorStore()
                    await store.ensure_initialized()
                    yield store, mock_collection
    
    async def test_initialization_fallback(self, vector_store):
        """Test VectorStore initialization with fallback storage."""
        assert vector_store._initialized
        assert hasattr(vector_store, '_fallback_storage')
        assert isinstance(vector_store._fallback_storage, list)
    
    async def test_initialization_chromadb(self, chromadb_vector_store):
        """Test VectorStore initialization with ChromaDB."""
        store, mock_collection = chromadb_vector_store
        assert store._initialized
        assert store.collection is not None
    
    async def test_chunk_text(self, vector_store):
        """Test text chunking functionality."""
        text = "This is a test document. " * 10  # Make it long enough to chunk
        chunks = vector_store._chunk_text(text, "test_doc", "test.txt")
        
        assert len(chunks) > 0
        assert all(isinstance(chunk, DocumentChunk) for chunk in chunks)
        assert chunks[0].document_id == "test_doc"
        assert chunks[0].document_name == "test.txt"
        assert chunks[0].chunk_index == 0
    
    async def test_add_document_fallback(self, vector_store):
        """Test adding a document with fallback storage."""
        result = await vector_store.add_document(
            document_id="test_doc_1",
            document_name="test.txt",
            text="This is test content for the document.",
            metadata={"author": "test_user"}
        )
        
        assert result is True
        assert len(vector_store._fallback_storage) > 0
        
        # Check that the document was chunked and stored
        stored_chunk = vector_store._fallback_storage[0]
        assert stored_chunk["document_id"] == "test_doc_1"
        assert stored_chunk["document_name"] == "test.txt"
        assert "author" in stored_chunk
    
    async def test_add_document_chromadb(self, chromadb_vector_store):
        """Test adding a document with ChromaDB."""
        store, mock_collection = chromadb_vector_store
        
        result = await store.add_document(
            document_id="test_doc_1",
            document_name="test.txt",
            text="This is test content for the document.",
            metadata={"author": "test_user"}
        )
        
        assert result is True
        mock_collection.add.assert_called_once()
    
    async def test_add_empty_document(self, vector_store):
        """Test adding an empty document."""
        result = await vector_store.add_document(
            document_id="empty_doc",
            document_name="empty.txt",
            text="",
            metadata={}
        )
        
        assert result is False
    
    async def test_search_similar_fallback(self, vector_store):
        """Test searching with fallback storage."""
        # Add a document first
        await vector_store.add_document(
            document_id="test_doc_1",
            document_name="test.txt",
            text="This is a test document about machine learning and AI.",
            metadata={"topic": "AI"}
        )
        
        # Search for similar content
        results = await vector_store.search_similar("machine learning", n_results=5)
        
        assert len(results) > 0
        assert all("text" in result for result in results)
        assert all("document_name" in result for result in results)
        assert all("similarity_score" in result for result in results)
    
    async def test_search_similar_chromadb(self, chromadb_vector_store):
        """Test searching with ChromaDB."""
        store, mock_collection = chromadb_vector_store
        
        # Mock query results
        mock_collection.query.return_value = {
            "documents": [["This is test content"]],
            "metadatas": [[{"document_name": "test.txt", "chunk_id": "test_chunk_1"}]],
            "distances": [[0.3]]
        }
        
        results = await store.search_similar("test query", n_results=5)
        
        mock_collection.query.assert_called_once()
        assert len(results) > 0
        assert results[0]["similarity_score"] == 0.7  # 1.0 - 0.3
    
    async def test_search_no_results(self, vector_store):
        """Test searching when no results are found."""
        results = await vector_store.search_similar("nonexistent content", n_results=5)
        
        assert len(results) == 0
    
    async def test_delete_document_fallback(self, vector_store):
        """Test deleting a document with fallback storage."""
        # Add a document first
        await vector_store.add_document(
            document_id="test_doc_1",
            document_name="test.txt",
            text="This is test content.",
            metadata={}
        )
        
        # Verify it was added
        assert len(vector_store._fallback_storage) > 0
        
        # Delete the document
        result = await vector_store.delete_document("test_doc_1")
        
        assert result is True
        # Check that all chunks for this document were removed
        remaining_docs = [
            doc for doc in vector_store._fallback_storage
            if doc.get("document_id") == "test_doc_1"
        ]
        assert len(remaining_docs) == 0
    
    async def test_delete_document_chromadb(self, chromadb_vector_store):
        """Test deleting a document with ChromaDB."""
        store, mock_collection = chromadb_vector_store
        
        result = await store.delete_document("test_doc_1")
        
        assert result is True
        mock_collection.delete.assert_called_once_with(where={"document_id": "test_doc_1"})
    
    async def test_get_collection_stats_fallback(self, vector_store):
        """Test getting collection statistics with fallback storage."""
        # Add some test documents
        await vector_store.add_document("doc1", "test1.txt", "Content 1", {})
        await vector_store.add_document("doc2", "test2.txt", "Content 2", {})
        
        stats = await vector_store.get_collection_stats()
        
        assert stats["status"] == "fallback"
        assert stats["storage_type"] == "in_memory"
        assert stats["total_chunks"] >= 2
    
    async def test_get_collection_stats_chromadb(self, chromadb_vector_store):
        """Test getting collection statistics with ChromaDB."""
        store, mock_collection = chromadb_vector_store
        mock_collection.count.return_value = 5
        
        stats = await store.get_collection_stats()
        
        assert stats["status"] == "ready"
        assert stats["storage_type"] == "persistent"
        assert stats["total_chunks"] == 5
    
    async def test_health_check_fallback(self, vector_store):
        """Test health check with fallback storage."""
        health = await vector_store.health_check()
        
        assert "timestamp" in health
        assert health["chromadb_available"] is False
        assert health["initialized"] is True
        assert health["status"] == "degraded"
    
    async def test_health_check_chromadb(self, chromadb_vector_store):
        """Test health check with ChromaDB."""
        store, mock_collection = chromadb_vector_store
        mock_collection.count.return_value = 10
        
        health = await store.health_check()
        
        assert "timestamp" in health
        assert health["chromadb_available"] is True
        assert health["initialized"] is True
        assert health["status"] == "healthy"
        assert health["total_documents"] == 10
    
    async def test_clear_collection_fallback(self, vector_store):
        """Test clearing collection with fallback storage."""
        # Add some test data
        await vector_store.add_document("doc1", "test.txt", "Content", {})
        
        result = await vector_store.clear_collection()
        
        assert result is True
        assert len(vector_store._fallback_storage) == 0
    
    async def test_clear_collection_chromadb(self, chromadb_vector_store):
        """Test clearing collection with ChromaDB."""
        store, mock_collection = chromadb_vector_store
        
        result = await store.clear_collection()
        
        assert result is True
        mock_collection.delete.assert_called_once()
    
    async def test_error_handling(self, temp_dir):
        """Test error handling during various operations."""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.vector_store_path = temp_dir
            
            # Test with ChromaDB throwing errors
            with patch('app.services.vector_store.CHROMADB_AVAILABLE', True):
                mock_chromadb = MagicMock()
                mock_chromadb.PersistentClient.side_effect = Exception("Database error")
                
                with patch('app.services.vector_store.chromadb', mock_chromadb):
                    store = VectorStore()
                    await store.ensure_initialized()
                    
                    # Should fall back to in-memory storage
                    assert hasattr(store, '_fallback_storage')


class TestVectorStoreIntegration:
    """Integration tests for the vector store."""
    
    @pytest.fixture
    async def integration_vector_store(self):
        """Create a vector store for integration testing."""
        temp_dir = tempfile.mkdtemp()
        
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.vector_store_path = temp_dir
            mock_settings.chroma_collection_name = "integration_test"
            mock_settings.chunk_size = 200
            mock_settings.chunk_overlap = 50
            mock_settings.max_search_results = 5
            mock_settings.similarity_threshold = 0.3
            
            # Use fallback storage for integration tests
            with patch('app.services.vector_store.CHROMADB_AVAILABLE', False):
                store = VectorStore()
                await store.ensure_initialized()
                yield store
        
        # Cleanup
        shutil.rmtree(temp_dir)
    
    async def test_full_document_workflow(self, integration_vector_store):
        """Test the complete workflow of adding, searching, and deleting documents."""
        store = integration_vector_store
        
        # Add multiple documents
        documents = [
            {
                "id": "doc1",
                "name": "machine_learning.txt",
                "text": "Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.",
                "metadata": {"category": "AI", "author": "Alice"}
            },
            {
                "id": "doc2", 
                "name": "deep_learning.txt",
                "text": "Deep learning uses neural networks with multiple layers to model and understand complex patterns.",
                "metadata": {"category": "AI", "author": "Bob"}
            },
            {
                "id": "doc3",
                "name": "cooking.txt", 
                "text": "Cooking is the art of preparing food using heat and various techniques to create delicious meals.",
                "metadata": {"category": "Cooking", "author": "Carol"}
            }
        ]
        
        # Add all documents
        for doc in documents:
            result = await store.add_document(
                document_id=doc["id"],
                document_name=doc["name"],
                text=doc["text"],
                metadata=doc["metadata"]
            )
            assert result is True
        
        # Search for AI-related content
        ai_results = await store.search_similar("artificial intelligence neural networks", n_results=5)
        
        # Should find relevant documents
        assert len(ai_results) > 0
        ai_doc_names = [result["document_name"] for result in ai_results]
        assert any("machine_learning.txt" in name or "deep_learning.txt" in name for name in ai_doc_names)
        
        # Search for cooking content
        cooking_results = await store.search_similar("food preparation cooking", n_results=5)
        
        # Should find cooking document
        assert len(cooking_results) > 0
        cooking_doc_names = [result["document_name"] for result in cooking_results]
        assert any("cooking.txt" in name for name in cooking_doc_names)
        
        # Delete one document
        delete_result = await store.delete_document("doc1")
        assert delete_result is True
        
        # Verify it's no longer found in searches
        post_delete_results = await store.search_similar("machine learning algorithms", n_results=5)
        post_delete_names = [result["document_name"] for result in post_delete_results]
        assert not any("machine_learning.txt" in name for name in post_delete_names)
        
        # Get final statistics
        stats = await store.get_collection_stats()
        assert stats["status"] == "fallback"
        assert stats["total_chunks"] >= 2  # Should have at least 2 remaining documents


async def test_get_vector_store_function():
    """Test the get_vector_store function."""
    with patch('app.services.vector_store.vector_store') as mock_store:
        mock_store.ensure_initialized = AsyncMock()
        
        result = await get_vector_store()
        
        mock_store.ensure_initialized.assert_called_once()
        assert result == mock_store


class TestVectorStoreExceptionHandling:
    """Test exception handling in vector store operations."""
    
    async def test_document_processing_error_propagation(self):
        """Test that DocumentProcessingError is properly raised."""
        with patch('app.services.vector_store.CHROMADB_AVAILABLE', True):
            mock_chromadb = MagicMock()
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_collection.add.side_effect = Exception("Database connection failed")
            mock_client.create_collection.return_value = mock_collection
            mock_client.get_collection.side_effect = Exception("Collection not found")
            mock_chromadb.PersistentClient.return_value = mock_client
            
            with patch('app.services.vector_store.chromadb', mock_chromadb):
                with patch('app.core.config.settings') as mock_settings:
                    mock_settings.vector_store_path = "/tmp/test"
                    mock_settings.chroma_collection_name = "test"
                    mock_settings.chunk_size = 100
                    mock_settings.chunk_overlap = 20
                    
                    store = VectorStore()
                    await store.ensure_initialized()
                    
                    with pytest.raises(DocumentProcessingError):
                        await store.add_document(
                            document_id="test_doc",
                            document_name="test.txt",
                            text="Test content",
                            metadata={}
                        )


if __name__ == "__main__":
    pytest.main([__file__])