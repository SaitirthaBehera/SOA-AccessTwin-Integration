import os
import base64
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from services.blueprint_parser import blueprint_ai_parser
from services.supabase_sync import supabase_sync
from services.accessibility_router import router_engine
from data.demo_building import DEMO_BUILDINGS

router = APIRouter()

class FloorMapUploadRequest(BaseModel):
    building_id: str
    floor_number: int
    image_base64: str

@router.post("/admin/upload-floor-map")
@router.post("/api/admin/upload-floor-map")
async def upload_floor_map(
    building_id: str = Form(...),
    floor_number: int = Form(...),
    file: Optional[UploadFile] = File(None)
):
    """
    Ingests a floor plan blueprint image, uses Gemini 3.7 Vision to extract rooms/corridors,
    saves the image for frontend rendering, and automatically syncs the graph to Supabase!
    """
    if not file:
        raise HTTPException(status_code=400, detail="Floor map image file is required.")
        
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    clean_bldg = building_id.lower().strip().replace(" ", "_").replace("-", "_")
    floor_num = int(floor_number)

    # 1. Save image to backend static maps and frontend public maps
    backend_save_dir = os.path.join(os.path.dirname(__file__), "..", "static", "maps", "floors", clean_bldg)
    frontend_save_dir = os.path.join(os.path.dirname(__file__), "..", "..", "camnavdemo", "public", "maps", "floors", clean_bldg)
    
    os.makedirs(backend_save_dir, exist_ok=True)
    os.makedirs(frontend_save_dir, exist_ok=True)
    
    file_name = f"floor_{floor_num}.png"
    b_path = os.path.join(backend_save_dir, file_name)
    f_path = os.path.join(frontend_save_dir, file_name)
    
    with open(b_path, "wb") as f:
        f.write(image_bytes)
    try:
        with open(f_path, "wb") as f:
            f.write(image_bytes)
    except Exception as e:
        print(f"[AdminMaps] Frontend mirror save note: {e}")

    # 2. Run Gemini 3.7 Vision Blueprint Parser
    new_nodes, new_edges = blueprint_ai_parser.parse_floor_plan(image_bytes, clean_bldg, floor_num)

    # 3. Automatically sync nodes and edges to Supabase and update local graph
    sync_res = supabase_sync.sync_nodes_and_edges(new_nodes, new_edges)

    # 4. Re-initialize in-memory Dijkstra router to activate the new block immediately
    router_engine._build_graph()

    # 5. Update floor_plans registry in memory
    bldg_dict = DEMO_BUILDINGS.get("soa_iter_campus", {})
    if "floor_plans" in bldg_dict:
        if clean_bldg not in bldg_dict["floor_plans"]:
            bldg_dict["floor_plans"][clean_bldg] = {}
        bldg_dict["floor_plans"][clean_bldg][floor_num] = f"http://localhost:8000/static/maps/floors/{clean_bldg}/{file_name}"

    return {
        "status": "success",
        "message": f"Successfully ingested {clean_bldg.upper()} Floor {floor_num} with AI Blueprint Analysis!",
        "building_id": clean_bldg,
        "floor_number": floor_num,
        "image_url": f"/maps/floors/{clean_bldg}/{file_name}",
        "nodes_extracted": len(new_nodes),
        "edges_generated": len(new_edges),
        "sample_nodes": [n["label"] for n in new_nodes[:5]],
        "sync_details": sync_res
    }

@router.post("/admin/upload-floor-map-json")
@router.post("/api/admin/upload-floor-map-json")
async def upload_floor_map_json(payload: FloorMapUploadRequest):
    """Base64 JSON alternative for headless / API calls"""
    clean_bldg = payload.building_id.lower().strip().replace(" ", "_").replace("-", "_")
    floor_num = int(payload.floor_number)
    
    raw_b64 = payload.image_base64
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",")[1]
    image_bytes = base64.b64decode(raw_b64)
    
    backend_save_dir = os.path.join(os.path.dirname(__file__), "..", "static", "maps", "floors", clean_bldg)
    frontend_save_dir = os.path.join(os.path.dirname(__file__), "..", "..", "camnavdemo", "public", "maps", "floors", clean_bldg)
    os.makedirs(backend_save_dir, exist_ok=True)
    os.makedirs(frontend_save_dir, exist_ok=True)
    
    file_name = f"floor_{floor_num}.png"
    with open(os.path.join(backend_save_dir, file_name), "wb") as f:
        f.write(image_bytes)
    try:
        with open(os.path.join(frontend_save_dir, file_name), "wb") as f:
            f.write(image_bytes)
    except Exception:
        pass

    new_nodes, new_edges = blueprint_ai_parser.parse_floor_plan(image_bytes, clean_bldg, floor_num)
    sync_res = supabase_sync.sync_nodes_and_edges(new_nodes, new_edges)
    router_engine._build_graph()

    return {
        "status": "success",
        "message": f"Successfully ingested {clean_bldg.upper()} Floor {floor_num} with AI Blueprint Analysis!",
        "building_id": clean_bldg,
        "floor_number": floor_num,
        "image_url": f"/maps/floors/{clean_bldg}/{file_name}",
        "nodes_extracted": len(new_nodes),
        "edges_generated": len(new_edges),
        "sync_details": sync_res
    }
