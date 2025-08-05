"""
Pytest configuration and shared fixtures for document processor tests.
"""

import pytest
import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Configure asyncio for pytest
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Mock settings for testing
@pytest.fixture(autouse=True)
def mock_settings():
    """Mock application settings for testing."""
    from unittest.mock import patch, MagicMock
    
    mock_settings = MagicMock()
    mock_settings.documents_folder = "./documents"  # Use Docker container path
    mock_settings.max_file_size_bytes = 50 * 1024 * 1024  # 50MB
    mock_settings.max_file_size_mb = 50
    mock_settings.allowed_extensions = ['.pdf', '.docx', '.txt', '.md']
    mock_settings.allowed_file_types = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown'
    ]
    mock_settings.max_files_per_upload = 10
    
    # Vector store settings
    mock_settings.vector_store_path = "./test_data/chroma_db"
    mock_settings.chroma_collection_name = "test_documents"
    mock_settings.chunk_size = 200
    mock_settings.chunk_overlap = 50
    mock_settings.max_search_results = 5
    mock_settings.similarity_threshold = 0.5
    mock_settings.embedding_model = "text-embedding-004"
    
    # Gemini API settings for testing
    mock_settings.gemini_api_key = "test_api_key"
    
    with patch('app.core.config.settings', mock_settings):
        yield mock_settings


# Additional fixtures for vector store testing
@pytest.fixture
def sample_documents():
    """Sample documents for testing vector store functionality."""
    return [
        {
            "id": "doc1",
            "name": "python_basics.txt",
            "text": "Python is a versatile programming language known for its simplicity and readability. It supports object-oriented, procedural, and functional programming paradigms.",
            "metadata": {"category": "programming", "difficulty": "beginner"}
        },
        {
            "id": "doc2", 
            "name": "web_development.txt",
            "text": "Web development involves creating websites and web applications using various technologies like HTML, CSS, JavaScript, and backend frameworks.",
            "metadata": {"category": "web", "difficulty": "intermediate"}
        },
        {
            "id": "doc3",
            "name": "data_science.txt",
            "text": "Data science combines statistics, programming, and domain expertise to extract insights from data using tools like Python, R, and machine learning algorithms.",
            "metadata": {"category": "data", "difficulty": "advanced"}
        }
    ]


@pytest.fixture
async def mock_chromadb():
    """Mock ChromaDB for testing."""
    from unittest.mock import MagicMock, AsyncMock
    
    mock_client = MagicMock()
    mock_collection = MagicMock()
    
    # Mock collection methods
    mock_collection.add = MagicMock()
    mock_collection.query.return_value = {
        "documents": [["Sample document text"]],
        "metadatas": [[{"document_name": "test.txt", "chunk_id": "test_1"}]],
        "distances": [[0.2]]
    }
    mock_collection.count.return_value = 5
    mock_collection.delete = MagicMock()
    
    # Mock client methods
    mock_client.get_collection.return_value = mock_collection
    mock_client.create_collection.return_value = mock_collection
    
    with patch('app.services.vector_store.chromadb') as mock_chromadb_module:
        mock_chromadb_module.PersistentClient.return_value = mock_client
        yield mock_client, mock_collection