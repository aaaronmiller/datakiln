from fastapi import FastAPI
from pydantic import BaseModel
from research_agent import ResearchAgent, ResearchMode

app = FastAPI()
research_agent = ResearchAgent()

class ResearchRequest(BaseModel):
    query: str
    mode: ResearchMode = ResearchMode.BALANCED
class ChatData(BaseModel):
    site: str
    userId: str
    timestamp: str
    model: str
    messages: list

@app.get("/")
async def read_root():
    return {"message": "FastAPI backend is running!"}

@app.post("/research")
async def start_research(request: ResearchRequest):
    result = await research_agent.run_research(request.query, request.mode)
    return {"status": "Research started", "result": result}

@app.post("/chat-logs")
async def receive_chat_logs(data: ChatData):
    print(f"Received chat data from {data.site} for user {data.userId}")
    # TODO: Store in database or process
    return {"status": "received"}
