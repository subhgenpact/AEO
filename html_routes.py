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


@router.get("/demand-modular")
async def demand_modular_page():
    """Serve the modular demand dashboard page"""
    return FileResponse("frontend/demand-modular.html")


@router.get("/test-dependencies")
async def test_dependencies_page():
    """Serve the dependency test page"""
    return FileResponse("frontend/test-dependencies.html")


@router.get("/debug-loading")
async def debug_loading_page():
    """Serve the script loading debug page"""
    return FileResponse("frontend/debug-loading.html")


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


@router.get("/gap-analysis-v1")
async def gap_analysis_v1_page():
    """Serve the gap analysis v1 page (alternative version)"""
    return FileResponse("frontend/GapAnalysis1.html")


# Keep backward compatibility with .html extensions
@router.get("/demand.html")
async def demand_page_html():
    """Legacy route - redirects to /demand"""
    return FileResponse("frontend/demand.html")


@router.get("/demand-modular.html")
async def demand_modular_page_html():
    """Legacy route - redirects to /demand-modular"""
    return FileResponse("frontend/demand-modular.html")


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


@router.get("/src/sections/{section_name}/{filename}")
async def serve_section_files(section_name: str, filename: str):
    """Serve section-specific files (JS and HTML templates)"""
    file_path = Path(f"frontend/src/sections/{section_name}/{filename}")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail=f"Section file not found: {section_name}/{filename}")


@router.get("/src/sections/{filename}")
async def serve_section_manager(filename: str):
    """Serve section manager files"""
    file_path = Path(f"frontend/src/sections/{filename}")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail=f"Section manager file not found: {filename}")


@router.get("/src/images/{filename}")
async def serve_images(filename: str):
    """Serve image files"""
    file_path = Path(f"frontend/src/images/{filename}")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Image not found")
