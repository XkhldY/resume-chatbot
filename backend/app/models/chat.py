from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class DocumentSource(BaseModel):
    filename: str
    chunk_text: str
    relevance_score: float

class ChatResponse(BaseModel):
    response: str
    sources: List[DocumentSource]
    conversation_id: str

class Conversation(BaseModel):
    id: str
    title: str
    user_id: Optional[str] = None
    created_at: str
    updated_at: str
    message_count: int
    last_message_preview: str

class ConversationListResponse(BaseModel):
    conversations: List[Conversation]

class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    metadata: Optional[dict] = None