export interface CampusGraphNode {
  id: string;
  name: string;
  category: 'transit' | 'academic' | 'facility' | 'sports';
  description: string;
  coordinates: { x: number; y: number };
  features: string[];
}

export interface CampusGraphEdge {
  from: string;
  to: string;
  distance: number;
  type: string;
  accessible?: boolean;
}

export const CAMPUS_NODES: Record<string, { label: string; coords: { x: number; y: number } }> = {
  main_entrance: { label: 'Main Entrance', coords: { x: 120, y: 90 } },
  parking_area: { label: 'Two-Wheeler Parking (ITI17)', coords: { x: 310, y: 70 } },
  football_ground: { label: 'Football Ground', coords: { x: 335, y: 340 } },
  cricket_ground: { label: 'Cricket Ground', coords: { x: 200, y: 650 } },
  iter_cafeteria: { label: 'ITER Cafeteria', coords: { x: 600, y: 540 } },
  roundabout: { label: 'Central Roundabout', coords: { x: 190, y: 420 } },
  block_a_entrance: { label: 'Block A — Entrance', coords: { x: 220, y: 195 } },
  block_b_entrance: { label: 'Block B — Entrance', coords: { x: 235, y: 285 } },
  block_c_entrance: { label: 'Block C — Entrance', coords: { x: 340, y: 415 } },
  block_d_entrance: { label: 'Block D — Entrance (Stairs Only)', coords: { x: 190, y: 490 } },
  block_e_entrance: { label: 'Block E — Main Entrance', coords: { x: 350, y: 575 } },
  block_f_entrance: { label: 'Block F — Entrance', coords: { x: 510, y: 490 } },
  ds_block_entrance: { label: 'Data Science Block — Entrance', coords: { x: 430, y: 260 } },
  auditorium_entrance: { label: 'Auditorium — Main Entrance', coords: { x: 530, y: 320 } },
  sc_block_entrance: { label: 'SC Block — Entrance', coords: { x: 340, y: 495 } },
  library_entrance: { label: 'Central Library — Entrance', coords: { x: 200, y: 550 } }
};

export const CAMPUS_EDGES: CampusGraphEdge[] = [
  { from: 'main_entrance', to: 'parking_area', distance: 10, type: 'pathway', accessible: true },
  { from: 'main_entrance', to: 'block_a_entrance', distance: 66, type: 'pathway', accessible: true },
  { from: 'block_a_entrance', to: 'block_b_entrance', distance: 89, type: 'pathway', accessible: true },
  { from: 'block_b_entrance', to: 'block_c_entrance', distance: 79, type: 'pathway', accessible: true },
  { from: 'block_b_entrance', to: 'roundabout', distance: 94, type: 'pathway', accessible: true },
  { from: 'roundabout', to: 'block_d_entrance', distance: 63, type: 'pathway', accessible: false }, // stairs/no ramp
  { from: 'roundabout', to: 'library_entrance', distance: 54, type: 'pathway', accessible: true },
  { from: 'block_d_entrance', to: 'library_entrance', distance: 90, type: 'pathway', accessible: false },
  { from: 'block_c_entrance', to: 'sc_block_entrance', distance: 67, type: 'pathway', accessible: true },
  { from: 'block_c_entrance', to: 'roundabout', distance: 118, type: 'pathway', accessible: true },
  { from: 'sc_block_entrance', to: 'block_e_entrance', distance: 113, type: 'pathway', accessible: true },
  { from: 'sc_block_entrance', to: 'block_f_entrance', distance: 95, type: 'pathway', accessible: true },
  { from: 'block_e_entrance', to: 'block_f_entrance', distance: 128, type: 'pathway', accessible: true },
  { from: 'block_c_entrance', to: 'auditorium_entrance', distance: 73, type: 'pathway', accessible: true },
  { from: 'block_c_entrance', to: 'ds_block_entrance', distance: 77, type: 'pathway', accessible: true },
  { from: 'block_a_entrance', to: 'ds_block_entrance', distance: 145, type: 'pathway', accessible: true },
  { from: 'auditorium_entrance', to: 'iter_cafeteria', distance: 240, type: 'pathway', accessible: true },
  { from: 'block_f_entrance', to: 'iter_cafeteria', distance: 89, type: 'pathway', accessible: true },
  { from: 'block_b_entrance', to: 'football_ground', distance: 26, type: 'pathway', accessible: true },
  { from: 'block_e_entrance', to: 'cricket_ground', distance: 46, type: 'pathway', accessible: true }
];

export interface CampusNavigationResult {
  status: 'success';
  start_location: string;
  end_location: string;
  profile_used: string;
  total_distance_meters: number;
  estimated_time_minutes: number;
  path_nodes: string[];
  step_by_step_directions: string[];
  voice_navigation: string;
}

export function computeCampusRoute(
  startId: string,
  endId: string,
  userProfile: 'wheelchair' | 'blind' | 'standard' = 'wheelchair'
): CampusNavigationResult | { error: string } {
  const adj = new Map<string, Array<{ to: string; distance: number; type: string; accessible: boolean }>>();

  // Populate graph
  Object.keys(CAMPUS_NODES).forEach(nodeId => {
    adj.set(nodeId, []);
  });

  CAMPUS_EDGES.forEach(edge => {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    if (!adj.has(edge.to)) adj.set(edge.to, []);

    const isAccessible = edge.accessible ?? (edge.type !== 'stairs');

    adj.get(edge.from)!.push({ to: edge.to, distance: edge.distance, type: edge.type, accessible: isAccessible });
    adj.get(edge.to)!.push({ to: edge.from, distance: edge.distance, type: edge.type, accessible: isAccessible });
  });

  if (!adj.has(startId) || !adj.has(endId)) {
    return { error: `Invalid start ('${startId}') or end ('${endId}') campus location.` };
  }

  // Priority queue / min-dist map for Dijkstra
  const distances = new Map<string, number>();
  const previous = new Map<string, { prevId: string; edgeType: string }>();
  const unvisited = new Set<string>();

  adj.forEach((_, key) => {
    distances.set(key, Infinity);
    unvisited.add(key);
  });
  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let minDist = Infinity;

    unvisited.forEach(nodeId => {
      const d = distances.get(nodeId) ?? Infinity;
      if (d < minDist) {
        minDist = d;
        currentId = nodeId;
      }
    });

    if (!currentId || minDist === Infinity || currentId === endId) {
      break;
    }

    unvisited.delete(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;

      // Wheelchair profile avoids non-accessible edges
      if (userProfile === 'wheelchair' && (!neighbor.accessible || neighbor.type === 'stairs')) {
        continue;
      }

      const alt = minDist + neighbor.distance;
      if (alt < (distances.get(neighbor.to) ?? Infinity)) {
        distances.set(neighbor.to, alt);
        previous.set(neighbor.to, { prevId: currentId, edgeType: neighbor.type });
      }
    }
  }

  if (distances.get(endId) === Infinity) {
    return { error: `No accessible route found between '${startId}' and '${endId}' for ${userProfile} profile.` };
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | undefined = endId;

  while (curr) {
    path.unshift(curr);
    const prev = previous.get(curr);
    curr = prev ? prev.prevId : undefined;
  }

  const totalDistance = distances.get(endId) || 0;
  const estimatedTimeMinutes = Math.max(1, Math.round(totalDistance / 55)); // ~55m per min

  // Turn by turn steps
  const steps: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const currId = path[i];
    const nextId = path[i + 1];
    const currLabel = CAMPUS_NODES[currId]?.label || currId.replace(/_/g, ' ');
    const nextLabel = CAMPUS_NODES[nextId]?.label || nextId.replace(/_/g, ' ');
    
    if (i === 0) {
      steps.push(`Start at ${currLabel} and follow the step-free walkway towards ${nextLabel}.`);
    } else {
      steps.push(`Continue from ${currLabel} to ${nextLabel}.`);
    }
  }

  const startLabel = CAMPUS_NODES[startId]?.label || startId;
  const endLabel = CAMPUS_NODES[endId]?.label || endId;

  return {
    status: 'success',
    start_location: startId,
    end_location: endId,
    profile_used: userProfile,
    total_distance_meters: totalDistance,
    estimated_time_minutes: estimatedTimeMinutes,
    path_nodes: path,
    step_by_step_directions: steps,
    voice_navigation: `Navigating from ${startLabel} to ${endLabel} using ${userProfile} accessible route. Total distance is approximately ${totalDistance} meters.`
  };
}
