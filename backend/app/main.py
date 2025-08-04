from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import documents, chat
from app.core.config import settings

app = FastAPI(title="Document Chatbot API", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Document Chatbot API is running"}

@app.get("/api/health/llm")
async def llm_health_check():
    """Check LLM service health"""
    from app.services.llm_service import LLMService
    llm_service = LLMService()
    return await llm_service.health_check()