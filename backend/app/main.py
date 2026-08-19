from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routers.health import router as health_router
from app.routers.transit import router as transit_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for mapping transit accessibility and gap analysis.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
origins = []
if isinstance(settings.BACKEND_CORS_ORIGINS, list):
    origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
elif isinstance(settings.BACKEND_CORS_ORIGINS, str):
    origins = [settings.BACKEND_CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(transit_router, prefix=settings.API_V1_STR)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log exception here if you have a logger
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc)},
    )


@app.get("/")
def read_root():
    return {
        "app": settings.PROJECT_NAME,
        "version": "0.1.0",
        "documentation": "/docs",
        "status": "online"
    }