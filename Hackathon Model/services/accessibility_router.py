import heapq
import re
from typing import List, Dict, Any, Optional
from data.demo_building import get_building

class AccessibilityRouter:
    def __init__(self, building_id: str = "soa_iter_campus"):
        self.building_id = building_id
        self.graph = {}
        self.nodes_data = {}
        self._build_graph()

    def _build_graph(self):
        building = get_building(self.building_id)
        if not building:
            raise ValueError(f"Building {self.building_id} not found.")

        for node in building["nodes"]:
            self.nodes_data[node["id"]] = node
            self.graph[node["id"]] = []

        for edge in building["edges"]:
            u, v = edge["from"], edge["to"]
            dist = edge["distance"]
            edge_type = edge["type"]
            
            if edge_type == "elevator":
                accessible = True
            elif edge_type == "stairs":
                accessible = False
            else:
                accessible = edge.get("accessible", True)

            if u in self.graph:
                self.graph[u].append({"to": v, "distance": dist, "type": edge_type, "accessible": accessible})
            if v in self.graph:
                self.graph[v].append({"to": u, "distance": dist, "type": edge_type, "accessible": accessible})

    def find_route(self, start_id: str, end_id: str, user_profile: str = "wheelchair") -> Dict[str, Any]:
        """
        Dijkstra's Algorithm tailored for Accessibility.
        If user profile is wheelchair, stairs and inaccessible edges are filtered out.
        """
        if start_id not in self.graph or end_id not in self.graph:
            return {"error": "Invalid start or end location."}

        pq = [(0, start_id, [])]
        visited = set()
        
        while pq:
            current_dist, current_node, path = heapq.heappop(pq)
            
            if current_node in visited:
                continue
                
            visited.add(current_node)
            current_path = path + [current_node]
            
            if current_node == end_id:
                return self._format_route(current_path, current_dist)
                
            for neighbor in self.graph[current_node]:
                next_node = neighbor["to"]
                edge_dist = neighbor["distance"]
                edge_type = neighbor["type"]
                is_accessible = neighbor["accessible"]
                
                if user_profile == "wheelchair" and (edge_type == "stairs" or not is_accessible):
                    continue
                    
                if next_node not in visited:
                    heapq.heappush(pq, (current_dist + edge_dist, next_node, current_path))
                    
        return {"error": "No accessible route found between these locations."}

    def _clean_label(self, label: str) -> str:
        """Strip verbose building and floor prefixes for natural human speaking"""
        s = label
        if "(" in s and ")" in s:
            part = s.split("(")[0].strip()
            if len(part) >= 2 and not part.lower().startswith("block"):
                return part
        s = re.sub(r'Block\s+[A-Z]\s+Floor\s+\d+\s*[-—–]\s*', '', s, flags=re.IGNORECASE)
        s = re.sub(r'Block\s+[A-Z]\s*[-—–]\s*', '', s, flags=re.IGNORECASE)
        s = re.sub(r'\s*\((West|East)\)', '', s, flags=re.IGNORECASE)
        return s.strip()

    def _format_route(self, path: List[str], total_distance: int) -> Dict[str, Any]:
        """
        Generates minimal, natural, concise human turn-by-turn guidance and voice speech script.
        """
        if not path or len(path) < 2:
            return {
                "path_nodes": path,
                "total_distance_meters": total_distance,
                "estimated_time_minutes": 1,
                "steps": ["You have arrived at your destination."],
                "voice_guidance": "You are at your destination."
            }

        start_info = self.nodes_data.get(path[0], {})
        end_info = self.nodes_data.get(path[-1], {})
        start_name = self._clean_label(start_info.get("label", path[0]))
        end_name = self._clean_label(end_info.get("label", path[-1]))

        condensed_steps = []
        i = 0
        while i < len(path) - 1:
            curr_id = path[i]
            curr_info = self.nodes_data.get(curr_id, {})
            curr_label = self._clean_label(curr_info.get("label", curr_id))
            curr_floor = curr_info.get("floor", 0)
            curr_bldg = curr_info.get("building_id", "")

            next_id = path[i + 1]
            edge_type = "corridor"
            for e in self.graph.get(curr_id, []):
                if e["to"] == next_id:
                    edge_type = e["type"]
                    break

            # 1. Elevator ride collapse (Floors 5 -> 4 -> 3 -> 2 -> 1 -> 1 line)
            if edge_type == "elevator" or "lift" in curr_id.lower():
                j = i + 1
                while j < len(path):
                    e_type = "corridor"
                    for e in self.graph.get(path[j-1], []):
                        if e["to"] == path[j]:
                            e_type = e["type"]
                            break
                    if e_type == "elevator" or "lift" in path[j].lower():
                        j += 1
                    else:
                        break
                
                dest_lift_node = self.nodes_data.get(path[j-1], {})
                dest_floor = dest_lift_node.get("floor", curr_floor)
                lift_name = "Lift"
                if "lift1" in curr_id.lower() or "lift 1" in curr_label.lower(): lift_name = "Lift 1"
                elif "lift2" in curr_id.lower() or "lift 2" in curr_label.lower(): lift_name = "Lift 2"
                elif "lift3" in curr_id.lower() or "lift 3" in curr_label.lower(): lift_name = "Lift 3"
                elif "lift4" in curr_id.lower() or "lift 4" in curr_label.lower(): lift_name = "Lift 4"

                floor_str = f"Floor {dest_floor}" if dest_floor > 0 else "Ground Floor"
                if dest_floor < curr_floor:
                    condensed_steps.append(f"Take {lift_name} down to {floor_str}.")
                elif dest_floor > curr_floor:
                    condensed_steps.append(f"Take {lift_name} up to {floor_str}.")
                else:
                    condensed_steps.append(f"Take {lift_name} to {floor_str}.")
                i = j - 1
                continue

            # 2. Stairs ride collapse
            if edge_type == "stairs" or "stairs" in curr_id.lower():
                j = i + 1
                while j < len(path):
                    e_type = "corridor"
                    for e in self.graph.get(path[j-1], []):
                        if e["to"] == path[j]:
                            e_type = e["type"]
                            break
                    if e_type == "stairs" or "stairs" in path[j].lower():
                        j += 1
                    else:
                        break
                dest_st_node = self.nodes_data.get(path[j-1], {})
                dest_floor = dest_st_node.get("floor", curr_floor)
                floor_str = f"Floor {dest_floor}" if dest_floor > 0 else "Ground Floor"
                if dest_floor < curr_floor:
                    condensed_steps.append(f"Take the stairs down to {floor_str}.")
                else:
                    condensed_steps.append(f"Take the stairs up to {floor_str}.")
                i = j - 1
                continue

            # 3. Bridge crossing collapse
            if edge_type == "bridge" or "bridge" in curr_id.lower() or "passage" in curr_id.lower():
                target_info = self.nodes_data.get(next_id, {})
                target_bldg = target_info.get("building_id", "")
                bldg_name = target_bldg.replace("block_", "Block ").title()
                if target_bldg and target_bldg != curr_bldg:
                    condensed_steps.append(f"Cross the connecting bridge into {bldg_name}.")
                else:
                    condensed_steps.append(f"Proceed across the connecting bridge.")
                i += 1
                continue

            # 4. Walking / Corridors
            if i == 0:
                condensed_steps.append(f"From {start_name}, head down the hallway towards {self._clean_label(self.nodes_data.get(next_id, {}).get('label', ''))}.")
            elif i == len(path) - 2:
                condensed_steps.append(f"Proceed to {end_name}.")
            else:
                next_label = self._clean_label(self.nodes_data.get(next_id, {}).get('label', ''))
                if any(k in next_id.lower() for k in ["lift", "stairs", "bridge", "entrance", "roundabout"]):
                    condensed_steps.append(f"Head towards {next_label}.")
            i += 1

        if not condensed_steps or end_name not in condensed_steps[-1]:
            condensed_steps.append(f"Arrive at {end_name}.")

        # Deduplicate
        deduped = []
        for s in condensed_steps:
            if not deduped or deduped[-1] != s:
                deduped.append(s)

        # Build natural voice guidance string
        voice_script = f"Go from {start_name}. " + " Then, ".join(deduped) + f" You have arrived at {end_name}."
        
        return {
            "path_nodes": path,
            "total_distance_meters": total_distance,
            "estimated_time_minutes": max(1, round(total_distance / 60, 1)),
            "steps": deduped,
            "voice_guidance": voice_script
        }

# Singleton instance
router_engine = AccessibilityRouter()