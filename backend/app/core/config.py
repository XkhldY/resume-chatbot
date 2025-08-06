from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # API Keys and External Services
    gemini_api_key: str = ""
    
    # File System Paths
    documents_folder: str = "/app/documents"
    vector_store_path: str = "/app/data/chroma_db"
    
    # ChromaDB Configuration
    chroma_collection_name: str = "document_embeddings"
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_ssl: bool = False
    chroma_max_batch_size: int = 100
    chroma_distance_function: str = "cosine"  # cosine, l2, ip
    
    # Embedding Configuration
    embedding_model: str = "text-embedding-004"
    embedding_dimension: int = 768
    embedding_batch_size: int = 10
    max_embedding_chars: int = 8000
    chunk_size: int = 1000
    chunk_overlap: int = 200
    
    # Vector Search Configuration
    max_search_results: int = 10
    similarity_threshold: float = 0.7

    # Conversation settings
    max_conversation_history: int = 10
    max_context_chunks_per_query: int = 5
    
    # File upload settings
    max_file_size_mb: int = 10
    max_files_per_upload: int = 10
    allowed_file_types: List[str] = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"]
    allowed_extensions: List[str] = [".pdf", ".docx", ".txt", ".md"]
    
    @property
    def max_file_size_bytes(self) -> int:
        """Convert max file size from MB to bytes"""
        return self.max_file_size_mb * 1024 * 1024
    
    class Config:
        env_file = ".env"

settings = Settings()