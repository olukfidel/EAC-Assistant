from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from eac_engine import EACKnowledgeBase
import os
from dotenv import load_dotenv

load_dotenv()

engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    try:
        engine = EACKnowledgeBase()
        print("Engine Initialized.")
    except Exception as e:
        print(f"Engine Failed: {e}")
    yield

app = FastAPI(lifespan=lifespan)

# CORS: Allow all for dev, restrict in prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str

@app.post("/chat")
async def chat(req: ChatRequest):
    if not engine: raise HTTPException(503, "Starting up...")
    return await engine.answer_question(req.query)

@app.post("/refresh")
async def refresh(bg_tasks: BackgroundTasks):
    if not engine: raise HTTPException(503, "Starting up...")
    bg_tasks.add_task(engine.build_knowledge_base)
    return {"status": "Refresh started"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)