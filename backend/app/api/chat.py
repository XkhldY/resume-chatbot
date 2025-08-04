from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse, DocumentSource
from app.services.llm_service import LLMService
from app.services.vector_store import VectorStore
import uuid

router = APIRouter()
llm_service = LLMService()
vector_store = VectorStore()

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message and get AI response"""
    try:
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        # For now, return a simple echo response
        # Later we'll add vector search and LLM integration
        response = await llm_service.generate_response(
            message=request.message,
            conversation_id=conversation_id
        )
        
        # Placeholder sources
        sources = [
            DocumentSource(
                filename="placeholder.txt",
                chunk_text="This is a placeholder source chunk",
                relevance_score=0.8
            )
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