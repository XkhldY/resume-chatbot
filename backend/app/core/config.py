from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    gemini_api_key: str = ""
    documents_folder: str = "/app/documents"
    vector_store_path: str = "/app/data/chroma_db"
    
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