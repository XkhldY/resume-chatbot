from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest, ChatResponse, DocumentSource, ConversationListResponse
from app.services.llm_service import LLMService
from app.services.vector_store import get_vector_store
from app.services.streaming_service import StreamingService
from app.services.conversation_manager import ConversationManager
import uuid
from typing import Optional, List

router = APIRouter()
llm_service = LLMService()
streaming_service = StreamingService()
conversation_manager = ConversationManager()

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message and get AI response with RAG functionality"""
    try:
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        # Get vector store instance
        vector_store = await get_vector_store()
        
        # Search for relevant documents
        similar_chunks = await vector_store.search_similar(
            query=request.message,
            n_results=5
        )
        
        # Convert to format expected by LLM service
        context_documents = [
            {
                "filename": chunk.get("document_name", "unknown"),
                "text": chunk.get("text", ""),
                "score": chunk.get("similarity_score", 0.0)
            }
            for chunk in similar_chunks
        ]
        
        # Generate response using retrieved context
        response = await llm_service.generate_response(
            message=request.message,
            conversation_id=conversation_id,
            context_documents=context_documents if context_documents else None
        )
        
        # Convert chunks to DocumentSource format for response
        sources = [
            DocumentSource(
                filename=chunk.get("document_name", "unknown"),
                chunk_text=chunk.get("text", "")[:200] + "..." if len(chunk.get("text", "")) > 200 else chunk.get("text", ""),
                relevance_score=chunk.get("similarity_score", 0.0)
            )
            for chunk in similar_chunks[:3]  # Limit to top 3 sources in response
        ]
        
        return ChatResponse(
            response=response,
            sources=sources,
            conversation_id=conversation_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@router.get("/stream/{conversation_id}")
async def stream_chat_response(conversation_id: str, message: str, client_id: Optional[str] = None):
    """Stream chat response using Server-Sent Events"""
    try:
        client_id = client_id or str(uuid.uuid4())
        return StreamingResponse(
            streaming_service.stream_chat_response(conversation_id, message, client_id),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error streaming response: {str(e)}")

@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(user_id: Optional[str] = None, limit: int = 50):
    """List user conversations with metadata"""
    try:
        conversations = await conversation_manager.get_user_conversations(user_id, limit)
        return ConversationListResponse(conversations=conversations)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching conversations: {str(e)}")

@router.post("/conversations")
async def create_conversation(title: str, user_id: Optional[str] = None):
    """Create new conversation"""
    try:
        conversation = await conversation_manager.create_conversation(title, user_id)
        return {"conversation_id": conversation.id, "title": conversation.title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating conversation: {str(e)}")

@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation with full message history"""
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching conversation: {str(e)}")

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete conversation and all messages"""
    try:
        success = await conversation_manager.delete_conversation(conversation_id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting conversation: {str(e)}")

@router.get("/chat/history/{conversation_id}")
async def get_chat_history(conversation_id: str):
    """Get chat history for a conversation"""
    return {"conversation_id": conversation_id, "messages": []}