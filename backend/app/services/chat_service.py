"""
Chat Service with RAG Integration

This service handles conversation management, message processing, and RAG (Retrieval-Augmented Generation).
It integrates vector search with LLM responses to provide context-aware chat functionality.

Key Features:
- Conversation persistence and management
- RAG pipeline integration (retrieve → augment → generate)
- Message history tracking
- Source attribution and citation
- Streaming response support
"""

import uuid
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple
from dataclasses import dataclass
import json
import logging

from app.core.config import settings
from app.services.llm_service import LLMService
from app.services.vector_store import VectorStore
from app.models.chat import ChatMessage, Conversation, ChatResponse, DocumentSource

logger = logging.getLogger(__name__)

@dataclass
class RetrievalContext:
    """Context retrieved from vector database for RAG"""
    chunks: List[Dict[str, Any]]
    sources: List[DocumentSource]
    query_embedding: List[float]
    similarity_threshold: float
    retrieval_time: float

class ChatService:
    """
    Main chat service handling conversations and RAG pipeline
    
    This service orchestrates the complete chat workflow:
    1. Process user message
    2. Retrieve relevant context from vector database
    3. Generate context-aware response using LLM
    4. Track conversation history
    5. Provide source citations
    """
    
    def __init__(self):
        self.llm_service = LLMService()
        self.vector_store = VectorStore()
        self.conversations: Dict[str, Conversation] = {}  # In-memory storage (TODO: Move to database)
        self.max_history_length = settings.max_conversation_history
        self.max_context_chunks = settings.max_context_chunks_per_query
        
    async def create_conversation(self, title: Optional[str] = None) -> Conversation:
        """
        Create a new conversation
        
        Args:
            title: Optional conversation title, auto-generated if not provided
            
        Returns:
            New conversation object with unique ID
        """
        conversation_id = str(uuid.uuid4())
        conversation = Conversation(
            id=conversation_id,
            title=title or f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            messages=[],
            metadata={}
        )
        
        self.conversations[conversation_id] = conversation
        logger.info(f"Created new conversation: {conversation_id}")
        return conversation
    
    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get conversation by ID"""
        return self.conversations.get(conversation_id)
    
    async def list_conversations(self, limit: int = 50, offset: int = 0) -> List[Conversation]:
        """List all conversations with pagination"""
        conversations = list(self.conversations.values())
        conversations.sort(key=lambda c: c.updated_at, reverse=True)
        return conversations[offset:offset + limit]
    
    async def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation"""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
            logger.info(f"Deleted conversation: {conversation_id}")
            return True
        return False
    
    async def process_message(
        self, 
        conversation_id: str, 
        message: str,
        use_rag: bool = True,
        stream: bool = False
    ) -> ChatResponse:
        """
        Process a user message and generate response
        
        This is the main RAG pipeline:
        1. Retrieve relevant context from vector database
        2. Format context for LLM prompt
        3. Generate response using LLM
        4. Update conversation history
        5. Return response with citations
        
        Args:
            conversation_id: ID of the conversation
            message: User's message text
            use_rag: Whether to use RAG retrieval (default: True)
            stream: Whether to stream the response (default: False)
            
        Returns:
            ChatResponse with generated text and source citations
        """
        try:
            # Get or create conversation
            conversation = await self.get_conversation(conversation_id)
            if not conversation:
                conversation = await self.create_conversation()
                conversation_id = conversation.id
            
            # Add user message to history
            user_message = ChatMessage(
                id=str(uuid.uuid4()),
                role="user",
                content=message,
                timestamp=datetime.now(),
                metadata={}
            )
            conversation.messages.append(user_message)
            
            # Retrieve context if RAG is enabled
            context = None
            sources = []
            if use_rag:
                context = await self._retrieve_context(message, conversation)
                sources = context.sources if context else []
            
            # Generate response
            if stream:
                # TODO: Implement streaming response
                response_text = await self._generate_streaming_response(message, context, conversation)
            else:
                response_text = await self._generate_response(message, context, conversation)
            
            # Add assistant message to history
            assistant_message = ChatMessage(
                id=str(uuid.uuid4()),
                role="assistant",
                content=response_text,
                timestamp=datetime.now(),
                metadata={
                    "sources": [source.dict() for source in sources],
                    "context_used": context is not None,
                    "retrieval_time": context.retrieval_time if context else 0
                }
            )
            conversation.messages.append(assistant_message)
            
            # Update conversation
            conversation.updated_at = datetime.now()
            self._trim_conversation_history(conversation)
            
            # Create response
            response = ChatResponse(
                response=response_text,
                sources=sources,
                conversation_id=conversation_id,
                message_id=assistant_message.id,
                metadata={
                    "context_chunks_used": len(context.chunks) if context else 0,
                    "processing_time": (datetime.now() - user_message.timestamp).total_seconds()
                }
            )
            
            logger.info(f"Processed message in conversation {conversation_id}, "
                       f"used {len(sources)} sources")
            return response
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            raise
    
    async def _retrieve_context(self, query: str, conversation: Conversation) -> Optional[RetrievalContext]:
        """
        Retrieve relevant context from vector database
        
        This performs semantic search to find the most relevant document chunks
        for the user's query. It considers conversation history for better context.
        
        Args:
            query: User's query text
            conversation: Current conversation for context
            
        Returns:
            RetrievalContext with chunks, sources, and metadata
        """
        try:
            start_time = datetime.now()
            
            # Enhance query with conversation context
            enhanced_query = self._enhance_query_with_context(query, conversation)
            
            # Perform vector search
            search_results = await self.vector_store.search_similar_chunks(
                query=enhanced_query,
                limit=self.max_context_chunks,
                similarity_threshold=settings.similarity_threshold
            )
            
            if not search_results:
                logger.info(f"No relevant context found for query: {query[:50]}...")
                return None
            
            # Convert results to context format
            chunks = []
            sources = []
            
            for result in search_results:
                chunk_data = {
                    "text": result.get("text", ""),
                    "metadata": result.get("metadata", {}),
                    "similarity_score": result.get("score", 0.0)
                }
                chunks.append(chunk_data)
                
                # Create source attribution
                source = DocumentSource(
                    filename=result.get("metadata", {}).get("filename", "Unknown"),
                    chunk_text=result.get("text", "")[:200] + "..." if len(result.get("text", "")) > 200 else result.get("text", ""),
                    relevance_score=result.get("score", 0.0),
                    page_number=result.get("metadata", {}).get("page_number"),
                    chunk_index=result.get("metadata", {}).get("chunk_index", 0)
                )
                sources.append(source)
            
            retrieval_time = (datetime.now() - start_time).total_seconds()
            
            context = RetrievalContext(
                chunks=chunks,
                sources=sources,
                query_embedding=search_results[0].get("query_embedding", []),
                similarity_threshold=settings.similarity_threshold,
                retrieval_time=retrieval_time
            )
            
            logger.info(f"Retrieved {len(chunks)} chunks in {retrieval_time:.2f}s")
            return context
            
        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}")
            return None
    
    def _enhance_query_with_context(self, query: str, conversation: Conversation) -> str:
        """
        Enhance user query with conversation context
        
        This takes recent conversation history to provide better context
        for the vector search, improving retrieval accuracy.
        """
        if not conversation.messages:
            return query
        
        # Get last few messages for context
        recent_messages = conversation.messages[-4:]  # Last 4 messages
        context_parts = []
        
        for msg in recent_messages:
            if msg.role == "user":
                context_parts.append(f"Previous question: {msg.content}")
            elif msg.role == "assistant":
                # Just add a brief context, not full response
                content_preview = msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
                context_parts.append(f"Previous answer: {content_preview}")
        
        if context_parts:
            enhanced_query = f"Context: {' '.join(context_parts[-2:])} Current question: {query}"
            return enhanced_query
        
        return query
    
    async def _generate_response(
        self, 
        message: str, 
        context: Optional[RetrievalContext],
        conversation: Conversation
    ) -> str:
        """
        Generate response using LLM with optional RAG context
        
        This formats the retrieved context and conversation history
        into a prompt for the LLM to generate a contextual response.
        """
        try:
            # Prepare context documents for LLM
            context_documents = []
            if context:
                for chunk in context.chunks:
                    doc = {
                        "filename": chunk.get("metadata", {}).get("filename", "Unknown"),
                        "text": chunk.get("text", ""),
                        "relevance": chunk.get("similarity_score", 0.0)
                    }
                    context_documents.append(doc)
            
            # Generate response using LLM service
            response = await self.llm_service.generate_response(
                message=message,
                conversation_id=conversation.id,
                context_documents=context_documents
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return "I apologize, but I encountered an error while processing your request. Please try again."
    
    async def _generate_streaming_response(
        self,
        message: str,
        context: Optional[RetrievalContext],
        conversation: Conversation
    ) -> AsyncGenerator[str, None]:
        """
        Generate streaming response for real-time chat experience
        
        TODO: Implement streaming with LLM service
        This would yield chunks of the response as they're generated,
        providing a better user experience for long responses.
        """
        # Placeholder for streaming implementation
        response = await self._generate_response(message, context, conversation)
        
        # Simulate streaming by yielding chunks
        words = response.split()
        for i in range(0, len(words), 3):  # Yield 3 words at a time
            chunk = " ".join(words[i:i+3])
            if i + 3 < len(words):
                chunk += " "
            yield chunk
            await asyncio.sleep(0.1)  # Simulate processing delay
    
    def _trim_conversation_history(self, conversation: Conversation):
        """
        Trim conversation history to maintain performance
        
        Keeps only the most recent messages within the configured limit
        to prevent conversations from growing indefinitely.
        """
        if len(conversation.messages) > self.max_history_length:
            # Keep the most recent messages
            conversation.messages = conversation.messages[-self.max_history_length:]
            logger.info(f"Trimmed conversation {conversation.id} to {self.max_history_length} messages")
    
    async def get_conversation_summary(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """
        Generate conversation summary and statistics
        
        Provides insights about the conversation including:
        - Message count, document sources used, topics discussed
        """
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            return None
        
        user_messages = [msg for msg in conversation.messages if msg.role == "user"]
        assistant_messages = [msg for msg in conversation.messages if msg.role == "assistant"]
        
        # Collect unique sources used
        sources_used = set()
        for msg in assistant_messages:
            if "sources" in msg.metadata:
                for source in msg.metadata["sources"]:
                    sources_used.add(source.get("filename", "Unknown"))
        
        return {
            "conversation_id": conversation_id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
            "message_count": len(conversation.messages),
            "user_messages": len(user_messages),
            "assistant_messages": len(assistant_messages),
            "unique_sources": len(sources_used),
            "sources_list": list(sources_used),
            "duration": str(conversation.updated_at - conversation.created_at)
        }
    
    async def search_conversations(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search conversations by content
        
        TODO: Implement full-text search across conversation messages
        This would allow users to find previous conversations by content.
        """
        # Placeholder implementation - basic text matching
        results = []
        query_lower = query.lower()
        
        for conversation in self.conversations.values():
            for message in conversation.messages:
                if query_lower in message.content.lower():
                    summary = await self.get_conversation_summary(conversation.id)
                    if summary and summary not in results:
                        results.append(summary)
                    break
            
            if len(results) >= limit:
                break
        
        return results