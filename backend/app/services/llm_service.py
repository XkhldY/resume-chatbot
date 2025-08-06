import google.generativeai as genai
from typing import List, Dict, Any, Optional
import asyncio
import time
import logging
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            self.embedding_model = genai.GenerativeModel('text-embedding-004')
        else:
            self.model = None
            self.embedding_model = None
    
    async def generate_response(
        self, 
        message: str, 
        conversation_id: str, 
        context_documents: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """Generate a response using Gemini API"""
        
        # If no API key is configured, return a placeholder response
        if not self.model or not settings.gemini_api_key:
            return f"Placeholder response for: '{message}'. Please configure your GEMINI_API_KEY in the .env file."
        
        try:
            # Build the prompt with context if available
            prompt = self._build_prompt(message, context_documents)
            
            # Generate response using Gemini
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=500,
                    temperature=0.7,
                    top_p=0.8,
                    top_k=40
                )
            )
            
            return response.text
            
        except Exception as e:
            print(f"Error generating response with Gemini: {e}")
            return f"I'm sorry, I encountered an error while processing your request: {str(e)}"
    
    def _build_prompt(self, message: str, context_documents: Optional[List[Dict[str, Any]]] = None) -> str:
        """Build prompt with context documents for Gemini"""
        base_prompt = """You are a helpful assistant that answers questions based on the provided documents. 
        If you don't have enough information to answer the question, please say so clearly.
        Always be accurate and cite the source documents when possible."""
        
        if context_documents:
            context = "\n\nRelevant document excerpts:\n"
            for doc in context_documents:
                context += f"- From {doc.get('filename', 'unknown')}: {doc.get('text', '')}\n"
            
            full_prompt = f"{base_prompt}\n{context}\n\nUser Question: {message}\n\nResponse:"
            return full_prompt
        
        return f"{base_prompt}\n\nUser Question: {message}\n\nResponse:"
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts using Gemini"""
        if not self.model or not settings.gemini_api_key:
            print("Gemini API key not configured, returning empty embeddings")
            return []
        
        try:
            embeddings = []
            
            # Gemini's embed_content works with individual texts
            for text in texts:
                # Use the embeddings API
                result = await asyncio.to_thread(
                    genai.embed_content,
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_document"
                )
                embeddings.append(result['embedding'])
            
            return embeddings
            
        except Exception as e:
            print(f"Error generating embeddings with Gemini: {e}")
            return []
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for a search query"""
        if not self.model or not settings.gemini_api_key:
            print("Gemini API key not configured")
            return []
        
        try:
            result = await asyncio.to_thread(
                genai.embed_content,
                model="models/text-embedding-004",
                content=query,
                task_type="retrieval_query"
            )
            
            return result['embedding']
            
        except Exception as e:
            print(f"Error generating query embedding with Gemini: {e}")
            return []
    
    def is_configured(self) -> bool:
        """Check if the service is properly configured"""
        return bool(settings.gemini_api_key and self.model)
    
    async def generate_embeddings_batch(
        self, 
        texts: List[str], 
        batch_size: int = None,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ) -> List[List[float]]:
        """Generate embeddings for a batch of texts with efficient processing and error handling."""
        if not self.model or not settings.gemini_api_key:
            logger.warning("Gemini API key not configured, returning empty embeddings")
            return []
        
        if not texts:
            return []
        
        if batch_size is None:
            batch_size = getattr(settings, 'embedding_batch_size', 10)
        
        all_embeddings = []
        failed_indices = []
        
        # Process in batches to avoid rate limits and memory issues
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            batch_start_idx = i
            
            logger.info(f"Processing embedding batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size} "
                       f"({len(batch_texts)} texts)")
            
            batch_embeddings = await self._process_embedding_batch_with_retry(
                batch_texts, batch_start_idx, max_retries, retry_delay
            )
            
            all_embeddings.extend(batch_embeddings)
            
            # Small delay between batches to respect rate limits
            if i + batch_size < len(texts):
                await asyncio.sleep(0.1)
        
        if failed_indices:
            logger.warning(f"Failed to generate embeddings for {len(failed_indices)} texts")
        
        logger.info(f"Successfully generated {len(all_embeddings)} embeddings out of {len(texts)} texts")
        return all_embeddings
    
    async def _process_embedding_batch_with_retry(
        self,
        batch_texts: List[str],
        batch_start_idx: int,
        max_retries: int,
        retry_delay: float
    ) -> List[List[float]]:
        """Process a single batch of embeddings with retry logic."""
        batch_embeddings = []
        
        for idx, text in enumerate(batch_texts):
            global_idx = batch_start_idx + idx
            
            for attempt in range(max_retries + 1):
                try:
                    # Clean and prepare text
                    cleaned_text = self._prepare_text_for_embedding(text)
                    if not cleaned_text.strip():
                        logger.warning(f"Empty text at index {global_idx}, using placeholder")
                        # Use a placeholder for empty text
                        cleaned_text = "Empty document content"
                    
                    # Generate embedding
                    result = await asyncio.to_thread(
                        genai.embed_content,
                        model="models/text-embedding-004",
                        content=cleaned_text,
                        task_type="retrieval_document"
                    )
                    
                    embedding = result.get('embedding')
                    if embedding:
                        batch_embeddings.append(embedding)
                        logger.debug(f"Generated embedding for text {global_idx} (length: {len(embedding)})")
                        break
                    else:
                        raise ValueError("No embedding returned from API")
                        
                except Exception as e:
                    if attempt < max_retries:
                        wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                        logger.warning(f"Attempt {attempt + 1} failed for text {global_idx}: {e}. "
                                     f"Retrying in {wait_time:.1f}s...")
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(f"Failed to generate embedding for text {global_idx} after {max_retries + 1} attempts: {e}")
                        # Add a zero vector as placeholder to maintain alignment
                        placeholder_embedding = [0.0] * getattr(settings, 'embedding_dimension', 768)
                        batch_embeddings.append(placeholder_embedding)
        
        return batch_embeddings
    
    def _prepare_text_for_embedding(self, text: str) -> str:
        """Clean and prepare text for embedding generation."""
        if not text:
            return ""
        
        # Remove excessive whitespace and normalize
        cleaned = ' '.join(text.split())
        
        # Truncate if too long (Gemini has token limits)
        max_chars = getattr(settings, 'max_embedding_chars', 8000)
        if len(cleaned) > max_chars:
            cleaned = cleaned[:max_chars].rsplit(' ', 1)[0]  # Cut at word boundary
            logger.debug(f"Truncated text from {len(text)} to {len(cleaned)} characters")
        
        return cleaned
    
    async def generate_embeddings_with_metadata(
        self,
        texts_with_metadata: List[Dict[str, Any]],
        text_key: str = "text",
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Generate embeddings for texts with associated metadata."""
        texts = [item.get(text_key, "") for item in texts_with_metadata]
        embeddings = await self.generate_embeddings_batch(texts, **kwargs)
        
        # Combine embeddings with original metadata
        results = []
        for i, (item, embedding) in enumerate(zip(texts_with_metadata, embeddings)):
            result = item.copy()
            result['embedding'] = embedding
            result['embedding_generated_at'] = time.time()
            results.append(result)
        
        return results
    
    async def health_check(self) -> Dict[str, Any]:
        """Check if Gemini API is accessible"""
        if not self.is_configured():
            return {
                "status": "error",
                "message": "Gemini API key not configured"
            }
        
        try:
            # Test with a simple prompt
            response = await asyncio.to_thread(
                self.model.generate_content,
                "Hello, this is a health check. Please respond with 'OK'.",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=10,
                    temperature=0
                )
            )
            
            # Also test embedding generation
            test_embedding = await self.generate_query_embedding("test query")
            
            return {
                "status": "healthy",
                "message": "Gemini API is accessible",
                "test_response": response.text,
                "embedding_test": "passed" if test_embedding else "failed",
                "embedding_dimension": len(test_embedding) if test_embedding else 0
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Gemini API health check failed: {str(e)}"
            }