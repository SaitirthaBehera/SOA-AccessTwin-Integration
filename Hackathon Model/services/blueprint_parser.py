import os
import json
import base64
from typing import Dict, Any, List, Tuple
from google import genai
from config import settings

class BlueprintAIParser:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_names = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite']
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[BlueprintAIParser] Gemini Client Init Error: {e}")

    def parse_floor_plan(self, image_bytes: bytes, building_id: str, floor_num: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Extracts rooms, stairs, elevators, washrooms, and corridor edges from a floor plan blueprint image.
        """
        building_clean = building_id.lower().replace(" ", "_").replace("-", "_")
        bldg_prefix = building_clean.replace("block_", "")
        
        # Default heuristic nodes in case AI key is unavailable or fails
        fallback_nodes, fallback_edges = self._generate_heuristic_floor(building_clean, bldg_prefix, floor_num)
        
        if not self.client:
            return fallback_nodes, fallback_edges

        prompt = f"""You are an expert Architectural Blueprint and Indoor CAD Graph Extractor.
Analyze this architectural floor plan image for building "{building_id}" on Floor {floor_num}.

Extract all physical locations, rooms, vertical transit points, and connectivity.
Return a STRICT JSON object with this exact schema:
{{
  "nodes": [
    {{
      "sub_id": "r01", 
      "label": "{bldg_prefix.upper()}-{floor_num}01 (Classroom)",
      "type": "room" | "lift" | "stairs" | "restroom" | "entrance" | "bridge" | "corridor",
      "accessible": true or false (true for rooms, lifts, ramps; false for stairs),
      "coords": {{ "x": 10 to 90, "y": 10 to 90 }}
    }}
  ],
  "edges": [
    {{
      "from_sub_id": "r01",
      "to_sub_id": "corridor_main",
      "distance": 8,
      "type": "corridor" | "elevator" | "stairs" | "bridge",
      "accessible": true or false
    }}
  ]
}}

Rules:
1. Identify all visible room numbers, classrooms, labs, offices, rest rooms, stairs, and lifts.
2. Include at least 1 central corridor node (sub_id "corridor_main") connecting the rooms.
3. Coordinates (x, y) must be integer percentages from 0 to 100 on the blueprint image.
4. ONLY return valid JSON without markdown wrapping.
"""
        b64_img = base64.b64encode(image_bytes).decode('utf-8')
        
        for m in self.model_names:
            try:
                response = self.client.models.generate_content(
                    model=m,
                    contents=[
                        {"inline_data": {"mime_type": "image/png", "data": b64_img}},
                        prompt
                    ]
                )
                text = response.text.strip()
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()
                    
                parsed = json.loads(text)
                raw_nodes = parsed.get("nodes", [])
                raw_edges = parsed.get("edges", [])
                
                if len(raw_nodes) >= 3:
                    final_nodes = []
                    final_edges = []
                    
                    # Prefix nodes with building and floor
                    for n in raw_nodes:
                        n_id = f"{bldg_prefix}_f{floor_num}_{n['sub_id']}"
                        final_nodes.append({
                            "id": n_id,
                            "label": n.get("label", n_id),
                            "building_id": building_clean,
                            "floor": floor_num,
                            "type": n.get("type", "room"),
                            "accessible": n.get("accessible", True),
                            "coords": n.get("coords", {"x": 50, "y": 50})
                        })
                        
                    for e in raw_edges:
                        u = f"{bldg_prefix}_f{floor_num}_{e['from_sub_id']}"
                        v = f"{bldg_prefix}_f{floor_num}_{e['to_sub_id']}"
                        final_edges.append({
                            "from": u,
                            "to": v,
                            "distance": e.get("distance", 10),
                            "type": e.get("type", "corridor"),
                            "accessible": e.get("accessible", True)
                        })
                        
                    print(f"[BlueprintAIParser] Successfully extracted {len(final_nodes)} nodes & {len(final_edges)} edges using {m}")
                    return final_nodes, final_edges
            except Exception as e:
                print(f"[BlueprintAIParser] Attempt with model {m} failed: {e}")
                continue

        return fallback_nodes, fallback_edges

    def _generate_heuristic_floor(self, building_clean: str, bldg_prefix: str, floor_num: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        nodes = []
        edges = []
        
        corr_id = f"{bldg_prefix}_f{floor_num}_corridor"
        st1_id = f"{bldg_prefix}_f{floor_num}_stairs1"
        st2_id = f"{bldg_prefix}_f{floor_num}_stairs2"
        
        nodes.append({"id": corr_id, "label": f"{building_clean.upper()} Floor {floor_num} — Main Hallway", "building_id": building_clean, "floor": floor_num, "type": "corridor", "accessible": True, "coords": {"x": 50, "y": 50}})
        nodes.append({"id": st1_id, "label": f"{building_clean.upper()} Floor {floor_num} — Stairs 1", "building_id": building_clean, "floor": floor_num, "type": "stairs", "accessible": False, "coords": {"x": 15, "y": 15}})
        nodes.append({"id": st2_id, "label": f"{building_clean.upper()} Floor {floor_num} — Stairs 2", "building_id": building_clean, "floor": floor_num, "type": "stairs", "accessible": False, "coords": {"x": 85, "y": 15}})
        
        edges.append({"from": st1_id, "to": corr_id, "distance": 8, "type": "corridor", "accessible": True})
        edges.append({"from": st2_id, "to": corr_id, "distance": 8, "type": "corridor", "accessible": True})
        
        # Standard rooms
        for r in range(1, 15):
            r_id = f"{bldg_prefix}_f{floor_num}_r{r:02d}"
            r_code = f"{bldg_prefix.upper()}-{floor_num}{r:02d}"
            nodes.append({"id": r_id, "label": f"{r_code} ({building_clean.upper()} Floor {floor_num})", "building_id": building_clean, "floor": floor_num, "type": "room", "accessible": True, "coords": {"x": 20 + (r * 5) % 60, "y": 30 + (r * 4) % 40}})
            edges.append({"from": r_id, "to": corr_id, "distance": 8, "type": "corridor", "accessible": True})

        if floor_num == 0:
            ent_id = f"{bldg_prefix}_entrance"
            nodes.append({"id": ent_id, "label": f"{building_clean.upper()} Entrance", "building_id": building_clean, "floor": 0, "type": "entrance", "accessible": True, "coords": {"x": 50, "y": 90}})
            edges.append({"from": ent_id, "to": corr_id, "distance": 10, "type": "corridor", "accessible": True})
            edges.append({"from": ent_id, "to": "roundabout", "distance": 85, "type": "pathway", "accessible": True})

        return nodes, edges

blueprint_ai_parser = BlueprintAIParser()
