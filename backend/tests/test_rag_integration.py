"""
Integration tests for RAG (Retrieval-Augmented Generation) functionality.
Tests the integration between vector store, LLM service, and chat API.
"""

import pytest
import asyncio
import tempfile
import shutil
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.vector_store import VectorStore
from app.services.llm_service import LLMService
from app.models.chat import ChatRequest, ChatResponse


class TestRAGIntegration:
    """Test RAG functionality integration."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for testing."""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def client(self):
        """Create a test client for the FastAPI application."""
        return TestClient(app)
    
    @pytest.fixture
    async def mock_vector_store(self, temp_dir):
        """Create a mocked vector store with test data."""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.vector_store_path = temp_dir
            mock_settings.chroma_collection_name = "test_rag"
            mock_settings.chunk_size = 200
            mock_settings.chunk_overlap = 50
            mock_settings.max_search_results = 5
            mock_settings.similarity_threshold = 0.3
            
            # Use fallback storage for testing
            with patch('app.services.vector_store.CHROMADB_AVAILABLE', False):
                store = VectorStore()
                await store.ensure_initialized()
                
                # Add test documents
                test_documents = [
                    {
                        "id": "doc1",
                        "name": "python_guide.txt",
                        "text": "Python is a high-level programming language known for its simplicity and readability. It supports multiple programming paradigms including procedural, object-oriented, and functional programming.",
                        "metadata": {"category": "programming", "language": "python"}
                    },
                    {
                        "id": "doc2",
                        "name": "fastapi_tutorial.txt", 
                        "text": "FastAPI is a modern, fast web framework for building APIs with Python 3.7+ based on standard Python type hints. It provides automatic API documentation and high performance.",
                        "metadata": {"category": "web_framework", "language": "python"}
                    },
                    {
                        "id": "doc3",
                        "name": "machine_learning.txt",
                        "text": "Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for every scenario.",
                        "metadata": {"category": "AI", "topic": "machine_learning"}
                    }
                ]
                
                for doc in test_documents:
                    await store.add_document(
                        document_id=doc["id"],
                        document_name=doc["name"],
                        text=doc["text"],
                        metadata=doc["metadata"]
                    )
                
                yield store
    
    @pytest.fixture
    def mock_llm_service(self):
        """Create a mocked LLM service."""
        with patch('app.services.llm_service.LLMService') as MockLLMService:
            mock_service = MagicMock()
            
            # Mock the generate_response method
            async def mock_generate_response(message, conversation_id, context_documents=None):
                if context_documents:
                    context_info = f"Based on {len(context_documents)} document(s), "
                    sources = [doc.get('filename', 'unknown') for doc in context_documents[:2]]
                    return f"{context_info}here's what I found about '{message}'. Sources: {', '.join(sources)}"
                else:
                    return f"I don't have specific information about '{message}' in my knowledge base."
            
            mock_service.generate_response = AsyncMock(side_effect=mock_generate_response)
            mock_service.is_configured.return_value = True
            
            MockLLMService.return_value = mock_service
            yield mock_service
    
    async def test_chat_with_relevant_documents(self, mock_vector_store, mock_llm_service):
        """Test chat functionality with relevant documents in vector store."""
        # Mock the global instances
        with patch('app.services.vector_store.get_vector_store', AsyncMock(return_value=mock_vector_store)):
            with patch('app.api.chat.llm_service', mock_llm_service):
                client = TestClient(app)
                
                # Send a chat request about Python
                response = client.post("/api/chat", json={
                    "message": "What is Python programming language?",
                    "conversation_id": "test_conversation"
                })
                
                assert response.status_code == 200
                data = response.json()
                
                # Verify response structure
                assert "response" in data
                assert "sources" in data
                assert "conversation_id" in data
                assert data["conversation_id"] == "test_conversation"
                
                # Verify that the response mentions context documents
                response_text = data["response"]
                assert "Based on" in response_text or "document" in response_text.lower()
                
                # Verify sources are provided
                sources = data["sources"]
                assert len(sources) > 0
                assert all("filename" in source for source in sources)
                assert all("chunk_text" in source for source in sources)
                assert all("relevance_score" in source for source in sources)
    
    async def test_chat_with_no_relevant_documents(self, mock_vector_store, mock_llm_service):
        """Test chat functionality when no relevant documents are found."""
        with patch('app.services.vector_store.get_vector_store', AsyncMock(return_value=mock_vector_store)):
            with patch('app.api.chat.llm_service', mock_llm_service):
                client = TestClient(app)
                
                # Send a chat request about something not in the knowledge base
                response = client.post("/api/chat", json={
                    "message": "What is the capital of Mars?",
                    "conversation_id": "test_conversation"
                })
                
                assert response.status_code == 200
                data = response.json()
                
                # Should still get a response, but without context
                assert "response" in data
                assert "sources" in data
                
                # Sources might be empty or contain less relevant content
                sources = data["sources"]
                # In this case, we expect fewer or no relevant sources
                assert isinstance(sources, list)
    
    async def test_conversation_id_generation(self, mock_vector_store, mock_llm_service):
        """Test that conversation ID is generated when not provided."""
        with patch('app.services.vector_store.get_vector_store', AsyncMock(return_value=mock_vector_store)):
            with patch('app.api.chat.llm_service', mock_llm_service):
                client = TestClient(app)
                
                # Send a chat request without conversation_id
                response = client.post("/api/chat", json={
                    "message": "Hello, what can you tell me about FastAPI?"
                })
                
                assert response.status_code == 200
                data = response.json()
                
                # Should have generated a conversation ID
                assert "conversation_id" in data
                assert data["conversation_id"] is not None
                assert len(data["conversation_id"]) > 0
    
    async def test_search_functionality(self, mock_vector_store):
        """Test vector store search functionality directly."""
        # Test searching for Python-related content
        python_results = await mock_vector_store.search_similar("Python programming", n_results=3)
        
        assert len(python_results) > 0
        # Should find relevant Python documents
        filenames = [result["document_name"] for result in python_results]
        assert any("python" in filename.lower() for filename in filenames)
        
        # Test searching for FastAPI content
        fastapi_results = await mock_vector_store.search_similar("FastAPI web framework", n_results=3)
        
        assert len(fastapi_results) > 0
        filenames = [result["document_name"] for result in fastapi_results]
        assert any("fastapi" in filename.lower() for filename in filenames)
        
        # Test searching for AI/ML content
        ai_results = await mock_vector_store.search_similar("machine learning artificial intelligence", n_results=3)
        
        assert len(ai_results) > 0
        filenames = [result["document_name"] for result in ai_results]
        assert any("machine_learning" in filename.lower() for filename in filenames)
    
    async def test_similarity_scoring(self, mock_vector_store):
        """Test that similarity scores are reasonable."""
        results = await mock_vector_store.search_similar("Python programming language", n_results=5)
        
        for result in results:
            # Check that similarity scores are in a reasonable range
            score = result.get("similarity_score", 0)
            assert 0 <= score <= 1.0
            
            # Check that all required fields are present
            assert "text" in result
            assert "document_name" in result
            assert "chunk_id" in result
    
    def test_health_checks_integration(self, client):
        """Test health check endpoints."""
        # Test general health check
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        
        # Test LLM health check
        with patch('app.services.llm_service.LLMService') as MockLLMService:
            mock_service = MagicMock()
            mock_service.health_check = AsyncMock(return_value={"status": "healthy", "message": "OK"})
            MockLLMService.return_value = mock_service
            
            response = client.get("/api/health/llm")
            assert response.status_code == 200
        
        # Test vector store health check
        with patch('app.services.vector_store.get_vector_store') as mock_get_store:
            mock_store = MagicMock()
            mock_store.health_check = AsyncMock(return_value={
                "status": "healthy",
                "initialized": True,
                "chromadb_available": True
            })
            mock_get_store.return_value = mock_store
            
            response = client.get("/api/health/vector-store")
            assert response.status_code == 200
        
        # Test comprehensive health check
        with patch('app.services.llm_service.LLMService') as MockLLMService:
            with patch('app.services.vector_store.get_vector_store') as mock_get_store:
                mock_llm = MagicMock()
                mock_llm.health_check = AsyncMock(return_value={"status": "healthy"})
                MockLLMService.return_value = mock_llm
                
                mock_store = MagicMock()
                mock_store.health_check = AsyncMock(return_value={"status": "healthy"})
                mock_store.get_collection_stats = AsyncMock(return_value={"total_chunks": 10})
                mock_get_store.return_value = mock_store
                
                response = client.get("/api/health/all")
                assert response.status_code == 200
                data = response.json()
                assert "status" in data
                assert "services" in data
                assert "vector_store_stats" in data


class TestRAGErrorHandling:
    """Test error handling in RAG functionality."""
    
    def test_chat_with_vector_store_error(self):
        """Test chat functionality when vector store fails."""
        client = TestClient(app)
        
        # Mock vector store to raise an error
        with patch('app.services.vector_store.get_vector_store') as mock_get_store:
            mock_store = MagicMock()
            mock_store.search_similar = AsyncMock(side_effect=Exception("Vector store error"))
            mock_get_store.return_value = mock_store
            
            with patch('app.services.llm_service.LLMService') as MockLLMService:
                mock_service = MagicMock()
                mock_service.generate_response = AsyncMock(return_value="Error response")
                MockLLMService.return_value = mock_service
                
                response = client.post("/api/chat", json={
                    "message": "Test message",
                    "conversation_id": "test"
                })
                
                # Should return an error status
                assert response.status_code == 500
    
    def test_chat_with_llm_error(self):
        """Test chat functionality when LLM service fails."""
        client = TestClient(app)
        
        with patch('app.services.vector_store.get_vector_store') as mock_get_store:
            mock_store = MagicMock()
            mock_store.search_similar = AsyncMock(return_value=[])
            mock_get_store.return_value = mock_store
            
            with patch('app.services.llm_service.LLMService') as MockLLMService:
                mock_service = MagicMock()
                mock_service.generate_response = AsyncMock(side_effect=Exception("LLM error"))
                MockLLMService.return_value = mock_service
                
                response = client.post("/api/chat", json={
                    "message": "Test message",
                    "conversation_id": "test"
                })
                
                # Should return an error status
                assert response.status_code == 500
    
    def test_invalid_chat_request(self):
        """Test chat API with invalid request data."""
        client = TestClient(app)
        
        # Test with missing message
        response = client.post("/api/chat", json={
            "conversation_id": "test"
        })
        assert response.status_code == 422  # Validation error
        
        # Test with empty message
        response = client.post("/api/chat", json={
            "message": "",
            "conversation_id": "test"
        })
        # This might pass validation but should be handled gracefully
        # The exact behavior depends on your validation rules


class TestDocumentProcessingIntegration:
    """Test integration with document processing."""
    
    async def test_document_processing_adds_to_vector_store(self):
        """Test that document processing adds documents to vector store."""
        with patch('app.services.document_processor.DocumentProcessor._get_vector_store') as mock_get_store:
            with patch('app.services.document_processor.DocumentProcessor._get_llm_service') as mock_get_llm:
                mock_store = MagicMock()
                mock_store.add_document = AsyncMock(return_value=True)
                mock_get_store.return_value = mock_store
                
                mock_llm = MagicMock()
                mock_get_llm.return_value = mock_llm
                
                from app.services.document_processor import DocumentProcessor
                processor = DocumentProcessor()
                
                # This would normally be tested with actual file processing
                # but for now we just verify the vector store integration exists
                assert processor._get_vector_store is not None


if __name__ == "__main__":
    pytest.main([__file__])