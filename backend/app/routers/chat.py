from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.chatbot import find_best_answer

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    language: str = Field(default="en")
    history: Optional[List[ChatMessage]] = Field(default_factory=list)

class ChatResponse(BaseModel):
    reply: str
    matched_topic: Optional[str] = None
    confidence: float
    suggestions: List[str] = []

@router.post("", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    result = find_best_answer(query=payload.message, language=payload.language)
    return ChatResponse(
        reply=result["reply"],
        matched_topic=result.get("matched_topic"),
        confidence=result.get("confidence", 0.0),
        suggestions=result.get("suggestions", [])
    )
