"""
HTML Routes for serving frontend pages
Clean route names instead of direct .html access
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter(tags=["frontend"])


@router.get("/")
async def home():
    """Serve the home page"""
    return FileResponse("frontend/index.html")


@router.get("/demand")
async def demand_page():
    """Serve the demand dashboard page"""
    return FileResponse("frontend/demand.html")


@router.get("/datatable")
async def datatable_page():
    """Serve the datatable page"""
    return FileResponse("frontend/datatable.html")


@router.get("/bom-explosion")
async def bom_explosion_page():
    """Serve the BOM explosion page"""
    return FileResponse("frontend/BOMexplosion.html")


@router.get("/gap-analysis")
async def gap_analysis_page():
    """Serve the gap analysis page"""
    return FileResponse("frontend/GapAnalysis.html")


# Keep backward compatibility with .html extensions
@router.get("/demand.html")
async def demand_page_html():
    """Legacy route - redirects to /demand"""
    return FileResponse("frontend/demand.html")


@router.get("/datatable.html")
async def datatable_page_html():
    """Legacy route - redirects to /datatable"""
    return FileResponse("frontend/datatable.html")


@router.get("/BOMexplosion.html")
async def bom_explosion_page_html():
    """Legacy route - redirects to /bom-explosion"""
    return FileResponse("frontend/BOMexplosion.html")


@router.get("/GapAnalysis.html")
async def gap_analysis_page_html():
    """Legacy route - redirects to /gap-analysis"""
    return FileResponse("frontend/GapAnalysis.html")


@router.get("/index.html")
async def index_page_html():
    """Legacy route - redirects to /"""
    return FileResponse("frontend/index.html")


# Serve static assets
@router.get("/styles.css")
async def serve_styles():
    """Serve main styles.css"""
    return FileResponse("frontend/styles.css")


@router.get("/src/css/{filename}")
async def serve_css(filename: str):
    """Serve CSS files from src/css"""
    file_path = Path(f"frontend/src/css/{filename}")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="CSS file not found")


@router.get("/src/{filename}")
async def serve_js(filename: str):
    """Serve JavaScript files from src"""
    file_path = Path(f"frontend/src/{filename}")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="JS file not found")


@router.get("/src/images/{filename}")
async def serve_images(filename: str):
    """Serve image files"""
    file_path = Path(f"frontend/src/images/{filename}")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Image not found")
