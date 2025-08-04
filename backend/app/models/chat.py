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