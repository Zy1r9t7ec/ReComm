from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.returns import router as returns_router

app = FastAPI(title="ReComm API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "ReComm API is running"}

app.include_router(returns_router)
