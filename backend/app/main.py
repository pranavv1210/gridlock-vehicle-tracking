"""
Operation Gridlock - FastAPI Backend
Main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

# Initialize FastAPI app
app = FastAPI(
    title="Operation Gridlock API",
    description="Sovereign City Security Intelligence Platform - FOSS Edition",
    version="1.0.0"
)

# CORS Configuration (allow frontend to connect)
# Get allowed origins from environment variable or use defaults
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for precomputed masks and assets
MODELS_PATH = Path(__file__).parent.parent.parent / "models" / "precomputed"
ASSETS_PATH = Path(__file__).parent.parent.parent / "assets"

if MODELS_PATH.exists():
    app.mount("/static/models", StaticFiles(directory=str(MODELS_PATH)), name="models")
if ASSETS_PATH.exists():
    app.mount("/static/assets", StaticFiles(directory=str(ASSETS_PATH)), name="assets")

# Import routes
from app.routes import camera, enhance, route as route_module, tracking, vehicle, realesrgan_enhance

# Include routers
app.include_router(camera.router, prefix="/api/camera", tags=["Camera"])
app.include_router(enhance.router, prefix="/api/enhance", tags=["Enhancement"])
app.include_router(realesrgan_enhance.router, prefix="/api/realesrgan", tags=["Real-ESRGAN GAN"])
app.include_router(route_module.router, prefix="/api/route", tags=["Routing"])
app.include_router(tracking.router, prefix="/api", tags=["Vehicle Tracking"])
app.include_router(vehicle.router, prefix="/api/vehicle", tags=["Vehicle Upload"])

# Try to import SAM3 router (optional - requires torch)
try:
    from app.routes import sam3
    app.include_router(sam3.router, prefix="/api/sam3", tags=["SAM3 Detection"])
except ImportError as e:
    print(f"⚠️ SAM3 routes not available: {e}")
    print("SAM3 features will be disabled. Install with: pip install transformers torch")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "operational",
        "project": "Operation Gridlock",
        "version": "1.0.0",
        "stack": "100% FOSS"
    }


@app.get("/favicon.ico")
async def favicon():
    """Favicon placeholder to prevent 404 errors"""
    return {"message": "No favicon configured yet"}


@app.get("/api/status")
async def status():
    """System status check"""
    return {
        "backend": "online",
        "models_path": str(MODELS_PATH.exists()),
        "assets_path": str(ASSETS_PATH.exists()),
        "endpoints": {
            "camera": "/api/camera/*",
            "routing": "/api/route/*",
            "enhancement": "/api/enhance/*",
            "tracking": "/api/track/*"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
