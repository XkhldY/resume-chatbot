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
    mock_settings.documents_folder = "/app/documents"  # Use Docker container path
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
    
    with patch('app.core.config.settings', mock_settings):
        yield mock_settings