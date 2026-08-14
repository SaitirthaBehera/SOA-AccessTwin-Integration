import heapq
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
            
            # FIX: Type ke hisaab se accessibility decide karna
            if edge_type == "elevator":
                accessible = True
            elif edge_type == "stairs":
                accessible = False
            else:
                # Pathways are accessible by default (unless explicitly marked False)
                accessible = edge.get("accessible", True)

            if u in self.graph:
                self.graph[u].append({"to": v, "distance": dist, "type": edge_type, "accessible": accessible})
            if v in self.graph:
                self.graph[v].append({"to": u, "distance": dist, "type": edge_type, "accessible": accessible})

    def find_route(self, start_id: str, end_id: str, user_profile: str = "wheelchair") -> Dict[str, Any]:
        """
        Dijkstra's Algorithm tailored for Accessibility.
        Agar user 'wheelchair' pe hai, toh algorithm stairs wali edges ignore kar dega!
        """
        if start_id not in self.graph or end_id not in self.graph:
            return {"error": "Invalid start or end location."}

        # Priority queue for Dijkstra: (total_distance, current_node_id, path_taken)
        pq = [(0, start_id, [])]
        
        # Visited nodes track karne ke liye (jisse loop mein na phasein)
        visited = set()
        
        while pq:
            current_dist, current_node, path = heapq.heappop(pq)
            
            if current_node in visited:
                continue
                
            visited.add(current_node)
            
            # Pura path update karo
            current_path = path + [current_node]
            
            # Destination mil gaya!
            if current_node == end_id:
                return self._format_route(current_path, current_dist)
                
            # Neighbours check karo
            for neighbor in self.graph[current_node]:
                next_node = neighbor["to"]
                edge_dist = neighbor["distance"]
                edge_type = neighbor["type"]
                is_accessible = neighbor["accessible"]
                
                # 🚫 CORE HACKATHON LOGIC: 
                # Agar user wheelchair par hai aur raasta accessible nahi hai (jaise stairs), toh wahan mat jao!
                if user_profile == "wheelchair" and (edge_type == "stairs" or not is_accessible):
                    continue
                    
                if next_node not in visited:
                    heapq.heappush(pq, (current_dist + edge_dist, next_node, current_path))
                    
        # Agar loop khatam ho gaya aur end_id nahi mila, iska matlab wahan jaane ka koi raasta nahi hai
        return {"error": "No accessible route found between these locations."}

    def _format_route(self, path: List[str], total_distance: int) -> Dict[str, Any]:
        """Raaste ko aasan bhasha (steps) mein convert karta hai"""
        steps = []
        for i in range(len(path) - 1):
            curr_id = path[i]
            next_id = path[i+1]
            
            curr_node = self.nodes_data[curr_id]
            next_node = self.nodes_data[next_id]
            
            # Edge detail dhoondho
            edge_type = "pathway"
            for edge in self.graph[curr_id]:
                if edge["to"] == next_id:
                    edge_type = edge["type"]
                    break
                    
            if edge_type == "elevator":
                instruction = f"Take the elevator from {curr_node['label']} to {next_node['label']}."
            elif edge_type == "stairs":
                instruction = f"Take the stairs from {curr_node['label']} to {next_node['label']}."
            else:
                instruction = f"Proceed from {curr_node['label']} to {next_node['label']}."
                
            steps.append(instruction)
            
        return {
            "path_nodes": path,
            "total_distance_meters": total_distance,
            "estimated_time_minutes": round(total_distance / 60, 1), # Roughly 60m per minute walking
            "steps": steps
        }

# Singleton instance
router_engine = AccessibilityRouter()