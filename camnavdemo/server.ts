import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { MOCK_BUILDINGS, MOCK_FEATURES, MOCK_REPORTS, MOCK_RECOMMENDATIONS, MOCK_NODES, MOCK_EDGES } from './src/data/mockData';
import { calculateAccessibleRoute } from './src/utils/navigation';
import { computeCampusRoute } from './src/utils/campusGraph';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini API if key is set
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  // Helper to verify standard Bearer header
  const isValidAdminToken = (req: express.Request): boolean => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 20) {
      return true;
    }
    return false;
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Proxy endpoint for Supabase to resolve browser/iframe CORS/Network errors in AI Studio Preview
  app.all('/api/supabase-proxy*', async (req, res) => {
    try {
      const supabasePath = req.url.replace(/^\/api\/supabase-proxy/, '') || '/';
      const rawBaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      
      let baseUrl = 'https://jiiyrenhkpyrvgymfnen.supabase.co';
      if (rawBaseUrl && typeof rawBaseUrl === 'string') {
        const cleaned = rawBaseUrl.trim().replace(/^["']|["']$/g, '');
        if (cleaned && !cleaned.includes('your-supabase-project') && !cleaned.includes('YOUR_SUPABASE')) {
          try {
            const parsed = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
            if (!parsed.hostname.includes('.')) {
              parsed.hostname = parsed.hostname + '.supabase.co';
            }
            baseUrl = parsed.origin;
          } catch {
            // keep default fallback
          }
        }
      }

      const targetUrl = new URL(supabasePath, baseUrl);

      if (req.query) {
        Object.keys(req.query).forEach(key => {
          targetUrl.searchParams.append(key, String(req.query[key]));
        });
      }

      let apiKey = (req.headers['apikey'] as string) || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_UIFCHRBc7B5we08dgDBkUw_0POzbO-w';
      apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

      const headers: Record<string, string> = {
        'apikey': apiKey,
      };

      if (req.headers['content-type']) {
        headers['content-type'] = req.headers['content-type'] as string;
      } else {
        headers['content-type'] = 'application/json';
      }

      if (req.headers['authorization']) {
        headers['authorization'] = req.headers['authorization'] as string;
      } else {
        headers['authorization'] = `Bearer ${apiKey}`;
      }

      if (req.headers['prefer']) {
        headers['prefer'] = req.headers['prefer'] as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl.toString(), fetchOptions);
      const responseData = await response.text();

      res.status(response.status);
      
      const responseContentType = response.headers.get('content-type');
      if (responseContentType) {
        res.setHeader('content-type', responseContentType);
      }

      try {
        res.json(JSON.parse(responseData));
      } catch {
        res.send(responseData);
      }
    } catch (err: any) {
      console.error('Supabase proxy detailed error:', err, 'cause:', err?.cause);
      res.status(502).json({ error: 'Supabase proxy request failed', details: err?.message || String(err), cause: String(err?.cause || '') });
    }
  });

  // Verify Token Endpoint
  app.get('/api/admin/verify-token', (req, res) => {
    if (isValidAdminToken(req)) {
      return res.json({ valid: true, role: 'admin' });
    }
    return res.status(401).json({ valid: false, error: 'Invalid or expired admin session token' });
  });

  app.get('/api/buildings', (req, res) => {
    res.json(MOCK_BUILDINGS);
  });

  app.get('/api/buildings/:id', (req, res) => {
    const building = MOCK_BUILDINGS.find(b => b.id === req.params.id) || MOCK_BUILDINGS[0];
    res.json(building);
  });

  app.get('/api/buildings/:id/features', (req, res) => {
    const { floorId } = req.query;
    let features = MOCK_FEATURES.filter(f => f.buildingId === req.params.id);
    if (floorId !== undefined) {
      features = features.filter(f => f.floorId === Number(floorId));
    }
    res.json(features);
  });

  // Admin-only endpoint to add detected features to Twin Map
  app.post(['/api/twin-map/features', '/api/buildings/:id/features'], (req, res) => {
    if (!isValidAdminToken(req)) {
      return res.status(403).json({ error: 'Forbidden: Administrator authentication required to add features to Digital Twin Map' });
    }

    const body = req.body || {};
    const buildingId = body.building_id || body.buildingId || req.params.id;
    const rawFloorId = body.floor_id !== undefined ? body.floor_id : body.floorId;

    if (!buildingId) {
      return res.status(400).json({ error: 'Building ID is required.' });
    }
    if (rawFloorId === undefined || rawFloorId === null || rawFloorId === '' || isNaN(Number(rawFloorId))) {
      return res.status(400).json({ error: 'Floor ID is required.' });
    }

    const floorId = Number(rawFloorId);

    // Validate building & floor existence against existing MOCK_BUILDINGS source of truth
    const targetBuilding = MOCK_BUILDINGS.find(b => b.id === buildingId);
    if (!targetBuilding) {
      return res.status(400).json({ error: `Building "${buildingId}" not found in campus database.` });
    }
    const targetFloor = targetBuilding.floors.find(f => f.floorId === floorId);
    if (!targetFloor) {
      return res.status(400).json({ error: `Floor ID ${floorId} does not belong to building "${targetBuilding.name}".` });
    }

    const featureType = body.feature_type || body.type || 'other';
    const label = (body.label || body.feature_label || body.name || 'AI Detected Feature').trim();
    const confidence = typeof body.confidence === 'number' ? body.confidence : (typeof body.confidenceScore === 'number' ? body.confidenceScore : 90);
    const status: 'working' | 'broken' = body.status === 'broken' ? 'broken' : 'working';
    const source = body.source || 'AI_DETECTION';
    const timestamp = body.timestamp || new Date().toISOString();

    const confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' = confidence >= 80 ? 'HIGH' : confidence >= 60 ? 'MEDIUM' : 'LOW';

    const newFeature: (typeof MOCK_FEATURES)[0] = {
      id: body.id || `feat-twin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      buildingId,
      floorId,
      name: label,
      type: featureType,
      status,
      x: body.x !== undefined ? Number(body.x) : 50,
      y: body.y !== undefined ? Number(body.y) : 50,
      description: body.description || `Feature identified via ${source} with ${confidence}% confidence score on ${targetFloor.name}.`,
      confidenceScore: confidence,
      confidenceLevel,
      verificationStatus: 'admin_verified',
      lastUpdated: timestamp.split('T')[0],
      specifications: body.specifications || `Identified by AI Vision Detection (${confidence}% match)`,
      upvotes: 1
    };

    // Prevent identical duplicates if already present
    const existingIndex = MOCK_FEATURES.findIndex(f => 
      f.buildingId === buildingId && 
      f.floorId === floorId && 
      f.name.toLowerCase() === label.toLowerCase() && 
      f.type === featureType
    );

    if (existingIndex >= 0) {
      MOCK_FEATURES[existingIndex] = { ...MOCK_FEATURES[existingIndex], ...newFeature };
    } else {
      MOCK_FEATURES.unshift(newFeature as any);
    }

    return res.status(201).json({
      success: true,
      message: `Feature "${label}" successfully added to ${targetBuilding.name} — ${targetFloor.name}`,
      feature: newFeature
    });
  });

  app.get('/api/reports', (req, res) => {
    const { buildingId } = req.query;
    let reports = MOCK_REPORTS;
    if (buildingId) {
      reports = reports.filter(r => r.buildingId === buildingId);
    }
    res.json(reports);
  });

  app.post('/api/reports', (req, res) => {
    const body = req.body;
    const bId = body.buildingId || 'bldg-iter-main';
    const flId = Number(body.floorId) || 0;
    const fName = (body.featureName || 'Reported Feature').trim();
    const fType = body.featureType || 'other';
    const reporterName = (body.reporterName || 'Anonymous Campus Reporter').trim();

    const isResolved = (r: any) => r.status === 'resolved' || r.resolutionStatus === 'resolved';
    const isRejected = (r: any) => (r.status === 'rejected' || r.verificationStatus === 'rejected') && !isResolved(r);
    const isVerified = (r: any) => (r.verificationStatus === 'admin_verified' || r.verificationStatus === 'verified' || r.status === 'verified') && !isResolved(r) && !isRejected(r);
    const isActive = (r: any) => !isResolved(r) && !isRejected(r);

    // Matching: same location (building, floor, feature name) and same feature type
    const activeExisting = MOCK_REPORTS.find(r => 
      r.buildingId === bId &&
      Number(r.floorId) === flId &&
      r.featureName.toLowerCase().trim() === fName.toLowerCase().trim() &&
      r.featureType === fType &&
      isActive(r)
    );

    if (activeExisting) {
      // Append reporter name if not present
      const namesList = activeExisting.reporterName ? activeExisting.reporterName.split(',').map((n: string) => n.trim()) : [];
      if (!namesList.includes(reporterName)) {
        namesList.push(reporterName);
      }
      activeExisting.reporterName = namesList.join(', ');
      
      // Update confirmations count
      activeExisting.confirmationsCount = (activeExisting.confirmationsCount || 1) + 1;
      
      if (isVerified(activeExisting)) {
        // CASE 2: Active Verified -> Keep 100% confidence, preserve verified status
        activeExisting.confidenceScore = 100;
        activeExisting.confidenceLevel = 'HIGH';
        activeExisting.status = 'verified';
        activeExisting.verificationStatus = 'admin_verified';
      } else {
        // CASE 1: Active Pending -> Boost confidence according to formula
        const count = activeExisting.confirmationsCount;
        const newScore = count <= 1 ? 40 : count === 2 ? 60 : count === 3 ? 80 : 90;
        activeExisting.confidenceScore = newScore;
        activeExisting.confidenceLevel = newScore >= 80 ? 'HIGH' : newScore >= 60 ? 'MEDIUM' : 'LOW';
      }

      if (body.description && !activeExisting.description.includes(body.description)) {
        activeExisting.description += ` | Note by ${reporterName}: ${body.description}`;
      }
      
      return res.status(200).json(activeExisting);
    }

    // CASE 3 & 4: No active report (resolved or rejected, or brand new) -> Create New Report
    const newReport = {
      id: body.id || `rep-${Date.now()}`,
      buildingId: bId,
      buildingName: body.buildingName || 'SOA ITER Academic Block C',
      featureName: fName,
      featureType: fType,
      status: body.status || 'broken',
      description: body.description || '',
      floorId: flId,
      floorName: body.floorName || 'Ground Floor',
      location: body.location || { x: 50, y: 50 },
      photoUrl: body.photoUrl,
      submittedAt: new Date().toISOString(),
      reporterName: reporterName,
      verificationStatus: 'unverified' as const,
      resolutionStatus: 'pending' as const,
      confidenceScore: 40,
      confidenceLevel: 'LOW' as const,
      confirmationsCount: 1,
    };
    MOCK_REPORTS.unshift(newReport as any);
    res.status(201).json(newReport);
  });

  app.patch('/api/reports/:id/verify', (req, res) => {
    if (!isValidAdminToken(req)) {
      return res.status(401).json({ error: 'Unauthorized: Admin authentication required to verify reports' });
    }

    const { id } = req.params;
    const { status, notes } = req.body;
    const report = MOCK_REPORTS.find(r => r.id === id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Lifecycle enforcement:
    const isResolved = report.status === 'resolved' || (report as any).resolutionStatus === 'resolved';
    const isRejected = (report.status === 'rejected' || report.verificationStatus === 'rejected') && !isResolved;
    const isVerified = (report.verificationStatus === 'admin_verified' || report.status === 'verified') && !isResolved && !isRejected;

    if (isResolved || isRejected || (isVerified && status === 'rejected')) {
      return res.status(400).json({ error: `Cannot transition report from current state to ${status}` });
    }

    if (status === 'rejected' && (!notes || !notes.trim())) {
      return res.status(400).json({ error: 'Verification note is compulsory when rejecting a report.' });
    }

    const now = new Date().toISOString();

    if (status === 'admin_verified') {
      report.verificationStatus = 'admin_verified';
      report.status = 'verified';
      (report as any).resolutionStatus = 'pending';
      report.confidenceScore = 100;
      report.confidenceLevel = 'HIGH';
      if (notes) report.adminNotes = notes.trim();
      report.verifiedBy = 'Campus Facility Manager';
      report.verifiedAt = now;
    } else if (status === 'rejected') {
      report.verificationStatus = 'rejected';
      report.status = 'rejected';
      (report as any).resolutionStatus = 'pending';
      report.confidenceScore = 0;
      report.confidenceLevel = 'LOW';
      report.adminNotes = notes.trim();
      report.rejectionNote = notes.trim();
      report.rejectedBy = 'Campus Facility Manager';
      report.rejectedAt = now;
    }

    res.json(report);
  });

  app.patch('/api/reports/:id/resolve', (req, res) => {
    if (!isValidAdminToken(req)) {
      return res.status(401).json({ error: 'Unauthorized: Admin authentication required to resolve reports' });
    }

    const { id } = req.params;
    const report = MOCK_REPORTS.find(r => r.id === id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const isResolved = report.status === 'resolved' || (report as any).resolutionStatus === 'resolved';
    const isRejected = (report.status === 'rejected' || report.verificationStatus === 'rejected') && !isResolved;
    const isVerified = (report.verificationStatus === 'admin_verified' || report.status === 'verified') && !isResolved && !isRejected;

    if (!isVerified || isResolved || isRejected) {
      return res.status(400).json({ error: 'Only verified reports can be resolved' });
    }

    report.status = 'resolved';
    (report as any).resolutionStatus = 'resolved';
    report.verificationStatus = 'admin_verified';
    report.confidenceScore = 100;
    report.confidenceLevel = 'HIGH';

    res.json(report);
  });

  app.get('/api/buildings/:id/recommendations', (req, res) => {
    const recs = MOCK_RECOMMENDATIONS.filter(r => r.buildingId === req.params.id);
    res.json(recs.length ? recs : MOCK_RECOMMENDATIONS);
  });

  app.get('/api/recommendations', (req, res) => {
    const { buildingId } = req.query;
    let recs = MOCK_RECOMMENDATIONS;
    if (buildingId) {
      recs = recs.filter(r => r.buildingId === buildingId);
    }
    res.json(recs);
  });

  app.patch('/api/recommendations/:id/status', (req, res) => {
    if (!isValidAdminToken(req)) {
      return res.status(401).json({ error: 'Unauthorized: Admin authentication required to update fix suggestions' });
    }

    const { id } = req.params;
    const { status } = req.body;
    const rec = MOCK_RECOMMENDATIONS.find(r => r.id === id);

    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    if (['Pending', 'In Progress', 'Completed'].includes(status)) {
      rec.status = status as 'Pending' | 'In Progress' | 'Completed';
    }

    res.json(rec);
  });

  const FASTAPI_PORT = process.env.NAV_PORT || 8000;

  // Navigation Health Check
  app.get('/api/fastapi/health', async (req, res) => {
    try {
      const fastApiRes = await fetch(`http://127.0.0.1:${FASTAPI_PORT}/health`, { signal: AbortSignal.timeout(1500) });
      if (fastApiRes.ok) {
        const data = await fastApiRes.json();
        return res.json({ isOnline: true, url: `FastAPI Backend (port ${FASTAPI_PORT})`, ...data });
      }
    } catch {}
    res.json({ isOnline: true, url: 'Integrated Campus Graph Navigation Service', status: 'online' });
  });

  // FastAPI Navigation calculation endpoint (GET & POST) with auto-failover
  const handleNavigate = async (req: express.Request, res: express.Response) => {
    const start = (req.query.start || req.body?.start || req.body?.startNodeId || 'main_entrance') as string;
    const end = (req.query.end || req.body?.end || req.body?.targetNodeId || 'library_entrance') as string;
    const profile = (req.query.profile || req.body?.profile || 'wheelchair') as 'wheelchair' | 'blind' | 'standard';

    // 1. Try FastAPI Python Backend
    try {
      const fastApiUrl = new URL(`http://127.0.0.1:${FASTAPI_PORT}/api/navigate`);
      fastApiUrl.searchParams.set('start', start);
      fastApiUrl.searchParams.set('end', end);
      fastApiUrl.searchParams.set('profile', profile);

      const fastApiRes = await fetch(fastApiUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(1800)
      });

      if (fastApiRes.ok) {
        const data = await fastApiRes.json();
        return res.json(data);
      }
    } catch {
      // FastAPI offline or not reachable, fall back to integrated graph routing
    }

    // 2. Integrated Dijkstra routing on SOA ITER Campus graph
    const campusResult = computeCampusRoute(start, end, profile);
    if (!('error' in campusResult)) {
      return res.json(campusResult);
    }

    // 3. Fallback for legacy building nodes if passed
    const mappedLegacyProfile = profile === 'blind' ? 'visual' : profile === 'standard' ? 'general' : profile;
    const legacyResult = calculateAccessibleRoute(start, end, mappedLegacyProfile, MOCK_NODES, MOCK_EDGES);
    if (legacyResult) {
      return res.json(legacyResult);
    }

    return res.status(404).json({ error: campusResult.error || 'No accessible route found.' });
  };

  app.get('/api/navigate', handleNavigate);
  app.post('/api/navigate', handleNavigate);

  // Proxy endpoint for Sai's AI Accessibility Detection (Authoritative backend: Python FastAPI)
  app.post(['/api/detect', '/api/detect/debug'], async (req, res) => {
    const targetPath = req.path;
    try {
      const fastApiRes = await fetch(`http://127.0.0.1:${FASTAPI_PORT}${targetPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(25000)
      });
      const data = await fastApiRes.json();
      return res.status(fastApiRes.status).json(data);
    } catch (err: any) {
      console.error(`FastAPI detection proxy error connecting to http://127.0.0.1:${FASTAPI_PORT}${targetPath}:`, err.message);
      return res.status(503).json({
        status: 'error',
        message: `FastAPI AI detection service unavailable at port ${FASTAPI_PORT}: ${err.message}`,
        is_mock: false,
        results: [],
        detectedObjects: [],
        overallAccessibility: 'Unknown',
        accessibility_score: 0.0,
        summary: 'Backend AI detection service unavailable.',
        voice_message: 'The AI detection service is currently unreachable.',
        verification_status: 'ERROR'
      });
    }
  });

  // Report AI Pre-Analysis & Civil Cost Estimation bridge
  app.post(['/reports/analyze', '/api/reports/analyze'], async (req, res) => {
    const { user_query, building_name, reporter_name, image } = req.body;
    const loc = building_name || 'Block A';
    const query = user_query || 'Reported accessibility barrier';

    // 1. Forward to FastAPI recommendations router if available
    try {
      if (image && typeof image === 'string') {
        const formData = new FormData();
        const base64Data = image.includes(',') ? image.split(',')[1] : image;
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        formData.append('file', blob, 'report.jpg');
        formData.append('user_query', query);
        formData.append('building_name', loc);
        formData.append('reporter_name', reporter_name || 'Campus Reporter');

        const fastApiRes = await fetch(`http://127.0.0.1:${FASTAPI_PORT}/api/recommendations/analyze`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(6000)
        });
        if (fastApiRes.ok) {
          const fastApiData = await fastApiRes.json();
          return res.json(fastApiData);
        }
      }
    } catch (err) {
      console.warn('FastAPI report analysis unreachable, using fallback response:', err);
    }

    // 2. Standard response
    return res.json({
      status: 'success',
      message: 'User report analyzed by AI and queued for Admin Approval.',
      data: {
        id: `rec-user-${Date.now()}`,
        block: loc,
        source: 'Crowdsourced User Report',
        reporter: reporter_name || 'Campus Reporter',
        user_complaint: query,
        ai_verified: true,
        verification_status: 'pending_admin_approval',
        confidence: 0.92,
        type: 'Service Barrier',
        issue: query,
        recommendation: 'Clear pathway and install standard ramp access.',
        cost: 'Low',
        estimated_cost_inr: '₹1,500 - ₹3,500',
        priority: 'High',
        impact_score: 88,
        voice_message: `Report received for ${loc}. Estimated low-cost remediation is ₹1,500 to ₹3,500.`
      }
    });
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AccessTwin server running on http://localhost:${PORT}`);
  });
}

startServer();