from enum import Enum
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any

from services.accessibility_router import router_engine

router = APIRouter()

# Clean Dropdown Choices for all Real Campus Locations
class CampusNode(str, Enum):
    MAIN_ENTRANCE = "main_entrance"
    BLOCK_A = "block_a_entrance"
    BLOCK_B = "block_b_entrance"
    BLOCK_C = "block_c_entrance"
    BLOCK_D = "block_d_entrance"
    BLOCK_E = "block_e_entrance"
    BLOCK_F = "block_f_entrance"
    DATA_SCIENCE_BLOCK = "ds_block_entrance"
    AUDITORIUM = "auditorium_entrance"
    SC_BLOCK = "sc_block_entrance"
    LIBRARY = "library_entrance"
    CAFETERIA = "iter_cafeteria"
    FOOTBALL_GROUND = "football_ground"
    CRICKET_GROUND = "cricket_ground"
    PARKING = "parking_area"
    ROUNDABOUT = "roundabout"

# Dropdown Choices for User Profile
class DisabilityProfile(str, Enum):
    WHEELCHAIR = "wheelchair"
    BLIND = "blind"
    STANDARD = "standard"


@router.get("/navigate")
@router.get("/api/navigate")
def find_accessible_route(
    start: CampusNode = Query(CampusNode.MAIN_ENTRANCE, description="Select starting location from dropdown"),
    end: CampusNode = Query(CampusNode.LIBRARY, description="Select destination from dropdown"),
    profile: DisabilityProfile = Query(DisabilityProfile.WHEELCHAIR, description="Select accessibility profile")
) -> Dict[str, Any]:
    """
    Calculates the shortest, most accessible route between campus locations.
    Wheelchair profile automatically avoids stairs and routes through ramps/elevators.
    """
    start_node = start.value
    end_node = end.value
    user_profile = profile.value

    try:
        # Calling the exact function from accessibility_router.py
        route_result = router_engine.find_route(
            start_id=start_node,
            end_id=end_node,
            user_profile=user_profile
        )

        if not route_result or "error" in route_result:
            raise HTTPException(
                status_code=404,
                detail=route_result.get("error", f"No accessible route found from '{start_node}' to '{end_node}' for {user_profile} profile.")
            )

        return {
            "status": "success",
            "start_location": start_node,
            "end_location": end_node,
            "profile_used": user_profile,
            "total_distance_meters": route_result.get("total_distance_meters", 0),
            "estimated_time_minutes": route_result.get("estimated_time_minutes", 0),
            "path_nodes": route_result.get("path_nodes", []),
            "step_by_step_directions": route_result.get("steps", []),
            "voice_navigation": f"Navigating from {start_node} to {end_node} using {user_profile} accessible route. Total distance is approximately {route_result.get('total_distance_meters', 0)} meters."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Navigation calculation error: {str(e)}"
        )