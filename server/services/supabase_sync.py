import os
import json
import urllib.request
from typing import List, Dict, Any

class SupabaseSyncService:
    def __init__(self):
        # Default Supabase project URL & Publishable / Service key
        self.supabase_url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL") or "https://jiiyrenhkpyrvgymfnen.supabase.co"
        self.supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY") or "sb_publishable_UIFCHRBc7B5we08dgDBkUw_0POzbO-w"

    def sync_nodes_and_edges(self, new_nodes: List[Dict[str, Any]], new_edges: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Inserts new nodes and edges into Supabase and persists them to unified_graph.json
        """
        # 1. Update local unified_graph.json
        graph_file = os.path.join(os.path.dirname(__file__), "..", "data", "unified_graph.json")
        current_data = {"nodes": [], "edges": []}
        if os.path.exists(graph_file):
            try:
                with open(graph_file, "r", encoding="utf-8") as f:
                    current_data = json.load(f)
            except Exception:
                pass

        existing_node_ids = {n["id"] for n in current_data.get("nodes", [])}
        for n in new_nodes:
            if n["id"] not in existing_node_ids:
                current_data["nodes"].append(n)
                existing_node_ids.add(n["id"])

        for e in new_edges:
            current_data["edges"].append(e)

        try:
            with open(graph_file, "w", encoding="utf-8") as f:
                json.dump(current_data, f, indent=2)
        except Exception as e:
            print(f"[SupabaseSync] Local save warning: {e}")

        # 2. Sync to Supabase REST API (if reachable)
        supabase_synced = False
        supabase_error = None
        try:
            nodes_endpoint = f"{self.supabase_url.rstrip('/')}/rest/v1/campus_nodes"
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            }
            
            payload = []
            for n in new_nodes:
                payload.append({
                    "id": n["id"],
                    "label": n.get("label", n["id"]),
                    "building_id": n.get("building_id", "campus"),
                    "floor": n.get("floor", 0),
                    "type": n.get("type", "room"),
                    "accessible": n.get("accessible", True),
                    "coord_x": n.get("coords", {}).get("x", 50),
                    "coord_y": n.get("coords", {}).get("y", 50)
                })

            req = urllib.request.Request(nodes_endpoint, data=json.dumps(payload).encode('utf-8'), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status in [200, 201, 204]:
                    supabase_synced = True
        except Exception as err:
            supabase_error = str(err)
            print(f"[SupabaseSync] Cloud sync note: {err} (Local Graph Active)")

        return {
            "local_graph_updated": True,
            "supabase_cloud_synced": supabase_synced,
            "nodes_added": len(new_nodes),
            "edges_added": len(new_edges),
            "total_nodes": len(current_data.get("nodes", [])),
            "total_edges": len(current_data.get("edges", [])),
            "note": "Floor map ingested and live in Dijkstra Router!" if supabase_synced else "Floor map active in local graph & ready for Supabase sync."
        }

supabase_sync = SupabaseSyncService()
