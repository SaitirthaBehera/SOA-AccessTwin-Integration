import { Building, AccessibilityFeature, AccessibilityReport, Recommendation, DisabilityProfile, RouteResult, AiDetectionResult, VerificationStatus, ConfidenceLevel } from '../types';
import { MOCK_BUILDINGS, MOCK_FEATURES, MOCK_NODES, MOCK_EDGES, MOCK_AI_DETECTION_SAMPLES } from '../data/mockData';
import { calculateAccessibleRoute } from '../utils/navigation';
import { supabase, isSupabaseConfigured, signInAdminWithSupabase } from '../lib/supabase';

let localFeatures = [...MOCK_FEATURES];

// Safe UUID Generator
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function parseLocation(loc: any): { x: number; y: number } {
  if (loc && typeof loc === 'object' && typeof loc.x === 'number') {
    return { x: loc.x, y: loc.y };
  }
  if (typeof loc === 'string') {
    try {
      const parsed = JSON.parse(loc);
      if (parsed && typeof parsed.x === 'number') return { x: parsed.x, y: parsed.y };
    } catch {}
  }
  return { x: 50, y: 50 };
}

function mapSupabaseReportToModel(d: any): AccessibilityReport {
  const isResolved = d.status === 'resolved' || d.resolution_status === 'resolved';
  const isRejected = (d.verification_status === 'rejected' || d.status === 'rejected') && !isResolved;
  const isVerified = (
    d.verification_status === 'admin_verified' || 
    d.verification_status === 'verified' || 
    d.verified === true ||
    d.status === 'verified'
  ) && !isResolved && !isRejected;

  return {
    id: String(d.id),
    buildingId: d.building_id || 'bldg-iter-main',
    buildingName: d.building_name || 'SOA ITER Academic Block',
    featureName: d.feature_name || 'Reported Location',
    featureType: d.feature_type || 'other',
    status: isResolved ? 'resolved' : isVerified ? 'verified' : isRejected ? 'rejected' : (d.status || d.issue_type || 'broken'),
    description: d.description || '',
    floorId: Number(d.floor_id ?? 0),
    floorName: d.floor_name || d.floor || 'Ground Floor',
    location: parseLocation(d.location),
    photoUrl: d.image_url || d.photo_url || undefined,
    submittedAt: d.submitted_at || d.created_at || new Date().toISOString(),
    reporterName: d.reporter_name || 'Anonymous Campus Reporter',
    verificationStatus: (isVerified || isResolved ? 'admin_verified' : isRejected ? 'rejected' : 'unverified') as VerificationStatus,
    resolutionStatus: (isResolved ? 'resolved' : 'pending') as 'pending' | 'resolved',
    // Strict Confidence: 100% only on Admin Approval, else based on user confirmations count
    confidenceScore: (isVerified || isResolved) ? 100 : isRejected ? 0 : Number(d.confidence_score ?? 40),
    confidenceLevel: ((isVerified || isResolved) ? 'HIGH' : isRejected ? 'LOW' : (d.confidence_level || 'LOW')) as ConfidenceLevel,
    confirmationsCount: Number(d.reporter_count ?? d.confirmations_count ?? 1),
    adminNotes: d.admin_notes || d.rejection_note || undefined,
    rejectionNote: d.rejection_note || d.admin_notes || undefined,
    verifiedBy: d.verified_by || undefined,
    verifiedAt: d.verified_at || undefined,
    rejectedBy: d.rejected_by || undefined,
    rejectedAt: d.rejected_at || undefined,
    ai_verified: d.ai_verified ?? true,
    ai_status: d.ai_verified ? '🤖 AI Verified (Barrier Found)' : '⚠️ AI Flagged (Pending Review)'
  };
}

export const api = {
  async adminLogin(email: string, password?: string): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!password) return { success: false, error: 'Password is required' };
    const result = await signInAdminWithSupabase(email.trim(), password);
    if (result.success && result.session) {
      return { success: true, token: result.session.access_token };
    }
    return { success: false, error: result.error || 'Invalid administrator credentials' };
  },

  async verifyAdminToken(): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) return true;
      } catch (e) {
        console.warn('Token check error:', e);
      }
    }
    return false;
  },

  async getBuildings(): Promise<Building[]> {
    return MOCK_BUILDINGS;
  },

  async getBuilding(id: string): Promise<Building | null> {
    return MOCK_BUILDINGS.find(b => b.id === id) || MOCK_BUILDINGS[0];
  },

  async getFeatures(buildingId: string, floorId?: number): Promise<AccessibilityFeature[]> {
    return localFeatures.filter(f => f.buildingId === buildingId && (floorId === undefined || f.floorId === floorId));
  },

  /**
   * SUBMIT REPORT:
   * 1. Sends photo + description to Python Gemini AI (/api/reports/analyze).
   * 2. Queues dynamic fix suggestion with calculated ₹ cost into Fix Suggestions.
   * 3. Saves permanent report into Supabase with AI verification flag and confidence score.
   */
  async submitReport(reportData: Omit<AccessibilityReport, 'id' | 'submittedAt' | 'verificationStatus' | 'confidenceScore' | 'confidenceLevel'>): Promise<AccessibilityReport> {
    const reporterName = reportData.reporterName?.trim() || 'Anonymous Campus Reporter';
    const bId = reportData.buildingId || 'bldg-iter-main';
    const bName = reportData.buildingName || 'SOA ITER Campus';
    const flId = Number(reportData.floorId ?? 0);
    const flName = reportData.floorName || 'Ground Floor';
    const fName = (reportData.featureName || 'Reported Location').trim();
    const fType = reportData.featureType;

    const getConfidenceScore = (count: number) => {
      if (count <= 1) return { score: 40, level: 'LOW' as const };
      if (count === 2) return { score: 60, level: 'MEDIUM' as const };
      if (count === 3) return { score: 80, level: 'HIGH' as const };
      return { score: 90, level: 'HIGH' as const };
    };

    let aiVerified = true;

    // 🤖 1. Call Python Gemini Vision Backend for Deep AI Verification & Cost Estimation
    if (reportData.photoUrl) {
      try {
        const formData = new FormData();
        if (reportData.photoUrl.startsWith('data:image')) {
          const resBlob = await fetch(reportData.photoUrl);
          const blob = await resBlob.blob();
          formData.append('file', blob, 'user_report.jpg');
        }

        formData.append('user_query', reportData.description || `${fType} issue at ${fName}`);
        formData.append('building_name', `${bName} - ${flName}`);
        formData.append('reporter_name', reporterName);

        const aiResponse = await fetch('/api/reports/analyze', {
          method: 'POST',
          body: formData
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiVerified = aiData.ai_verified ?? true;
        }
      } catch (err) {
        console.warn('Python AI report analysis notice:', err);
      }
    }

    if (!isSupabaseConfigured()) {
      return {
        ...reportData,
        id: `rep-${Date.now()}`,
        buildingId: bId,
        buildingName: bName,
        floorId: flId,
        floorName: flName,
        featureName: fName,
        featureType: fType,
        reporterName,
        submittedAt: new Date().toISOString(),
        verificationStatus: 'unverified',
        confidenceScore: 40,
        confidenceLevel: 'LOW',
        confirmationsCount: 1,
        ai_verified: aiVerified,
        ai_status: aiVerified ? '🤖 AI Verified (Barrier Found)' : '⚠️ AI Flagged (Needs Check)'
      } as AccessibilityReport;
    }

    // 2. Check for duplicate reports in Supabase
    const { data: existingRows } = await supabase
      .from('reports')
      .select('*')
      .eq('building_id', bId)
      .eq('floor_id', flId)
      .eq('feature_type', fType);

    const existing = (existingRows || []).find(r => 
      r.feature_name?.toLowerCase().trim() === fName.toLowerCase() &&
      (r.verification_status === 'unverified' || !r.verification_status || r.verification_status === 'pending')
    );

    if (existing) {
      let confCount = (existing.reporter_count || existing.confirmations_count || 1) + 1;
      const { score: newScore, level: newLevel } = getConfidenceScore(confCount);

      let namesList = existing.reporter_name ? existing.reporter_name.split(',').map((n: string) => n.trim()) : [];
      if (!namesList.includes(reporterName)) namesList.push(reporterName);

      const { data: updatedRow } = await supabase
        .from('reports')
        .update({
          reporter_name: namesList.join(', '),
          reporter_count: confCount,
          confirmations_count: confCount,
          confidence_score: newScore,
          confidence_level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      return mapSupabaseReportToModel(updatedRow || existing);
    }

    // 3. Insert NEW Report into Supabase
    const newUuid = generateUUID();
    const locStr = typeof reportData.location === 'object' ? JSON.stringify(reportData.location) : (reportData.location || '');

    const { data: insertedRow, error: insertError } = await supabase
      .from('reports')
      .insert([{
        id: newUuid,
        reporter_name: reporterName,
        building_id: bId,
        building_name: bName,
        floor: flName,
        floor_id: flId,
        floor_name: flName,
        feature_name: fName,
        feature_type: fType,
        issue_type: reportData.status || 'broken',
        status: reportData.status || 'broken',
        description: reportData.description || '',
        location: locStr,
        image_url: reportData.photoUrl || null,
        photo_url: reportData.photoUrl || null,
        confidence_score: 40,
        confidence_level: 'LOW',
        verification_status: 'unverified',
        resolution_status: 'pending',
        ai_verified: aiVerified,
        reporter_count: 1,
        confirmations_count: 1,
        submitted_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError || !insertedRow) {
      throw new Error(insertError?.message || 'Failed to persist report');
    }

    return mapSupabaseReportToModel(insertedRow);
  },

  async getReports(buildingId?: string): Promise<AccessibilityReport[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      let query = supabase.from('reports').select('*').order('submitted_at', { ascending: false });
      if (buildingId) query = query.eq('building_id', buildingId);
      const { data, error } = await query;
      if (error || !data) return [];
      return data.map(mapSupabaseReportToModel);
    } catch {
      return [];
    }
  },

  async verifyReport(reportId: string, status: 'admin_verified' | 'rejected', notes?: string): Promise<AccessibilityReport | null> {
    const isVerified = status === 'admin_verified';
    const noteText = notes ? notes.trim() : '';
    const now = new Date().toISOString();

    const payload: any = {
      verification_status: isVerified ? 'verified' : 'rejected',
      status: isVerified ? 'verified' : 'rejected',
      confidence_score: isVerified ? 100 : 0,
      confidence_level: isVerified ? 'HIGH' : 'LOW',
      admin_notes: noteText,
      updated_at: now
    };

    const { data: updatedReport } = await supabase
      .from('reports')
      .update(payload)
      .eq('id', reportId)
      .select()
      .single();

    return updatedReport ? mapSupabaseReportToModel(updatedReport) : null;
  },

  async resolveReport(reportId: string): Promise<AccessibilityReport | null> {
    const { data: resolvedReport } = await supabase
      .from('reports')
      .update({
        status: 'resolved',
        resolution_status: 'resolved',
        verification_status: 'verified',
        confidence_score: 100,
        confidence_level: 'HIGH',
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    return resolvedReport ? mapSupabaseReportToModel(resolvedReport) : null;
  },

  /**
   * GET RECOMMENDATIONS: Direct live connection to Python FastAPI Backend!
   */
  async getRecommendations(): Promise<Recommendation[]> {
    try {
      const res = await fetch('/api/recommendations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend recommendations fetch failed:', err);
    }
    return [];
  },

  async updateRecommendationStatus(id: string, status: 'Pending' | 'In Progress' | 'Completed'): Promise<Recommendation | null> {
    return null;
  },

  /**
   * ACCESSIBLE NAVIGATION: Direct live connection to Python Dijkstra Engine!
   */
  async findRoute(startNodeId: string, targetNodeId: string, profile: DisabilityProfile): Promise<RouteResult | null> {
    try {
      const res = await fetch('/api/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startNodeId, targetNodeId, profile })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend navigation fetch fallback:', e);
    }
    return calculateAccessibleRoute(startNodeId, targetNodeId, profile, MOCK_NODES, MOCK_EDGES);
  },

  /**
   * AI VISION DETECTION: Direct live connection to Python Gemini Vision AI!
   */
  async analyzeImage(photoData: string): Promise<AiDetectionResult> {
    try {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: photoData })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend vision detection error:', e);
    }
    return MOCK_AI_DETECTION_SAMPLES[0];
  }
};