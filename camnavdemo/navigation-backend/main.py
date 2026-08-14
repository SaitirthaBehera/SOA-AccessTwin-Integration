import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from routes.detect import router as detect_router
from routes.navigate import router as navigate_router
from routes.recommendations import router as recommendations_router

app = FastAPI(
    title="S37 — Accessibility Digital Twin API",
    description="AI-powered accessibility detection and routing for public buildings.",
    version="1.0.0",
)

# Parse CORS origins
cors_origins_list = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if "*" not in cors_origins_list and len(cors_origins_list) == 0:
    cors_origins_list = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list if cors_origins_list else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static/maps/campus", exist_ok=True)
os.makedirs("static/maps/floors", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(detect_router, prefix="/api", tags=["CV Detection"])
app.include_router(navigate_router, prefix="/api", tags=["Navigation"])
app.include_router(recommendations_router, prefix="/api", tags=["Recommendations"])

@app.get("/")
def root():
    return {
        "status": "running", 
        "project": "S37 — Accessibility Digital Twin",
        "message": "Welcome to the backend API!"
    }

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok", "ready": True}