from typing import List, Dict, Any
from app.core.config import settings
import os

class VectorStore:
    def __init__(self):
        self.documents = []  # Simple in-memory storage for now
        self._initialize_storage()
    
    def _initialize_storage(self):
        """Initialize simple storage"""
        try:
            # Ensure the data directory exists
            os.makedirs(settings.vector_store_path, exist_ok=True)
            print("VectorStore initialized with simple in-memory storage")
            
        except Exception as e:
            print(f"Error initializing storage: {e}")
    
    async def add_documents(self, documents: List[Dict[str, Any]]) -> bool:
        """Add documents to the vector store"""
        try:
            # Simple in-memory storage for now
            self.documents.extend(documents)
            print(f"Added {len(documents)} documents to in-memory store")
            return True
            
        except Exception as e:
            print(f"Error adding documents to vector store: {e}")
            return False
    
    async def search_similar(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        try:
            # Simple keyword-based search for now
            # In a real implementation, you would use embeddings
            
            results = []
            query_lower = query.lower()
            
            for doc in self.documents:
                if query_lower in doc.get("text", "").lower():
                    results.append({
                        "text": doc.get("text", "")[:200] + "...",
                        "filename": doc.get("filename", "unknown"),
                        "score": 0.8
                    })
                    
                if len(results) >= n_results:
                    break
            
            # If no matches, return placeholder
            if not results:
                results = [
                    {
                        "text": "This is a placeholder document chunk. No documents have been processed yet.",
                        "filename": "placeholder.txt",
                        "score": 0.8
                    }
                ]
            
            return results
            
        except Exception as e:
            print(f"Error searching vector store: {e}")
            return []
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Get information about the collection"""
        try:
            return {
                "status": "ready",
                "document_count": len(self.documents),
                "storage_type": "in_memory"
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}