from typing import Dict, Any, Optional, List

# Base URL for serving map images from FastAPI static files
BASE_MAP_URL = "http://localhost:8000/static/maps"

DEMO_BUILDINGS: Dict[str, Any] = {
    "soa_iter_campus": {
        "id":    "soa_iter_campus",
        "name":  "SOA University — ITER Campus",
        "address": "Jagamara, Bhubaneswar, Odisha — 751030",
        "floors": [0, 1, 2, 3, 4, 5],
        "accessibility_health": 68,

        # ── MAP IMAGE URLS ────────────────────────────────────────────────────
        "campus_map": f"{BASE_MAP_URL}/campus/soa_campus_map.png",
        "floor_plans": {
            "block_a": { 0: f"{BASE_MAP_URL}/floors/block_a/floor_0.png", 1: f"{BASE_MAP_URL}/floors/block_a/floor_1.png", 2: f"{BASE_MAP_URL}/floors/block_a/floor_2.png" },
            "block_b": { 0: f"{BASE_MAP_URL}/floors/block_b/floor_0.png", 1: f"{BASE_MAP_URL}/floors/block_b/floor_1.png", 2: f"{BASE_MAP_URL}/floors/block_b/floor_2.png" },
            "block_c": { 0: f"{BASE_MAP_URL}/floors/block_c/floor_0.png", 1: f"{BASE_MAP_URL}/floors/block_c/floor_1.png", 2: f"{BASE_MAP_URL}/floors/block_c/floor_2.png" },
            "block_d": { 0: f"{BASE_MAP_URL}/floors/block_d/floor_0.png", 1: f"{BASE_MAP_URL}/floors/block_d/floor_1.png", 2: f"{BASE_MAP_URL}/floors/block_d/floor_2.png", 3: f"{BASE_MAP_URL}/floors/block_d/floor_3.png" },
            "block_e": { 0: f"{BASE_MAP_URL}/floors/block_e/floor_0.png", 1: f"{BASE_MAP_URL}/floors/block_e/floor_1.png", 2: f"{BASE_MAP_URL}/floors/block_e/floor_2.png", 3: f"{BASE_MAP_URL}/floors/block_e/floor_3.png", 4: f"{BASE_MAP_URL}/floors/block_e/floor_4.png", 5: f"{BASE_MAP_URL}/floors/block_e/floor_5.png" },
            "block_f": { 0: f"{BASE_MAP_URL}/floors/block_f/floor_0.png", 1: f"{BASE_MAP_URL}/floors/block_f/floor_1.png", 2: f"{BASE_MAP_URL}/floors/block_f/floor_2.png", 3: f"{BASE_MAP_URL}/floors/block_f/floor_3.png", 4: f"{BASE_MAP_URL}/floors/block_f/floor_4.png" },
            "data_science_block": { 0: f"{BASE_MAP_URL}/floors/data_science_block/floor_0.png", 1: f"{BASE_MAP_URL}/floors/data_science_block/floor_1.png" },
            "auditorium": { 0: f"{BASE_MAP_URL}/floors/auditorium/floor_0.png", 1: f"{BASE_MAP_URL}/floors/auditorium/floor_1.png", 2: f"{BASE_MAP_URL}/floors/auditorium/floor_2.png", 3: f"{BASE_MAP_URL}/floors/auditorium/floor_3.png", 4: f"{BASE_MAP_URL}/floors/auditorium/floor_4.png" },
            "sc_block": { 0: f"{BASE_MAP_URL}/floors/sc_block/floor_0.png", 1: f"{BASE_MAP_URL}/floors/sc_block/floor_1.png", 2: f"{BASE_MAP_URL}/floors/sc_block/floor_2.png", 3: f"{BASE_MAP_URL}/floors/sc_block/floor_3.png", 4: f"{BASE_MAP_URL}/floors/sc_block/floor_4.png", 5: f"{BASE_MAP_URL}/floors/sc_block/floor_5.png" },
            "library": { 0: f"{BASE_MAP_URL}/floors/library/floor_0.png", 1: f"{BASE_MAP_URL}/floors/library/floor_1.png", 2: f"{BASE_MAP_URL}/floors/library/floor_2.png", 3: f"{BASE_MAP_URL}/floors/library/floor_3.png" },
        },

        # ── NODES (Real-World Accurate) ─────────────────────────────────────────
        "nodes": [
            { "id": "main_entrance", "label": "Main Entrance", "floor": 0, "type": "entrance", "accessible": True, "confidence": 0.97, "verification_status": "VERIFIED", "coords": {"x": 120, "y": 90} },
            { "id": "parking_area", "label": "Two-Wheeler Parking (ITI17)", "floor": 0, "type": "parking", "accessible": True, "confidence": 0.85, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 310, "y": 70} },
            { "id": "football_ground", "label": "Football Ground", "floor": 0, "type": "outdoor_facility", "accessible": True, "confidence": 0.80, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 335, "y": 340} },
            { "id": "cricket_ground", "label": "Cricket Ground", "floor": 0, "type": "outdoor_facility", "accessible": True, "confidence": 0.75, "verification_status": "UNKNOWN", "coords": {"x": 200, "y": 650} },
            { "id": "iter_cafeteria", "label": "ITER Cafeteria", "floor": 0, "type": "facility", "accessible": True, "confidence": 0.82, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 600, "y": 540} },
            { "id": "roundabout", "label": "Central Roundabout", "floor": 0, "type": "junction", "accessible": True, "confidence": 0.85, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 190, "y": 420} },

            { "id": "block_a_entrance", "label": "Block A — Entrance", "floor": 0, "type": "entrance", "accessible": True, "confidence": 0.88, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 220, "y": 195} },
            { "id": "block_a_f1", "label": "Block A — Floor 1", "floor": 1, "type": "room", "accessible": True, "confidence": 0.75, "verification_status": "UNKNOWN", "coords": {"x": 220, "y": 195} },
            { "id": "block_a_f2", "label": "Block A — Floor 2", "floor": 2, "type": "room", "accessible": True, "confidence": 0.70, "verification_status": "UNKNOWN", "coords": {"x": 220, "y": 195} },

            { "id": "block_b_entrance", "label": "Block B — Entrance", "floor": 0, "type": "entrance", "accessible": True, "confidence": 0.82, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 235, "y": 285} },
            { "id": "block_b_f1", "label": "Block B — Floor 1", "floor": 1, "type": "room", "accessible": True, "confidence": 0.72, "verification_status": "UNKNOWN", "coords": {"x": 235, "y": 285} },
            { "id": "block_b_f2", "label": "Block B — Floor 2", "floor": 2, "type": "room", "accessible": True, "confidence": 0.70, "verification_status": "UNKNOWN", "coords": {"x": 235, "y": 285} },

            { "id": "block_c_entrance", "label": "Block C — Entrance", "floor": 0, "type": "entrance", "accessible": True, "confidence": 0.80, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 340, "y": 415} },
            { "id": "block_c_f1", "label": "Block C — Floor 1", "floor": 1, "type": "room", "accessible": True, "confidence": 0.70, "verification_status": "UNKNOWN", "coords": {"x": 340, "y": 415} },
            { "id": "block_c_f2", "label": "Block C — Floor 2", "floor": 2, "type": "room", "accessible": True, "confidence": 0.65, "verification_status": "UNKNOWN", "coords": {"x": 340, "y": 415} },

            { "id": "block_d_entrance", "label": "Block D — Entrance", "floor": 0, "type": "entrance", "accessible": False, "barrier": "no_ramp", "confidence": 0.84, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 190, "y": 490} },
            { "id": "block_d_f1", "label": "Block D — Floor 1", "floor": 1, "type": "room", "accessible": True, "confidence": 0.68, "verification_status": "UNKNOWN", "coords": {"x": 190, "y": 490} },
            { "id": "block_d_f2", "label": "Block D — Floor 2", "floor": 2, "type": "room", "accessible": True, "confidence": 0.65, "verification_status": "UNKNOWN", "coords": {"x": 190, "y": 490} },
            { "id": "block_d_f3", "label": "Block D — Floor 3", "floor": 3, "type": "room", "accessible": True, "confidence": 0.60, "verification_status": "UNKNOWN", "coords": {"x": 190, "y": 490} },

            { "id": "block_e_entrance", "label": "Block E — Main Entrance", "floor": 0, "type": "entrance", "accessible": True, "confidence": 0.79, "verification_status": "AI_DETECTED", "coords": {"x": 350, "y": 575} },
            { "id": "block_e_f1", "label": "Block E — Floor 1", "floor": 1, "type": "room", "accessible": True, "confidence": 0.70, "verification_status": "UNKNOWN", "coords": {"x": 350, "y": 575} },
            { "id": "block_e_f2", "label": "Block E — Floor 2", "floor": 2, "type": "room", "accessible": True, "confidence": 0.68, "verification_status": "UNKNOWN", "coords": {"x": 350, "y": 575} },
            { "id": "block_e_f3", "label": "Block E — Floor 3", "floor": 3, "type": "room", "accessible": True, "confidence": 0.65, "verification_status": "UNKNOWN", "coords": {"x": 350, "y": 575} },
            { "id": "block_e_f4", "label": "Block E — Floor 4", "floor": 4, "type": "room", "accessible": True, "confidence": 0.60, "verification_status": "UNKNOWN", "coords": {"x": 350, "y": 575} },
            { "id": "block_e_f5", "label": "Block E — Floor 5", "floor": 5, "type": "room", "accessible": True, "confidence": 0.55, "verification_status": "UNKNOWN", "coords": {"x": 350, "y": 575} },

            { "id": "block_f_entrance", "label": "Block F — Entrance", "floor": 0, "type": "entrance", "accessible": True, "confidence": 0.83, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 510, "y": 490} },
            { "id": "block_f_f1", "label": "Block F — Floor 1", "floor": 1, "type": "room", "accessible": True, "confidence": 0.72, "verification_status": "UNKNOWN", "coords": {"x": 510, "y": 490} },
            { "id": "block_f_f2", "label": "Block F — Floor 2", "floor": 2, "type": "room", "accessible": True, "confidence": 0.70, "verification_status": "UNKNOWN", "coords": {"x": 510, "y": 490} },
            { "id": "block_f_f3", "label": "Block F — Floor 3", "floor": 3, "type": "room", "accessible": True, "confidence": 0.65, "verification_status": "UNKNOWN", "coords": {"x": 510, "y": 490} },
            { "id": "block_f_f4", "label": "Block F — Floor 4", "floor": 4, "type": "room", "accessible": True, "confidence": 0.60, "verification_status": "UNKNOWN", "coords": {"x": 510, "y": 490} },

            { "id": "ds_block_entrance", "label": "Data Science Block — Entrance", "floor": 0, "type": "entrance", "accessible": True, "confidence": 0.86, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 430, "y": 260} },
            { "id": "ds_block_f1", "label": "Data Science Block — Floor 1", "floor": 1, "type": "room", "accessible": True, "confidence": 0.74, "verification_status": "UNKNOWN", "coords": {"x": 430, "y": 260} },

            { "id": "auditorium_entrance", "label": "Auditorium — Main Entrance", "floor": 0, "type": "facility", "accessible": True, "confidence": 0.91, "verification_status": "VERIFIED", "coords": {"x": 530, "y": 320} },
            { "id": "auditorium_f1", "label": "Auditorium — Floor 1", "floor": 1, "type": "facility", "accessible": True, "confidence": 0.85, "verification_status": "UNKNOWN", "coords": {"x": 530, "y": 320} },
            { "id": "auditorium_f2", "label": "Auditorium — Floor 2", "floor": 2, "type": "facility", "accessible": True, "confidence": 0.80, "verification_status": "UNKNOWN", "coords": {"x": 530, "y": 320} },
            { "id": "auditorium_f3", "label": "Auditorium — Floor 3", "floor": 3, "type": "facility", "accessible": True, "confidence": 0.75, "verification_status": "UNKNOWN", "coords": {"x": 530, "y": 320} },
            { "id": "auditorium_f4", "label": "Auditorium — Floor 4", "floor": 4, "type": "facility", "accessible": True, "confidence": 0.70, "verification_status": "UNKNOWN", "coords": {"x": 530, "y": 320} },

            { "id": "sc_block_entrance", "label": "SC Block — Entrance", "floor": 0, "type": "facility", "accessible": True, "confidence": 0.77, "verification_status": "AI_DETECTED", "coords": {"x": 340, "y": 495} },
            { "id": "sc_block_f1", "label": "SC Block — Floor 1", "floor": 1, "type": "facility", "accessible": True, "confidence": 0.65, "verification_status": "UNKNOWN", "coords": {"x": 340, "y": 495} },
            { "id": "sc_block_f2", "label": "SC Block — Floor 2", "floor": 2, "type": "facility", "accessible": True, "confidence": 0.60, "verification_status": "UNKNOWN", "coords": {"x": 340, "y": 495} },
            { "id": "sc_block_f3", "label": "SC Block — Floor 3", "floor": 3, "type": "facility", "accessible": True, "confidence": 0.55, "verification_status": "UNKNOWN", "coords": {"x": 340, "y": 495} },
            { "id": "sc_block_f4", "label": "SC Block — Floor 4", "floor": 4, "type": "facility", "accessible": True, "confidence": 0.50, "verification_status": "UNKNOWN", "coords": {"x": 340, "y": 495} },
            { "id": "sc_block_f5", "label": "SC Block — Floor 5", "floor": 5, "type": "facility", "accessible": True, "confidence": 0.45, "verification_status": "UNKNOWN", "coords": {"x": 340, "y": 495} },
            
            { "id": "library_entrance", "label": "Central Library — Entrance", "floor": 0, "type": "facility", "accessible": True, "confidence": 0.95, "verification_status": "COMMUNITY_VERIFIED", "coords": {"x": 200, "y": 550} },
            { "id": "library_f1", "label": "Library — Floor 1", "floor": 1, "type": "facility", "accessible": True, "confidence": 0.85, "verification_status": "UNKNOWN", "coords": {"x": 200, "y": 550} },
            { "id": "library_f2", "label": "Library — Floor 2", "floor": 2, "type": "facility", "accessible": True, "confidence": 0.80, "verification_status": "UNKNOWN", "coords": {"x": 200, "y": 550} },
            { "id": "library_f3", "label": "Library — Floor 3", "floor": 3, "type": "facility", "accessible": True, "confidence": 0.75, "verification_status": "UNKNOWN", "coords": {"x": 200, "y": 550} },
        ],

        # ── EDGES (Google Earth Accurate Distances) ──────────────────────────
        "edges": [
            # Ground Pathways (Batch 1)
            {"from": "main_entrance",    "to": "parking_area",      "distance": 1,   "type": "pathway"},
            {"from": "main_entrance",    "to": "block_a_entrance",  "distance": 66,  "type": "pathway"},
            {"from": "block_a_entrance", "to": "block_b_entrance",  "distance": 89,  "type": "pathway"},
            {"from": "block_b_entrance", "to": "block_c_entrance",  "distance": 79,  "type": "pathway"},
            {"from": "block_b_entrance", "to": "roundabout",        "distance": 94,  "type": "pathway"},
            
            # Ground Pathways (Batch 2)
            {"from": "roundabout",       "to": "block_d_entrance",  "distance": 63,  "type": "pathway"},
            {"from": "roundabout",       "to": "library_entrance",  "distance": 54,  "type": "pathway"},
            {"from": "block_d_entrance", "to": "library_entrance",  "distance": 90,  "type": "pathway"},
            {"from": "block_c_entrance", "to": "sc_block_entrance", "distance": 67,  "type": "pathway"},
            {"from": "block_c_entrance", "to": "roundabout",        "distance": 118, "type": "pathway"},
            {"from": "sc_block_entrance","to": "block_e_entrance",  "distance": 113, "type": "pathway"},
            {"from": "sc_block_entrance","to": "block_f_entrance",  "distance": 95,  "type": "pathway"},
            {"from": "block_e_entrance", "to": "block_f_entrance",  "distance": 128, "type": "pathway"},
            
            # Ground Pathways (Batch 3)
            {"from": "block_c_entrance", "to": "auditorium_entrance","distance": 73, "type": "pathway"},
            {"from": "block_c_entrance", "to": "ds_block_entrance", "distance": 77,  "type": "pathway"},
            {"from": "block_a_entrance", "to": "ds_block_entrance", "distance": 145, "type": "pathway"},
            {"from": "auditorium_entrance","to": "iter_cafeteria",  "distance": 240, "type": "pathway"},
            {"from": "block_f_entrance", "to": "iter_cafeteria",    "distance": 89,  "type": "pathway"},
            {"from": "block_b_entrance", "to": "football_ground",   "distance": 26,  "type": "pathway"},
            {"from": "block_e_entrance", "to": "cricket_ground",    "distance": 46,  "type": "pathway"},

            # ── HORIZONTAL BRIDGES ──
            {"from": "block_e_f1", "to": "block_d_f1", "distance": 20, "type": "pathway", "accessible": True},
            {"from": "block_e_f2", "to": "block_d_f2", "distance": 20, "type": "pathway", "accessible": True},

            # ── VERTICAL CONNECTIONS ──
            {"from": "block_a_entrance","to": "block_a_f1", "distance": 15, "type": "stairs"},
            {"from": "block_a_f1",      "to": "block_a_f2", "distance": 15, "type": "stairs"},
            
            {"from": "block_b_entrance","to": "block_b_f1", "distance": 15, "type": "stairs"},
            {"from": "block_b_f1",      "to": "block_b_f2", "distance": 15, "type": "stairs"},

            {"from": "block_c_entrance","to": "block_c_f1", "distance": 15, "type": "stairs"},
            {"from": "block_c_f1",      "to": "block_c_f2", "distance": 15, "type": "stairs"},

            {"from": "block_d_entrance","to": "block_d_f1", "distance": 15, "type": "stairs"},
            {"from": "block_d_f1",      "to": "block_d_f2", "distance": 15, "type": "stairs"},
            {"from": "block_d_f2",      "to": "block_d_f3", "distance": 15, "type": "stairs"},

            {"from": "block_e_entrance","to": "block_e_f1", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "block_e_f1",      "to": "block_e_f2", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "block_e_f2",      "to": "block_e_f3", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "block_e_f3",      "to": "block_e_f4", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "block_e_f4",      "to": "block_e_f5", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "block_e_entrance","to": "block_e_f1", "distance": 15, "type": "stairs"},
            {"from": "block_e_f1",      "to": "block_e_f2", "distance": 15, "type": "stairs"},
            {"from": "block_e_f2",      "to": "block_e_f3", "distance": 15, "type": "stairs"},
            {"from": "block_e_f3",      "to": "block_e_f4", "distance": 15, "type": "stairs"},
            {"from": "block_e_f4",      "to": "block_e_f5", "distance": 15, "type": "stairs"},

            {"from": "block_f_entrance","to": "block_f_f1", "distance": 15, "type": "stairs"},
            {"from": "block_f_f1",      "to": "block_f_f2", "distance": 15, "type": "stairs"},
            {"from": "block_f_f2",      "to": "block_f_f3", "distance": 15, "type": "stairs"},
            {"from": "block_f_f3",      "to": "block_f_f4", "distance": 15, "type": "stairs"},

            {"from": "ds_block_entrance","to": "ds_block_f1","distance": 15, "type": "stairs"},

            {"from": "auditorium_entrance","to": "auditorium_f1", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "auditorium_f1",      "to": "auditorium_f2", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "auditorium_f2",      "to": "auditorium_f3", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "auditorium_f3",      "to": "auditorium_f4", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "auditorium_entrance","to": "auditorium_f1", "distance": 15, "type": "stairs"},
            {"from": "auditorium_f1",      "to": "auditorium_f2", "distance": 15, "type": "stairs"},
            {"from": "auditorium_f2",      "to": "auditorium_f3", "distance": 15, "type": "stairs"},
            {"from": "auditorium_f3",      "to": "auditorium_f4", "distance": 15, "type": "stairs"},

            {"from": "sc_block_entrance","to": "sc_block_f1","distance": 5, "type": "elevator", "accessible": True},
            {"from": "sc_block_f1",      "to": "sc_block_f2","distance": 5, "type": "elevator", "accessible": True},
            {"from": "sc_block_f2",      "to": "sc_block_f3","distance": 5, "type": "elevator", "accessible": True},
            {"from": "sc_block_f3",      "to": "sc_block_f4","distance": 5, "type": "elevator", "accessible": True},
            {"from": "sc_block_f4",      "to": "sc_block_f5","distance": 5, "type": "elevator", "accessible": True},
            {"from": "sc_block_entrance","to": "sc_block_f1","distance": 15, "type": "stairs"},
            {"from": "sc_block_f1",      "to": "sc_block_f2","distance": 15, "type": "stairs"},
            {"from": "sc_block_f2",      "to": "sc_block_f3","distance": 15, "type": "stairs"},
            {"from": "sc_block_f3",      "to": "sc_block_f4","distance": 15, "type": "stairs"},
            {"from": "sc_block_f4",      "to": "sc_block_f5","distance": 15, "type": "stairs"},
            
            {"from": "library_entrance","to": "library_f1", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "library_f1",      "to": "library_f2", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "library_f2",      "to": "library_f3", "distance": 5, "type": "elevator", "accessible": True},
            {"from": "library_entrance","to": "library_f1", "distance": 15, "type": "stairs"},
            {"from": "library_f1",      "to": "library_f2", "distance": 15, "type": "stairs"},
            {"from": "library_f2",      "to": "library_f3", "distance": 15, "type": "stairs"},
        ],

        # ── BARRIERS ──────────────────────────────────────────────────────────
        "barriers": [
            {
                "id": "barrier_block_d_entrance",
                "type": "no_ramp",
                "location": "block_d_entrance",
                "severity": "HIGH",
                "affected_users": ["wheelchair", "mobility_impaired"],
                "confidence": 0.84,
                "verification_status": "COMMUNITY_VERIFIED",
                "reported_at": "2026-08-13",
                "note": "Steps at entrance, no accessible ramp reported",
            },
        ],
    }
}

def get_building(building_id: str):
    return DEMO_BUILDINGS.get(building_id)

def get_all_buildings():
    return [{"id": k, "name": v["name"]} for k, v in DEMO_BUILDINGS.items()]

def get_floor_plan_url(building_id: str, block_id: str, floor: int) -> str:
    data = get_building(building_id)
    if not data:
        return None
    floor_plans = data.get("floor_plans", {})
    block_floors = floor_plans.get(block_id, {})
    return block_floors.get(floor, None)

def get_campus_map_url(building_id: str) -> str:
    data = get_building(building_id)
    if not data:
        return None
    return data.get("campus_map", None)