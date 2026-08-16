import os
import json
from typing import Dict, Any, Optional, List

BASE_MAP_URL = "http://localhost:8000/static/maps"

def _load_unified_graph():
    graph_file = os.path.join(os.path.dirname(__file__), "unified_graph.json")
    if os.path.exists(graph_file):
        try:
            with open(graph_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"nodes": [], "edges": []}

_graph_data = _load_unified_graph()

DEMO_BUILDINGS: Dict[str, Any] = {
    "soa_iter_campus": {
        "id": "soa_iter_campus",
        "name": "SOA University — ITER Campus",
        "address": "Jagamara, Bhubaneswar, Odisha — 751030",
        "floors": [0, 1, 2, 3, 4, 5],
        "accessibility_health": 88,

        # ── MAP IMAGE URLS ────────────────────────────────────────────────────
        "campus_map": f"{BASE_MAP_URL}/campus/soa_campus_map.png",
        "floor_plans": {
            "block_c": {
                0: f"{BASE_MAP_URL}/floors/block_c/floor_0.png",
                1: f"{BASE_MAP_URL}/floors/block_c/floor_1.png",
                2: f"{BASE_MAP_URL}/floors/block_c/floor_2.png"
            },
            "block_d": {
                0: f"{BASE_MAP_URL}/floors/block_d/floor_0.png",
                1: f"{BASE_MAP_URL}/floors/block_d/floor_1.png",
                2: f"{BASE_MAP_URL}/floors/block_d/floor_2.png",
                3: f"{BASE_MAP_URL}/floors/block_d/floor_3.png"
            },
            "block_e": {
                0: f"{BASE_MAP_URL}/floors/block_e/floor_0.png",
                1: f"{BASE_MAP_URL}/floors/block_e/floor_1.png",
                2: f"{BASE_MAP_URL}/floors/block_e/floor_2.png",
                3: f"{BASE_MAP_URL}/floors/block_e/floor_3.png",
                4: f"{BASE_MAP_URL}/floors/block_e/floor_4.png",
                5: f"{BASE_MAP_URL}/floors/block_e/floor_5.png"
            },
            "block_a": { 0: f"{BASE_MAP_URL}/floors/block_a/floor_0.png", 1: f"{BASE_MAP_URL}/floors/block_a/floor_1.png", 2: f"{BASE_MAP_URL}/floors/block_a/floor_2.png" },
            "block_b": { 0: f"{BASE_MAP_URL}/floors/block_b/floor_0.png", 1: f"{BASE_MAP_URL}/floors/block_b/floor_1.png", 2: f"{BASE_MAP_URL}/floors/block_b/floor_2.png" },
            "block_f": { 0: f"{BASE_MAP_URL}/floors/block_f/floor_0.png", 1: f"{BASE_MAP_URL}/floors/block_f/floor_1.png", 2: f"{BASE_MAP_URL}/floors/block_f/floor_2.png" },
            "data_science_block": { 0: f"{BASE_MAP_URL}/floors/data_science_block/floor_0.png", 1: f"{BASE_MAP_URL}/floors/data_science_block/floor_1.png" },
            "auditorium": { 0: f"{BASE_MAP_URL}/floors/auditorium/floor_0.png", 1: f"{BASE_MAP_URL}/floors/auditorium/floor_1.png" },
            "sc_block": { 0: f"{BASE_MAP_URL}/floors/sc_block/floor_0.png", 1: f"{BASE_MAP_URL}/floors/sc_block/floor_1.png" },
            "library": { 0: f"{BASE_MAP_URL}/floors/library/floor_0.png", 1: f"{BASE_MAP_URL}/floors/library/floor_1.png" },
        },

        # ── UNIFIED NODES (367 Locations across Rooms, Lifts, Bridges, Floors) ───
        "nodes": _graph_data.get("nodes", []),

        # ── UNIFIED EDGES (405 Indoor Corridors + Elevators + Bridges + Campus Roads) ───
        "edges": _graph_data.get("edges", []),

        # ── LIVE BARRIERS ─────────────────────────────────────────────────────
        "barriers": [
            {
                "id": "barrier_block_d_entrance",
                "type": "no_ramp",
                "location": "block_d_entrance",
                "severity": "HIGH",
                "affected_users": ["wheelchair", "mobility_impaired"],
                "confidence": 0.84,
                "verification_status": "COMMUNITY_VERIFIED",
                "reported_at": "2026-08-16",
                "note": "Steps at entrance, accessible bridge from Block E or C recommended",
            }
        ]
    }
}

def get_building(building_id: str):
    return DEMO_BUILDINGS.get(building_id)

def get_all_buildings():
    return [{"id": k, "name": v["name"]} for k, v in DEMO_BUILDINGS.items()]

def get_floor_plan_url(building_id: str, block_id: str, floor: int) -> Optional[str]:
    data = get_building(building_id)
    if not data:
        return None
    floor_plans = data.get("floor_plans", {})
    block_floors = floor_plans.get(block_id, {})
    return block_floors.get(floor, None)

def get_campus_map_url(building_id: str) -> Optional[str]:
    data = get_building(building_id)
    if not data:
        return None
    return data.get("campus_map", None)