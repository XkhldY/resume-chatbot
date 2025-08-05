import os
import uuid
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import numpy as np

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    chromadb = None

from app.core.config import settings
from app.services.exceptions import DocumentProcessingError

# Configure logging
logger = logging.getLogger(__name__)


class DocumentChunk:
    """Represents a chunk of document content with metadata."""
    
    def __init__(
        self,
        chunk_id: str,
        text: str,
        document_id: str,
        document_name: str,
        chunk_index: int,
        start_char: int,
        end_char: int,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.chunk_id = chunk_id
        self.text = text
        self.document_id = document_id
        self.document_name = document_name
        self.chunk_index = chunk_index
        self.start_char = start_char
        self.end_char = end_char
        self.metadata = metadata or {}
        self.created_at = datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert chunk to dictionary for storage."""
        return {
            "chunk_id": self.chunk_id,
            "text": self.text,
            "document_id": self.document_id,
            "document_name": self.document_name,
            "chunk_index": self.chunk_index,
            "start_char": self.start_char,
            "end_char": self.end_char,
            "created_at": self.created_at.isoformat(),
            **self.metadata
        }


class VectorStore:
    """ChromaDB-based vector store for document embeddings and retrieval."""
    
    def __init__(self):
        self.client = None
        self.collection = None
        self.embedding_function = None
        self._initialized = False
        self._lock = None  # Will be created when needed
    
    async def _initialize(self) -> None:
        """Initialize ChromaDB client and collection."""
        if self._lock is None:
            self._lock = asyncio.Lock()
            
        async with self._lock:
            if self._initialized:
                return
                
            try:
                if not CHROMADB_AVAILABLE:
                    logger.warning("ChromaDB not available, falling back to in-memory storage")
                    self._fallback_storage = []
                    self._initialized = True
                    return
                
                # Ensure the data directory exists
                os.makedirs(settings.vector_store_path, exist_ok=True)
                
                # Initialize ChromaDB client with persistent storage
                self.client = chromadb.PersistentClient(
                    path=settings.vector_store_path,
                    settings=ChromaSettings(
                        anonymized_telemetry=False,
                        allow_reset=True
                    )
                )
                
                # Get or create collection
                try:
                    self.collection = self.client.get_collection(
                        name=settings.chroma_collection_name
                    )
                    logger.info(f"Connected to existing collection: {settings.chroma_collection_name}")
                except Exception:
                    # Collection doesn't exist, create it
                    self.collection = self.client.create_collection(
                        name=settings.chroma_collection_name,
                        metadata={"description": "Document embeddings for RAG system"}
                    )
                    logger.info(f"Created new collection: {settings.chroma_collection_name}")
                
                self._initialized = True
                logger.info("ChromaDB vector store initialized successfully")
                
            except Exception as e:
                logger.error(f"Failed to initialize ChromaDB: {e}")
                # Fall back to in-memory storage
                self._fallback_storage = []
                self._initialized = True
    
    async def ensure_initialized(self) -> None:
        """Ensure the vector store is initialized."""
        if not self._initialized:
            await self._initialize()
    
    def _chunk_text(self, text: str, document_id: str, document_name: str) -> List[DocumentChunk]:
        """Split text into chunks for embedding."""
        chunks = []
        chunk_size = settings.chunk_size
        chunk_overlap = settings.chunk_overlap
        
        # Simple sliding window chunking
        start = 0
        chunk_index = 0
        
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk_text = text[start:end].strip()
            
            if chunk_text:  # Only create non-empty chunks
                chunk_id = f"{document_id}_chunk_{chunk_index}"
                chunk = DocumentChunk(
                    chunk_id=chunk_id,
                    text=chunk_text,
                    document_id=document_id,
                    document_name=document_name,
                    chunk_index=chunk_index,
                    start_char=start,
                    end_char=end
                )
                chunks.append(chunk)
                chunk_index += 1
            
            # Move start position with overlap
            start = end - chunk_overlap if end < len(text) else end
        
        return chunks
    
    async def add_document(
        self,
        document_id: str,
        document_name: str,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
        embeddings: Optional[List[List[float]]] = None
    ) -> bool:
        """Add a document to the vector store."""
        await self.ensure_initialized()
        
        try:
            # Chunk the document
            chunks = self._chunk_text(text, document_id, document_name)
            
            if not chunks:
                logger.warning(f"No chunks created for document {document_id}")
                return False
            
            # Add metadata to each chunk
            if metadata:
                for chunk in chunks:
                    chunk.metadata.update(metadata)
            
            # If ChromaDB is not available, use fallback storage
            if not CHROMADB_AVAILABLE or not self.collection:
                for chunk in chunks:
                    self._fallback_storage.append(chunk.to_dict())
                logger.info(f"Added {len(chunks)} chunks to fallback storage")
                return True
            
            # Prepare data for ChromaDB
            ids = [chunk.chunk_id for chunk in chunks]
            documents = [chunk.text for chunk in chunks]
            metadatas = [chunk.to_dict() for chunk in chunks]
            
            # Add to ChromaDB (ChromaDB will generate embeddings if not provided)
            if embeddings and len(embeddings) == len(chunks):
                self.collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas,
                    embeddings=embeddings
                )
            else:
                self.collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
            
            logger.info(f"Added {len(chunks)} chunks for document {document_id} to ChromaDB")
            return True
            
        except Exception as e:
            logger.error(f"Error adding document {document_id} to vector store: {e}")
            raise DocumentProcessingError(f"Failed to add document to vector store: {e}")
    
    async def search_similar(
        self,
        query: str,
        n_results: int = None,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar document chunks."""
        await self.ensure_initialized()
        
        if n_results is None:
            n_results = settings.max_search_results
        
        try:
            # If ChromaDB is not available, use fallback search
            if not CHROMADB_AVAILABLE or not self.collection:
                return self._fallback_search(query, n_results)
            
            # Prepare query parameters
            query_params = {
                "query_texts": [query],
                "n_results": min(n_results, settings.max_search_results),
                "include": ["documents", "metadatas", "distances"]
            }
            
            # Add metadata filter if provided
            if filter_metadata:
                query_params["where"] = filter_metadata
            
            # Search ChromaDB
            results = self.collection.query(**query_params)
            
            # Format results
            formatted_results = []
            if results["documents"] and results["documents"][0]:
                for i, doc in enumerate(results["documents"][0]):
                    metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                    distance = results["distances"][0][i] if results["distances"] else 1.0
                    
                    # Convert distance to similarity score (assuming cosine distance)
                    similarity = 1.0 - distance if distance <= 1.0 else 0.0
                    
                    # Only include results above threshold
                    if similarity >= settings.similarity_threshold:
                        formatted_results.append({
                            "text": doc,
                            "metadata": metadata,
                            "similarity_score": similarity,
                            "document_name": metadata.get("document_name", "unknown"),
                            "chunk_id": metadata.get("chunk_id", f"chunk_{i}")
                        })
            
            logger.info(f"Found {len(formatted_results)} similar chunks for query")
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching vector store: {e}")
            return []
    
    def _fallback_search(self, query: str, n_results: int) -> List[Dict[str, Any]]:
        """Fallback keyword-based search when ChromaDB is not available."""
        results = []
        query_lower = query.lower()
        
        for doc in getattr(self, '_fallback_storage', []):
            text = doc.get("text", "").lower()
            if query_lower in text:
                results.append({
                    "text": doc.get("text", "")[:500] + "...",
                    "metadata": doc,
                    "similarity_score": 0.8,
                    "document_name": doc.get("document_name", "unknown"),
                    "chunk_id": doc.get("chunk_id", "unknown")
                })
                
                if len(results) >= n_results:
                    break
        
        return results
    
    async def delete_document(self, document_id: str) -> bool:
        """Delete all chunks for a document."""
        await self.ensure_initialized()
        
        try:
            if not CHROMADB_AVAILABLE or not self.collection:
                # Remove from fallback storage
                self._fallback_storage = [
                    doc for doc in getattr(self, '_fallback_storage', [])
                    if doc.get("document_id") != document_id
                ]
                return True
            
            # Delete from ChromaDB using metadata filter
            self.collection.delete(where={"document_id": document_id})
            logger.info(f"Deleted document {document_id} from vector store")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {e}")
            return False
    
    async def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store collection."""
        await self.ensure_initialized()
        
        try:
            if not CHROMADB_AVAILABLE or not self.collection:
                return {
                    "status": "fallback",
                    "total_chunks": len(getattr(self, '_fallback_storage', [])),
                    "storage_type": "in_memory"
                }
            
            # Get collection info
            count = self.collection.count()
            
            return {
                "status": "ready",
                "total_chunks": count,
                "collection_name": settings.chroma_collection_name,
                "storage_type": "persistent",
                "storage_path": settings.vector_store_path
            }
            
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {"status": "error", "error": str(e)}
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform a health check on the vector store."""
        await self.ensure_initialized()
        
        health_status = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "chromadb_available": CHROMADB_AVAILABLE,
            "initialized": self._initialized
        }
        
        try:
            if CHROMADB_AVAILABLE and self.collection:
                # Test basic operations
                count = self.collection.count()
                health_status.update({
                    "status": "healthy",
                    "database_accessible": True,
                    "total_documents": count
                })
            else:
                health_status.update({
                    "status": "degraded",
                    "database_accessible": False,
                    "fallback_storage": len(getattr(self, '_fallback_storage', []))
                })
                
        except Exception as e:
            health_status.update({
                "status": "unhealthy",
                "error": str(e)
            })
        
        return health_status
    
    async def clear_collection(self) -> bool:
        """Clear all data from the collection (use with caution)."""
        await self.ensure_initialized()
        
        try:
            if not CHROMADB_AVAILABLE or not self.collection:
                self._fallback_storage = []
                return True
            
            # Delete all documents in the collection
            self.collection.delete()
            logger.warning("Cleared all data from vector store collection")
            return True
            
        except Exception as e:
            logger.error(f"Error clearing collection: {e}")
            return False


# Global vector store instance
vector_store = VectorStore()


async def get_vector_store() -> VectorStore:
    """Get the global vector store instance."""
    await vector_store.ensure_initialized()
    return vector_store