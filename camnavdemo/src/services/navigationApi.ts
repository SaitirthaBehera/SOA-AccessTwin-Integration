/**
 * Navigation Backend Service Client
 * Connects to the FastAPI Navigation & AI Vision Backend (port 8000).
 * Configured via VITE_NAVIGATION_API_URL.
 */

export interface CampusLocationDef {
  id: string;
  name: string;
  shortName: string;
  category: 'academic' | 'facility' | 'sports' | 'transit';
  description: string;
  coordinates: { x: number; y: number }; // percentage on 2D digital twin campus map
  features: string[];
}

export const CAMPUS_LOCATIONS: CampusLocationDef[] = [
  {
    id: 'main_entrance',
    name: 'Main Campus Entrance (Gate 1)',
    shortName: 'Main Gate',
    category: 'transit',
    description: 'Primary security checkpoint with tactile paving, level access, and drop-off zone.',
    coordinates: { x: 12, y: 78 },
    features: ['Tactile Ground Indicators', 'Level Ramp Access', 'Security Assistance']
  },
  {
    id: 'block_a_entrance',
    name: 'Block A (Computer Science & Engineering)',
    shortName: 'Block A',
    category: 'academic',
    description: 'Main CS department with step-free ground floor entrance and ramp.',
    coordinates: { x: 28, y: 55 },
    features: ['Accessible Ramp', 'Wide Entryway (1.4m)', 'Braille Department Signage']
  },
  {
    id: 'block_b_entrance',
    name: 'Block B (Electrical & Electronics)',
    shortName: 'Block B',
    category: 'academic',
    description: 'Engineering block equipped with voice-assisted passenger elevator and handrails.',
    coordinates: { x: 42, y: 55 },
    features: ['Passenger Elevator', 'Continuous Handrails', 'Accessible Restrooms']
  },
  {
    id: 'block_c_entrance',
    name: 'Block C (Mechanical & Civil Sciences)',
    shortName: 'Block C',
    category: 'academic',
    description: 'Multi-level labs featuring ramped entryway and tactile floor indicators.',
    coordinates: { x: 58, y: 55 },
    features: ['Ramp Access', 'Tactile Paving', 'Auditory Signal Beacon']
  },
  {
    id: 'block_d_entrance',
    name: 'Block D (Biotechnology & Sciences)',
    shortName: 'Block D',
    category: 'academic',
    description: 'Science complex with central elevator and Braille wall navigation.',
    coordinates: { x: 74, y: 55 },
    features: ['Voice-Prompted Elevator', 'Braille Floor Signs', 'Automatic Doors']
  },
  {
    id: 'block_e_entrance',
    name: 'Block E (Humanities & Management)',
    shortName: 'Block E',
    category: 'academic',
    description: 'Academic block with wide gently sloped ramp and anti-slip flooring.',
    coordinates: { x: 88, y: 55 },
    features: ['Sloped Ramp', 'Anti-Slip Walkway', 'Low Counter Helpdesk']
  },
  {
    id: 'block_f_entrance',
    name: 'Block F (Freshman Academic Complex)',
    shortName: 'Block F',
    category: 'academic',
    description: 'First year classrooms with dual-side handrails and step-free access.',
    coordinates: { x: 72, y: 28 },
    features: ['Dual Handrails', 'Ramped Access', 'Accessible Water Points']
  },
  {
    id: 'ds_block_entrance',
    name: 'Data Science & AI Research Block',
    shortName: 'DS Block',
    category: 'academic',
    description: 'State-of-the-art computation wing with automated accessible sliding doors.',
    coordinates: { x: 30, y: 32 },
    features: ['Automated Sliding Doors', 'High-Contrast Wayfinding', 'Voice Elevator']
  },
  {
    id: 'auditorium_entrance',
    name: 'Campus Main Auditorium & Convention Center',
    shortName: 'Auditorium',
    category: 'facility',
    description: 'Grand hall with dedicated wheelchair seating bays, stage ramp, and listening loop.',
    coordinates: { x: 85, y: 78 },
    features: ['Wheelchair Seating Bays', 'Stage Ramp Access', 'Hearing Induction Loop']
  },
  {
    id: 'sc_block_entrance',
    name: 'Student Activity Center (SC Block)',
    shortName: 'SC Block',
    category: 'facility',
    description: 'Clubs and cultural venue with wide ramped side entrance and accessible washrooms.',
    coordinates: { x: 45, y: 30 },
    features: ['Side Ramp Entrance', 'Accessible Restroom', 'Visual Flashing Alarms']
  },
  {
    id: 'library_entrance',
    name: 'Central Academic Library',
    shortName: 'Central Library',
    category: 'facility',
    description: 'Multi-story library with elevator, tactile guides, Braille catalogue, and motorized ramp.',
    coordinates: { x: 50, y: 75 },
    features: ['Voice-Guided Elevator', 'Tactile Walkway', 'Braille Terminals', 'Motorized Ramp']
  },
  {
    id: 'iter_cafeteria',
    name: 'ITER Main Food Court & Cafeteria',
    shortName: 'Cafeteria',
    category: 'facility',
    description: 'Campus cafeteria with step-free double doors, lower ordering counters, and spacious aisles.',
    coordinates: { x: 18, y: 35 },
    features: ['Low Ordering Counter', 'Wide 2.0m Aisles', 'Reserved Mobility Seating']
  },
  {
    id: 'football_ground',
    name: 'Campus Football Sports Complex',
    shortName: 'Football Ground',
    category: 'sports',
    description: 'Open athletics stadium with perimeter paved path and accessible spectator platform.',
    coordinates: { x: 15, y: 15 },
    features: ['Paved Perimeter Path', 'Elevated Spectator Deck', 'Level Gate Access']
  },
  {
    id: 'cricket_ground',
    name: 'Campus Cricket Stadium',
    shortName: 'Cricket Ground',
    category: 'sports',
    description: 'Sports field with paved viewing perimeter and ramped pavilion access.',
    coordinates: { x: 55, y: 15 },
    features: ['Pavilion Ramp', 'Level Access Gate', 'Dedicated Parking Bay']
  },
  {
    id: 'parking_area',
    name: 'North/South Accessible Parking Area',
    shortName: 'Parking Area',
    category: 'transit',
    description: 'Reserved accessibility vehicle parking stalls with direct ramp connections to pathways.',
    coordinates: { x: 30, y: 88 },
    features: ['Extra-Wide 3.6m Stalls', 'Drop-Off Curb Cut', 'Direct Ramp Connection']
  },
  {
    id: 'roundabout',
    name: 'Central Campus Green Roundabout',
    shortName: 'Roundabout',
    category: 'transit',
    description: 'Central campus pedestrian nexus with 360-degree tactile paving and audio beacons.',
    coordinates: { x: 50, y: 50 },
    features: ['360° Tactile Paving', 'Directional Audio Beacons', 'Solar Pathway Lighting']
  }
];

export interface NavigationRouteResponse {
  status: 'success' | 'error';
  start_location: string;
  end_location: string;
  profile_used: string;
  total_distance_meters: number;
  estimated_time_minutes: number;
  path_nodes: string[];
  step_by_step_directions: string[];
  voice_navigation: string;
  error?: string;
}

export interface DetectedObjectItem {
  id?: string;
  class?: string;
  label?: string;
  type?: string;
  confidence?: number;
  bbox?: number[]; // [ymin, xmin, ymax, xmax] or [x1, y1, x2, y2]
  position?: string;
  status?: string;
  recommendation?: string;
  [key: string]: any;
}

export interface VisionDetectionResponse {
  status: string;
  message: string;
  is_mock: boolean;
  results: DetectedObjectItem[];
  verification_status: string;
  voice_message: string;
}

export interface ReportAnalysisResponse {
  status: string;
  message: string;
  data: {
    id: string;
    block: string;
    source: string;
    reporter: string;
    user_complaint: string;
    ai_verified: boolean;
    verification_status: string;
    confidence: number;
    type: string;
    issue: string;
    recommendation: string;
    cost: string;
    estimated_cost_inr: string;
    priority: string;
    impact_score: number;
    voice_message: string;
  };
}

export interface BackendHealthStatus {
  isOnline: boolean;
  url: string;
  latencyMs?: number;
  error?: string;
}

/**
 * Validates that a string is a valid absolute HTTP or HTTPS URL
 */
function isValidAbsoluteHttpUrl(urlString: any): boolean {
  if (typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get base URL for the FastAPI Navigation backend from environment.
 * In HTTPS browser environments (e.g. Cloud Run preview), securely routes through the unified origin
 * to avoid browser mixed-content / unreachable localhost port 8000 NetworkErrors.
 */
export function getNavigationApiUrl(): string {
  const envBackendUrl = (import.meta as any).env?.VITE_NAVIGATION_BACKEND_URL;
  const envApiUrl = (import.meta as any).env?.VITE_NAVIGATION_API_URL;

  if (isValidAbsoluteHttpUrl(envBackendUrl)) {
    return envBackendUrl.trim().replace(/\/+$/, '');
  }
  if (isValidAbsoluteHttpUrl(envApiUrl)) {
    return envApiUrl.trim().replace(/\/+$/, '');
  }

  // If in browser on HTTPS (like AI Studio preview), default to current origin
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.protocol === 'https:') {
      return window.location.origin;
    }
  }

  return 'http://localhost:8000';
}

/**
 * Helper to convert Base64 data URL to Blob
 */
export function dataURItoBlob(dataURI: string): Blob {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

export const navigationApi = {
  /**
   * Check connection status of the Navigation backend with fallback
   */
  async checkHealth(): Promise<BackendHealthStatus> {
    const baseUrl = getNavigationApiUrl();
    const startTime = performance.now();
    
    // Attempt primary URL
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${baseUrl}/health`, {
        signal: controller.signal,
        method: 'GET'
      });
      clearTimeout(timeoutId);

      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        return { isOnline: true, url: baseUrl, latencyMs };
      }
    } catch {
      // Primary direct URL not reachable, try Express API proxy fallback
    }

    // Fallback to Express backend health
    try {
      const proxyRes = await fetch('/api/fastapi/health');
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        const latencyMs = Math.round(performance.now() - startTime);
        return {
          isOnline: true,
          url: data.url || 'Integrated Campus Navigation Service',
          latencyMs
        };
      }
    } catch (err: any) {
      return {
        isOnline: false,
        url: baseUrl,
        error: err.name === 'AbortError' ? 'Connection timed out' : (err.message || 'Cannot connect to Navigation Backend')
      };
    }

    return { isOnline: false, url: baseUrl, error: 'Navigation service unavailable' };
  },

  /**
   * Request accessible route calculation from FastAPI / Integrated backend
   * GET /api/navigate?start=...&end=...&profile=...
   */
  async findAccessibleRoute(
    startNodeId: string,
    targetNodeId: string,
    profile: 'wheelchair' | 'blind' | 'standard'
  ): Promise<NavigationRouteResponse> {
    const baseUrl = getNavigationApiUrl();
    
    const executeFetch = async (targetBase: string): Promise<NavigationRouteResponse> => {
      const isRelative = !targetBase.startsWith('http://') && !targetBase.startsWith('https://');
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const baseToUse = isRelative ? origin : targetBase;

      const url = new URL(`${baseToUse}/api/navigate`);
      url.searchParams.append('start', startNodeId);
      url.searchParams.append('end', targetNodeId);
      url.searchParams.append('profile', profile);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        let errorMsg = `Navigation request failed with status ${res.status}`;
        try {
          const errorJson = await res.json();
          if (errorJson?.detail || errorJson?.error) {
            errorMsg = errorJson.detail || errorJson.error;
          }
        } catch {}
        throw new Error(errorMsg);
      }

      return await res.json();
    };

    try {
      return await executeFetch(baseUrl);
    } catch (err: any) {
      // If primary fetch threw NetworkError or Failed to fetch (e.g. Mixed Content or port 8000 blocked), fall back to current origin
      if (typeof window !== 'undefined' && baseUrl !== window.location.origin) {
        try {
          return await executeFetch(window.location.origin);
        } catch (fallbackErr: any) {
          throw new Error(fallbackErr?.message || err?.message || 'Navigation Calculation failed');
        }
      }
      throw err;
    }
  },

  /**
   * AI Accessibility Barrier & Feature Detection
   * POST /api/detect (multipart/form-data with file)
   */
  async detectAccessibility(imageInput: File | Blob | string): Promise<VisionDetectionResponse> {
    const baseUrl = getNavigationApiUrl();
    const formData = new FormData();

    if (typeof imageInput === 'string') {
      if (imageInput.startsWith('data:image')) {
        const blob = dataURItoBlob(imageInput);
        formData.append('file', blob, 'capture.jpg');
      } else {
        throw new Error('Invalid image data string provided');
      }
    } else if (imageInput instanceof File) {
      formData.append('file', imageInput, imageInput.name);
    } else if (imageInput instanceof Blob) {
      formData.append('file', imageInput, 'upload.jpg');
    }

    try {
      const res = await fetch(`${baseUrl}/api/detect`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // If failed, fall back to current origin
    }

    if (typeof window !== 'undefined' && baseUrl !== window.location.origin) {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: typeof imageInput === 'string' ? imageInput : undefined
        })
      });
      if (res.ok) {
        return await res.json();
      }
    }

    throw new Error('AI detection service is currently unavailable.');
  },

  /**
   * AI Pre-Analysis for Accessibility Reports (Classification & Fix Cost in ₹)
   * POST /api/reports/analyze
   */
  async analyzeReportIssue(
    imageInput: File | Blob | string,
    userQuery: string,
    buildingName: string = 'Block A',
    reporterName: string = 'Campus Reporter'
  ): Promise<ReportAnalysisResponse> {
    const baseUrl = getNavigationApiUrl();
    const formData = new FormData();

    if (typeof imageInput === 'string') {
      if (imageInput.startsWith('data:image')) {
        const blob = dataURItoBlob(imageInput);
        formData.append('file', blob, 'report.jpg');
      } else {
        throw new Error('Invalid image data format');
      }
    } else if (imageInput instanceof File) {
      formData.append('file', imageInput, imageInput.name);
    } else if (imageInput instanceof Blob) {
      formData.append('file', imageInput, 'report.jpg');
    }

    formData.append('user_query', userQuery);
    formData.append('building_name', buildingName);
    formData.append('reporter_name', reporterName);

    const res = await fetch(`${baseUrl}/api/reports/analyze`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      let errorMsg = `Report AI analysis failed with status ${res.status}`;
      try {
        const err = await res.json();
        if (err?.message || err?.detail) errorMsg = err.message || err.detail;
      } catch {}
      throw new Error(errorMsg);
    }

    const result: ReportAnalysisResponse = await res.json();
    return result;
  },

  /**
   * Fetch structured recommendations from FastAPI backend
   * GET /api/recommendations
   */
  async getBackendRecommendations(): Promise<any> {
    const baseUrl = getNavigationApiUrl();
    const res = await fetch(`${baseUrl}/api/recommendations`);
    if (!res.ok) {
      throw new Error(`Failed to fetch recommendations: ${res.status}`);
    }
    return await res.json();
  }
};
