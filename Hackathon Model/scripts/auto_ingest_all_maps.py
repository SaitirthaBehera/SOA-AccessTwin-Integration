import os
import sys

# Ensure backend root is on sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services.blueprint_parser import blueprint_ai_parser
from services.supabase_sync import supabase_sync
from services.accessibility_router import router_engine

def auto_ingest_floor_directories():
    base_maps = os.path.join(os.path.dirname(__file__), "..", "static", "maps", "floors")
    if not os.path.exists(base_maps):
        print(f"Directory {base_maps} not found.")
        return

    print("══════════════════════════════════════════════════════════════")
    print("🚀 AUTOMATED AI FLOOR MAP TO SUPABASE INGESTION SCANNER")
    print("══════════════════════════════════════════════════════════════")

    total_blocks_found = 0
    total_floors_processed = 0

    for bldg in os.listdir(base_maps):
        bldg_path = os.path.join(base_maps, bldg)
        if os.path.isdir(bldg_path):
            total_blocks_found += 1
            print(f"\n📂 Scanning Building Block: [{bldg.upper()}]")
            for f in os.listdir(bldg_path):
                if f.startswith("floor_") and (f.endswith(".png") or f.endswith(".jpg")):
                    try:
                        floor_num = int(f.replace("floor_", "").split(".")[0])
                    except ValueError:
                        floor_num = 0

                    img_path = os.path.join(bldg_path, f)
                    with open(img_path, "rb") as img_file:
                        img_bytes = img_file.read()

                    print(f"  🔍 Ingesting Floor {floor_num} ({f}) via AI Vision...")
                    nodes, edges = blueprint_ai_parser.parse_floor_plan(img_bytes, bldg, floor_num)
                    sync_res = supabase_sync.sync_nodes_and_edges(nodes, edges)
                    print(f"  ✅ Extracted {len(nodes)} rooms/nodes & {len(edges)} corridor edges.")
                    total_floors_processed += 1

    router_engine._build_graph()
    print("\n══════════════════════════════════════════════════════════════")
    print(f"🎉 INGESTION COMPLETE: {total_blocks_found} Blocks, {total_floors_processed} Floors Live in Graph & Supabase!")
    print("══════════════════════════════════════════════════════════════")

if __name__ == "__main__":
    auto_ingest_floor_directories()
