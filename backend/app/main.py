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

@app.get("/api/health/vector-store")
async def vector_store_health_check():
    """Check vector store health"""
    from app.services.vector_store import get_vector_store
    vector_store = await get_vector_store()
    return await vector_store.health_check()

@app.get("/api/health/all")
async def comprehensive_health_check():
    """Comprehensive health check for all services"""
    from app.services.llm_service import LLMService
    from app.services.vector_store import get_vector_store
    
    llm_service = LLMService()
    vector_store = await get_vector_store()
    
    llm_health = await llm_service.health_check()
    vector_health = await vector_store.health_check()
    
    overall_status = "healthy"
    if llm_health.get("status") != "healthy" or vector_health.get("status") not in ["healthy", "degraded"]:
        overall_status = "unhealthy"
    
    return {
        "status": overall_status,
        "services": {
            "llm": llm_health,
            "vector_store": vector_health
        },
        "vector_store_stats": await vector_store.get_collection_stats()
    }