import google.generativeai as genai
from typing import List, Dict, Any, Optional
import asyncio
from app.core.config import settings

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
            
            return {
                "status": "healthy",
                "message": "Gemini API is accessible",
                "test_response": response.text
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Gemini API health check failed: {str(e)}"
            }