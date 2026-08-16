import os
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.accessibility_router import router_engine
from data.demo_building import get_floor_plan_url, get_campus_map_url

router = APIRouter()

class NavigateRequest(BaseModel):
    startNodeId: Optional[str] = None
    targetNodeId: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    profile: Optional[str] = "wheelchair"

def _normalize_node_id(node_id: Optional[str]) -> str:
    if not node_id:
        return "main_entrance"
    n = node_id.strip()
    
    # Direct match in graph nodes
    if n in router_engine.nodes_data:
        return n
    
    n_lower = n.lower()
    # Check lowercase match
    for k in router_engine.nodes_data.keys():
        if k.lower() == n_lower:
            return k
            
    # Fuzzy alias matching for campus buildings
    if "library" in n_lower:
        return "library_entrance"
    if "auditorium" in n_lower:
        return "auditorium_entrance"
    if "cafeteria" in n_lower:
        return "iter_cafeteria"
    if "block-a" in n_lower or "block_a" in n_lower:
        return "block_a_entrance"
    if "block-b" in n_lower or "block_b" in n_lower:
        return "block_b_entrance"
    if "block-c" in n_lower or "block_c" in n_lower:
        return "block_c_football_entrance"
    if "block-d" in n_lower or "block_d" in n_lower:
        return "block_d_entrance"
    if "block-e" in n_lower or "block_e" in n_lower:
        return "block_e_main_entrance"
    if "block-f" in n_lower or "block_f" in n_lower:
        return "block_f_entrance"
    if "ds_block" in n_lower or "data_science" in n_lower:
        return "ds_block_entrance"
    if "sc_block" in n_lower:
        return "sc_block_entrance"
    if "parking" in n_lower:
        return "parking_area"
    if "roundabout" in n_lower:
        return "roundabout"
        
    return n

def _build_route_response(start_id: str, end_id: str, profile: str) -> Dict[str, Any]:
    norm_start = _normalize_node_id(start_id)
    norm_end = _normalize_node_id(end_id)

    route_result = router_engine.find_route(
        start_id=norm_start,
        end_id=norm_end,
        user_profile=profile
    )

    if not route_result or "error" in route_result:
        raise HTTPException(
            status_code=404,
            detail=route_result.get("error", f"No accessible route found between '{norm_start}' and '{norm_end}' for {profile} profile.")
        )

    total_dist = route_result.get("total_distance_meters", 0)
    est_mins = route_result.get("estimated_time_minutes", 1.0)
    path_nodes = route_result.get("path_nodes", [])
    raw_steps = route_result.get("steps", [])

    formatted_steps = []
    involved_floors = []
    
    # 1. Collect all involved floor plans
    for nid in path_nodes:
        node_info = router_engine.nodes_data.get(nid, {})
        fl = node_info.get("floor", 0)
        bldg = node_info.get("building_id", "soa_iter_campus")
        floor_key = f"{bldg}_f{fl}"
        if floor_key not in [f.get("key") for f in involved_floors]:
            floor_plan_img = get_floor_plan_url("soa_iter_campus", bldg, fl)
            involved_floors.append({
                "key": floor_key,
                "buildingId": bldg,
                "floor": fl,
                "floorName": f"Floor {fl}" if fl > 0 else "Ground Floor",
                "floorPlanUrl": floor_plan_img
            })

    # 2. Build concise step items
    for i, step_text in enumerate(raw_steps):
        step_obj = {
            "stepNumber": i + 1,
            "instruction": step_text,
            "floorId": 0,
            "floorName": "Wayfinding Point",
            "buildingId": "soa_iter_campus",
            "distanceMeters": int(total_dist / max(1, len(raw_steps))),
            "nodeId": f"step-{i+1}",
            "nodeLabel": step_text,
            "featureTypeUsed": "elevator" if "elevator" in step_text.lower() or "lift" in step_text.lower() else "stairs" if "stairs" in step_text.lower() else "bridge" if "bridge" in step_text.lower() or "passage" in step_text.lower() else "ramp" if "ramp" in step_text.lower() else "corridor"
        }
        formatted_steps.append(step_obj)

    start_info = router_engine.nodes_data.get(norm_start, {})
    end_info = router_engine.nodes_data.get(norm_end, {})

    accessible_features = []
    if profile == "wheelchair":
        accessible_features.append("Step-Free Wheelchair Access (Lifts, Ramps & Bridges)")
        accessible_features.append("Continuous Level Surface")
    else:
        accessible_features.append("Tactile Ground Indicators")
        accessible_features.append("Standard Wayfinding")

    voice_msg = route_result.get("voice_guidance") or f"Go from {start_info.get('label', norm_start)} to {end_info.get('label', norm_end)}. Total distance is {total_dist} meters."

    return {
        "status": "success",
        "start_location": norm_start,
        "end_location": norm_end,
        "start_label": start_info.get("label", norm_start),
        "end_label": end_info.get("label", norm_end),
        "profile_used": profile,
        "total_distance_meters": total_dist,
        "estimated_time_minutes": max(1, int(est_mins)),
        "path_nodes": path_nodes,
        "step_by_step_directions": raw_steps,
        "steps": formatted_steps,
        "involved_floors": involved_floors,
        "accessible_features": accessible_features,
        "voice_guidance": voice_msg,
        "campus_map_url": get_campus_map_url("soa_iter_campus"),
        "fromNode": {
            "id": norm_start,
            "name": start_info.get("label", norm_start),
            "floorId": start_info.get("floor", 0),
            "buildingId": start_info.get("building_id", "soa_iter_campus"),
            "type": start_info.get("type", "entrance"),
            "isAccessible": start_info.get("accessible", True),
            "x": start_info.get("coords", {}).get("x", 20),
            "y": start_info.get("coords", {}).get("y", 20)
        },
        "toNode": {
            "id": norm_end,
            "name": end_info.get("label", norm_end),
            "floorId": end_info.get("floor", 0),
            "buildingId": end_info.get("building_id", "soa_iter_campus"),
            "type": end_info.get("type", "room"),
            "isAccessible": end_info.get("accessible", True),
            "x": end_info.get("coords", {}).get("x", 80),
            "y": end_info.get("coords", {}).get("y", 80)
        }
    }

@router.get("/navigate")
@router.get("/api/navigate")
def navigate_get(
    start: Optional[str] = Query(None, description="Start node identifier or room code (e.g. c_f2_r05, main_entrance)"),
    end: Optional[str] = Query(None, description="Destination node identifier or room code (e.g. e_f5_r03)"),
    profile: Optional[str] = Query("wheelchair", description="User accessibility profile (wheelchair, blind, standard)")
):
    if not start or not end:
        raise HTTPException(
            status_code=422,
            detail="Both 'start' and 'end' query parameters are required for campus navigation."
        )
    return _build_route_response(start, end, profile)

@router.post("/navigate")
@router.post("/api/navigate")
def navigate_post(req: NavigateRequest):
    start_id = req.start or req.startNodeId
    end_id = req.end or req.targetNodeId
    profile = req.profile or "wheelchair"

    if not start_id or not end_id:
        raise HTTPException(
            status_code=422,
            detail="Both 'start' (or 'startNodeId') and 'end' (or 'targetNodeId') are required."
        )
    return _build_route_response(start_id, end_id, profile)

@router.get("/nodes")
@router.get("/api/nodes")
def get_all_campus_nodes():
    """Returns all 374 campus nodes categorized by building and floor for frontend dropdown selectors"""
    nodes_list = []
    for nid, data in router_engine.nodes_data.items():
        nodes_list.append(data)
    return {
        "status": "success",
        "total_nodes": len(nodes_list),
        "nodes": nodes_list
    }