from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse, DocumentSource
from app.services.llm_service import LLMService
from app.services.vector_store import get_vector_store
import uuid

router = APIRouter()
llm_service = LLMService()

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

@router.get("/chat/history/{conversation_id}")
async def get_chat_history(conversation_id: str):
    """Get chat history for a conversation"""
    return {"conversation_id": conversation_id, "messages": []}