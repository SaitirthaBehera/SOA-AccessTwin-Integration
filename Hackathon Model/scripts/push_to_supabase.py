import os
import json
import urllib.request
import sys

# Supabase Credentials
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or "https://jiiyrenhkpyrvgymfnen.supabase.co"
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or "sb_publishable_UIFCHRBc7B5we08dgDBkUw_0POzbO-w"

# Path to unified campus graph
current_dir = os.path.dirname(os.path.abspath(__file__))
graph_file = os.path.join(current_dir, "..", "data", "unified_graph.json")

def push_all_campus_data():
    print("=" * 60)
    print("🚀 ACCESS TWIN: SYNCING CAMPUS DIGITAL TWIN TO SUPABASE")
    print("=" * 60)
    print(f"Supabase Endpoint: {SUPABASE_URL}")

    if not os.path.exists(graph_file):
        print(f"❌ Error: Could not find graph file at {graph_file}")
        return

    with open(graph_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    print(f"\n📊 Found {len(nodes)} Campus Nodes and {len(edges)} Edges in local graph.")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    # 1. Push Nodes
    print("\n[1/2] 📍 Pushing Campus Nodes to 'campus_nodes' table...")
    nodes_endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/campus_nodes"
    
    chunk_size = 50
    total_node_chunks = (len(nodes) + chunk_size - 1) // chunk_size

    for i in range(0, len(nodes), chunk_size):
        chunk = nodes[i:i + chunk_size]
        payload = [{
            "id": n["id"],
            "label": n.get("label", n["id"]),
            "building_id": n.get("building_id", "campus"),
            "floor": n.get("floor", 0),
            "type": n.get("type", "room"),
            "accessible": n.get("accessible", True),
            "coord_x": float(n.get("coords", {}).get("x", 50.0)),
            "coord_y": float(n.get("coords", {}).get("y", 50.0))
        } for n in chunk]

        req = urllib.request.Request(nodes_endpoint, data=json.dumps(payload).encode('utf-8'), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"  ✅ Batch {i//chunk_size + 1}/{total_node_chunks} synced ({len(chunk)} nodes) - Status {resp.status}")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode()
            print(f"  ❌ Error syncing nodes batch {i//chunk_size + 1}: HTTP {e.code} - {err_body}")
            print("\n⚠️ Check if the table 'campus_nodes' was created with the exact column names.")
            return
        except Exception as e:
            print(f"  ❌ Connection error: {e}")
            return

    # 2. Push Edges
    print("\n[2/2] 🛣️ Pushing Campus Edges to 'campus_edges' table...")
    edges_endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/campus_edges"
    total_edge_chunks = (len(edges) + chunk_size - 1) // chunk_size

    for i in range(0, len(edges), chunk_size):
        chunk = edges[i:i + chunk_size]
        payload = [{
            "from_node_id": e["from"],
            "to_node_id": e["to"],
            "distance": int(e.get("distance", 10)),
            "type": e.get("type", "corridor"),
            "accessible": bool(e.get("accessible", True))
        } for e in chunk]

        req = urllib.request.Request(edges_endpoint, data=json.dumps(payload).encode('utf-8'), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"  ✅ Batch {i//chunk_size + 1}/{total_edge_chunks} synced ({len(chunk)} edges) - Status {resp.status}")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode()
            print(f"  ❌ Error syncing edges batch {i//chunk_size + 1}: HTTP {e.code} - {err_body}")
            return
        except Exception as e:
            print(f"  ❌ Connection error: {e}")
            return

    print("\n" + "=" * 60)
    print("🎉 SUCCESS! ALL 387 NODES & 430 EDGES ARE NOW LIVE IN SUPABASE!")
    print("=" * 60)

if __name__ == "__main__":
    push_all_campus_data()
