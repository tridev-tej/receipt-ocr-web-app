from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import config, demo, upload

app = FastAPI(title="Receipt OCR Pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config.router)
app.include_router(demo.router)
app.include_router(upload.router)

receipts_dir = Path(__file__).resolve().parent.parent / "data" / "receipts"
if receipts_dir.is_dir():
    app.mount("/api/receipts", StaticFiles(directory=str(receipts_dir)), name="receipt-images")

dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if dist.is_dir():
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=str(dist / "assets")), name="static-assets")

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        file = dist / path
        if file.is_file() and ".." not in path:
            return FileResponse(str(file))
        return FileResponse(str(dist / "index.html"))
