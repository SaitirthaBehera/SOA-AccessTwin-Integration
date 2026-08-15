import { Building, AccessibilityFeature, AccessibilityReport, Recommendation, DisabilityProfile, RouteResult, AiDetectionResult, VerificationStatus, ConfidenceLevel } from '../types';
import { MOCK_BUILDINGS, MOCK_FEATURES, MOCK_RECOMMENDATIONS, MOCK_NODES, MOCK_EDGES, MOCK_AI_DETECTION_SAMPLES } from '../data/mockData';
import { calculateAccessibleRoute } from '../utils/navigation';
import { supabase, isSupabaseConfigured, signInAdminWithSupabase } from '../lib/supabase';

// In-memory state only for static building features & recommendations
let localFeatures = [...MOCK_FEATURES];
let localRecommendations = [...MOCK_RECOMMENDATIONS];

// Safe UUID Generator compatible with all browser & Node runtimes
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

// Helper to parse location coordinate object
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

// Helper to map a raw Supabase public.reports row to AccessibilityReport
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
    buildingName: d.building_name || 'SOA ITER Academic Block C',
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
    confidenceScore: (isVerified || isResolved) ? 100 : isRejected ? 0 : Number(d.confidence_score ?? 40),
    confidenceLevel: ((isVerified || isResolved) ? 'HIGH' : isRejected ? 'LOW' : (d.confidence_level || 'LOW')) as ConfidenceLevel,
    confirmationsCount: Number(d.reporter_count ?? d.confirmations_count ?? 1),
    adminNotes: d.admin_notes || d.rejection_note || undefined,
    rejectionNote: d.rejection_note || d.admin_notes || undefined,
    verifiedBy: d.verified_by || undefined,
    verifiedAt: d.verified_at || undefined,
    rejectedBy: d.rejected_by || undefined,
    rejectedAt: d.rejected_at || undefined,
  };
}

// Helper to obtain Supabase session access token
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (isSupabaseConfigured()) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  }
  return headers;
};

export const api = {
  /**
   * Admin Authentication strictly via Supabase Auth Email & Password
   */
  async adminLogin(email: string, password?: string): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!password) {
      return { success: false, error: 'Password is required' };
    }

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
        if (data.session?.user) {
          return true;
        }
      } catch (e) {
        console.warn('Supabase token verification error:', e);
      }
    }
    return false;
  },

  async getBuildings(): Promise<Building[]> {
    try {
      const res = await fetch('/api/buildings');
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return MOCK_BUILDINGS;
  },

  async getBuilding(id: string): Promise<Building | null> {
    try {
      const res = await fetch(`/api/buildings/${id}`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return MOCK_BUILDINGS.find(b => b.id === id) || MOCK_BUILDINGS[0];
  },

  async getFeatures(buildingId: string, floorId?: number): Promise<AccessibilityFeature[]> {
    try {
      const url = `/api/buildings/${buildingId}/features` + (floorId !== undefined ? `?floorId=${floorId}` : '');
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return localFeatures.filter(f => f.buildingId === buildingId && (floorId === undefined || f.floorId === floorId));
  },

  /**
   * ADD DETECTED FEATURE TO TWIN MAP (Admin Only)
   * Sends the AI-detected feature to the Digital Twin backend with Admin auth token
   */
  async addFeatureToTwin(featureData: {
    building_id: string;
    floor_id: number;
    feature_type: string;
    label: string;
    confidence: number;
    status: string;
    bbox?: number[];
    source?: string;
    description?: string;
  }): Promise<{ success: boolean; message: string; feature: AccessibilityFeature }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/twin-map/features', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...featureData,
        timestamp: new Date().toISOString()
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `Failed to add feature to Digital Twin Map (Status ${res.status})`);
    }

    const data = await res.json();
    if (data.feature) {
      const existingIndex = localFeatures.findIndex(f => 
        f.buildingId === data.feature.buildingId &&
        f.floorId === data.feature.floorId &&
        f.name.toLowerCase() === data.feature.name.toLowerCase() &&
        f.type === data.feature.type
      );
      if (existingIndex >= 0) {
        localFeatures[existingIndex] = data.feature;
      } else {
        localFeatures.unshift(data.feature);
      }
    }
    return data;
  },

  /**
   * SUBMIT REPORT: Checks for duplicate same-location + same-feature-type reports in Supabase.
   * - Active Pending/Unverified -> MERGE and increase confidence (40% -> 60% -> 80% -> 90%)
   * - Active Verified (not resolved) -> MERGE, record confirmation, keep confidence strictly at 100%
   * - Resolved -> Create NEW REPORT (old resolved report preserved in database for history)
   * - Rejected -> Create NEW REPORT (old rejected report preserved in database for history)
   */
  async submitReport(reportData: Omit<AccessibilityReport, 'id' | 'submittedAt' | 'verificationStatus' | 'confidenceScore' | 'confidenceLevel'>): Promise<AccessibilityReport> {
    const reporterName = reportData.reporterName?.trim() || 'Anonymous Campus Reporter';
    const bId = reportData.buildingId || 'bldg-iter-main';
    const bName = reportData.buildingName || 'SOA ITER Academic Block C';
    const flId = Number(reportData.floorId ?? 0);
    const flName = reportData.floorName || 'Ground Floor';
    const fName = (reportData.featureName || 'Reported Location').trim();
    const fType = reportData.featureType;

    console.log('[Supabase] report submission started:', {
      buildingId: bId,
      floorId: flId,
      featureName: fName,
      featureType: fType,
      reporterName
    });

    if (!isSupabaseConfigured()) {
      const err = 'Supabase client is not configured. Cannot persist report.';
      console.error('[Supabase Error]', err);
      throw new Error(err);
    }

    // Helper for confidence boosting: 1 person -> 40%, 2 people -> 60%, 3 people -> 80%, 4+ -> 90%
    const getConfidenceScore = (count: number) => {
      if (count <= 1) return { score: 40, level: 'LOW' as const };
      if (count === 2) return { score: 60, level: 'MEDIUM' as const };
      if (count === 3) return { score: 80, level: 'HIGH' as const };
      return { score: 90, level: 'HIGH' as const };
    };

    // 1. Fetch existing reports for this building, floor, and feature_type to detect matching candidates
    const { data: existingRows, error: searchError } = await supabase
      .from('reports')
      .select('*')
      .eq('building_id', bId)
      .eq('floor_id', flId)
      .eq('feature_type', fType);

    if (searchError) {
      console.error('[Supabase Error] Supabase errors on searching existing reports:', searchError);
      throw new Error(searchError.message);
    }

    const isResolvedRow = (r: any) => r.status === 'resolved' || r.resolution_status === 'resolved';
    const isRejectedRow = (r: any) => (r.status === 'rejected' || r.verification_status === 'rejected') && !isResolvedRow(r);
    const isVerifiedRow = (r: any) => (
      r.verification_status === 'admin_verified' || 
      r.verification_status === 'verified' || 
      r.status === 'verified'
    ) && !isResolvedRow(r) && !isRejectedRow(r);
    const isActiveRow = (r: any) => !isResolvedRow(r) && !isRejectedRow(r);

    // Matching condition: same location (building, floor, feature_name) AND same feature_type
    const matchingCandidates = (existingRows || []).filter(r => 
      (r.feature_name || '').toLowerCase().trim() === fName.toLowerCase().trim()
    );

    // Find if there is an ACTIVE existing report (not resolved and not rejected)
    const activeExisting = matchingCandidates.find(r => isActiveRow(r));

    if (activeExisting) {
      console.log('[Supabase] Active matching report detected for ID:', activeExisting.id, {
        isVerified: isVerifiedRow(activeExisting),
        currentConfidence: activeExisting.confidence_score
      });

      // Record confirmation in report_confirmations
      const { error: confInsertError } = await supabase
        .from('report_confirmations')
        .insert([{ report_id: activeExisting.id, reporter_name: reporterName }]);

      if (confInsertError && !confInsertError.message?.includes('duplicate key')) {
        console.warn('[Supabase] Note on report_confirmations:', confInsertError.message);
      }

      // Count confirmations / distinct reporters
      const { data: confs } = await supabase
        .from('report_confirmations')
        .select('reporter_name')
        .eq('report_id', activeExisting.id);

      let confCount = (activeExisting.reporter_count || activeExisting.confirmations_count || 1) + 1;
      let namesList = activeExisting.reporter_name ? activeExisting.reporter_name.split(',').map((n: string) => n.trim()) : [];
      if (!namesList.includes(reporterName)) {
        namesList.push(reporterName);
      }

      if (confs && confs.length > 0) {
        const distinctNames = Array.from(new Set(confs.map((c: any) => (c.reporter_name || '').trim()).filter(Boolean)));
        if (distinctNames.length > 0) {
          confCount = Math.max(confCount, distinctNames.length);
          namesList = Array.from(new Set([...namesList, ...distinctNames]));
        }
      }

      const finalReporterNames = namesList.join(', ');

      let updatedDesc = activeExisting.description || '';
      if (reportData.description && !updatedDesc.includes(reportData.description)) {
        updatedDesc = updatedDesc ? `${updatedDesc} | Update by ${reporterName}: ${reportData.description}` : reportData.description;
      }

      // Check if report is already Verified vs Pending
      const isAlreadyVerified = isVerifiedRow(activeExisting);

      let updatePayload: any;

      if (isAlreadyVerified) {
        // CASE 2: Active Verified (not resolved, not rejected) -> MERGE, keep 100% confidence, preserve admin verification
        console.log('[Supabase] Merging into Verified report. Preserving 100% confidence.');
        updatePayload = {
          reporter_name: finalReporterNames,
          reporter_count: confCount,
          confirmations_count: confCount,
          confidence_score: 100,
          confidence_level: 'HIGH',
          verification_status: activeExisting.verification_status || 'verified',
          status: 'verified',
          resolution_status: 'pending',
          description: updatedDesc,
          image_url: reportData.photoUrl || activeExisting.image_url || activeExisting.photo_url || null,
          photo_url: reportData.photoUrl || activeExisting.photo_url || activeExisting.image_url || null,
          updated_at: new Date().toISOString()
        };
      } else {
        // CASE 1: Active Pending/Unverified -> MERGE, boost confidence score according to confirmation count
        const { score: boostedScore, level: boostedLevel } = getConfidenceScore(confCount);
        console.log(`[Supabase] Merging into Pending report. Boosting confidence to ${boostedScore}%.`);
        updatePayload = {
          reporter_name: finalReporterNames,
          reporter_count: confCount,
          confirmations_count: confCount,
          confidence_score: boostedScore,
          confidence_level: boostedLevel,
          verification_status: 'unverified',
          resolution_status: 'pending',
          status: activeExisting.status || reportData.status || 'broken',
          description: updatedDesc,
          image_url: reportData.photoUrl || activeExisting.image_url || activeExisting.photo_url || null,
          photo_url: reportData.photoUrl || activeExisting.photo_url || activeExisting.image_url || null,
          updated_at: new Date().toISOString()
        };
      }

      const { data: updatedRow, error: updateError } = await supabase
        .from('reports')
        .update(updatePayload)
        .eq('id', activeExisting.id)
        .select()
        .single();

      if (updateError || !updatedRow) {
        console.error('[Supabase Error] Supabase error on updating duplicate report:', updateError);
        throw new Error(updateError?.message || 'Failed to update existing report in Supabase');
      }

      // Ensure active queue in public.admin_reports has corresponding status
      const { error: adminQueueErr } = await supabase
        .from('admin_reports')
        .upsert([{ 
          report_id: activeExisting.id, 
          status: isAlreadyVerified ? 'verified' : 'pending' 
        }], { onConflict: 'report_id' });

      if (adminQueueErr) {
        console.warn('[Supabase] Admin queue update warning:', adminQueueErr.message);
      }

      console.log('[Supabase] Existing report merged successfully:', {
        id: updatedRow.id,
        confidence: updatedRow.confidence_score,
        status: updatedRow.status,
        count: confCount
      });

      return mapSupabaseReportToModel(updatedRow);
    }

    // CASE 3 & CASE 4: No active report found (either no prior reports, or all prior matching reports are Resolved/Rejected)
    // -> Create a BRAND NEW report starting with initial confidence (40%, LOW, unverified)
    console.log('[Supabase] No active matching report found. Inserting new report into public.reports...');
    const newReportUuid = generateUUID();
    const locStr = typeof reportData.location === 'object' ? JSON.stringify(reportData.location) : (reportData.location || '');

    const { data: insertedRow, error: insertError } = await supabase
      .from('reports')
      .insert([{
        id: newReportUuid,
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
        reporter_count: 1,
        confirmations_count: 1,
        submitted_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError || !insertedRow) {
      console.error('[Supabase Error] Supabase errors on inserting new report:', insertError);
      throw new Error(insertError?.message || 'Failed to insert report into Supabase database');
    }

    console.log('[Supabase] new report inserted:', insertedRow.id);

    // Insert into report_confirmations
    await supabase.from('report_confirmations').insert([{
      report_id: insertedRow.id,
      reporter_name: reporterName
    }]);

    // Insert into public.admin_reports queue
    const { error: adminQueueError } = await supabase.from('admin_reports').insert([{
      report_id: insertedRow.id,
      status: 'pending'
    }]);

    if (adminQueueError) {
      console.warn('[Supabase] Admin queue insert notice:', adminQueueError.message);
    } else {
      console.log('[Supabase] admin queue record created for:', insertedRow.id);
    }

    return mapSupabaseReportToModel(insertedRow);
  },

  /**
   * LOAD REPORTS: Fetches permanent reports directly from Supabase public.reports
   */
  async getReports(buildingId?: string): Promise<AccessibilityReport[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      console.log('[Supabase] Loading reports from public.reports...');
      let query = supabase.from('reports').select('*').order('submitted_at', { ascending: false });
      if (buildingId) {
        query = query.eq('building_id', buildingId);
      }
      const { data, error } = await query;
      if (error) {
        console.error('[Supabase Error] Supabase errors on getReports:', error);
        throw new Error(error.message);
      }

      if (data && Array.isArray(data)) {
        console.log(`[Supabase] Loaded ${data.length} reports from database.`);
        return data.map(mapSupabaseReportToModel);
      }
      return [];
    } catch (e: any) {
      console.error('[Supabase Error] getReports failed:', e);
      throw e;
    }
  },

  /**
   * ADMIN VERIFY / REJECT: Updates public.reports and syncs public.admin_reports without deleting user report
   */
  async verifyReport(reportId: string, status: 'admin_verified' | 'rejected', notes?: string): Promise<AccessibilityReport | null> {
    const isVerified = status === 'admin_verified';
    if (!isVerified && (!notes || !notes.trim())) {
      throw new Error('Rejection note is compulsory when rejecting a report.');
    }

    const noteText = notes ? notes.trim() : '';
    const now = new Date().toISOString();

    let authAdminUuid: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        authAdminUuid = data.session.user.id;
      }
    } catch {}

    const payload: any = {
      verification_status: isVerified ? 'verified' : 'rejected',
      status: isVerified ? 'verified' : 'rejected',
      resolution_status: 'pending',
      confidence_score: isVerified ? 100 : 0,
      confidence_level: isVerified ? 'HIGH' : 'LOW',
      admin_notes: noteText,
      updated_at: now
    };

    if (isVerified) {
      if (authAdminUuid) payload.verified_by = authAdminUuid;
      payload.verified_at = now;
    } else {
      if (authAdminUuid) payload.rejected_by = authAdminUuid;
      payload.rejected_at = now;
      payload.rejection_note = noteText;
      payload.rejection_reason = noteText;
    }

    // 1. Update public.reports (PERMANENT ROW PRESERVED - NEVER DELETED)
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update(payload)
      .eq('id', reportId)
      .select()
      .single();

    if (updateError || !updatedReport) {
      console.error('[Supabase Error] Supabase errors on verifyReport:', updateError);
      throw new Error(updateError?.message || 'Failed to update report verification in Supabase');
    }

    // 2. Update active admin_reports queue
    const { error: adminUpdateError } = await supabase
      .from('admin_reports')
      .upsert([{
        report_id: reportId,
        verified_by: authAdminUuid || null,
        verified_at: now,
        admin_notes: noteText,
        status: isVerified ? 'verified' : 'rejected'
      }], { onConflict: 'report_id' });

    if (adminUpdateError) {
      console.warn('[Supabase] Admin queue status update notice:', adminUpdateError.message);
    }

    console.log(`[Supabase] Report ${reportId} marked as ${status} (confidence: ${isVerified ? 100 : 0}%)`);
    return mapSupabaseReportToModel(updatedReport);
  },

  /**
   * RESOLVE REPORT: Updates resolution status in public.reports and clears active queue
   */
  async resolveReport(reportId: string): Promise<AccessibilityReport | null> {
    const now = new Date().toISOString();

    // 1. Update public.reports (PERMANENT ROW PRESERVED)
    const { data: resolvedReport, error: resolveError } = await supabase
      .from('reports')
      .update({
        status: 'resolved',
        resolution_status: 'resolved',
        verification_status: 'verified',
        confidence_score: 100,
        confidence_level: 'HIGH',
        updated_at: now
      })
      .eq('id', reportId)
      .select()
      .single();

    if (resolveError || !resolvedReport) {
      console.error('[Supabase Error] Supabase errors on resolveReport:', resolveError);
      throw new Error(resolveError?.message || 'Failed to resolve report in Supabase');
    }

    // 2. Remove from active admin_reports queue
    const { error: queueDeleteError } = await supabase
      .from('admin_reports')
      .delete()
      .eq('report_id', reportId);

    if (queueDeleteError) {
      console.warn('[Supabase] Admin queue cleanup notice:', queueDeleteError.message);
    }

    console.log(`[Supabase] Report ${reportId} marked as resolved in public.reports`);
    return mapSupabaseReportToModel(resolvedReport);
  },

  async getRecommendations(buildingId?: string): Promise<Recommendation[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('recommendations').select('*');
        if (buildingId) {
          query = query.eq('building_id', buildingId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            buildingId: d.building_id || 'bldg-iter-main',
            buildingName: d.building_name || 'ITER Main Academic Building',
            title: d.title || 'Accessibility Recommendation',
            problem: d.problem || d.description || 'Barrier reported',
            solution: d.solution || 'Install accessible ramp or feature',
            severity: d.severity || 'High',
            disabilityTypesAffected: d.disability_types_affected || ['wheelchair'],
            estimatedUsersAffected: d.estimated_users_affected || 150,
            costCategory: d.cost_category || 'Low',
            estimatedCostAmount: d.estimated_cost_amount || d.est_cost || '$200 - $500',
            expectedImpact: d.expected_impact || 'High',
            priority: d.priority || 'High',
            impactScore: d.impact_score || 85,
            status: d.status || 'Pending',
            floorId: d.floor_id ?? 0,
            locationName: d.location_name || 'Main Corridor'
          }));
        }
      } catch (e) {
        console.warn('Supabase getRecommendations fallback:', e);
      }
    }

    try {
      const url = '/api/recommendations' + (buildingId ? `?buildingId=${buildingId}` : '');
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return buildingId ? localRecommendations.filter(r => r.buildingId === buildingId) : localRecommendations;
  },

  async updateRecommendationStatus(id: string, status: 'Pending' | 'In Progress' | 'Completed'): Promise<Recommendation | null> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('recommendations').update({ status }).eq('id', id);
        if (!error) {
          const rec = localRecommendations.find(r => r.id === id);
          if (rec) rec.status = status;
        }
      } catch (e) {
        console.warn('Supabase updateRecommendationStatus error:', e);
      }
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/recommendations/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status })
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const rec = localRecommendations.find(r => r.id === id);
    if (rec) rec.status = status;
    return rec || null;
  },

  async findRoute(startNodeId: string, targetNodeId: string, profile: DisabilityProfile): Promise<RouteResult | null> {
    try {
      const res = await fetch('/api/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startNodeId, targetNodeId, profile })
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return calculateAccessibleRoute(startNodeId, targetNodeId, profile, MOCK_NODES, MOCK_EDGES);
  },

  async analyzeImage(photoData: string): Promise<AiDetectionResult> {
    const res = await fetch('/api/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: photoData })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Vision detection failed with status ${res.status}`);
    }
    const data = await res.json();
    return {
      imageId: data.imageId || `img-${Date.now()}`,
      imageUrl: data.imageUrl || photoData,
      analyzedAt: data.analyzedAt || new Date().toISOString(),
      overallAccessibility: data.overallAccessibility || (data.detectedObjects?.some((o: any) => o.status === 'broken') ? 'Moderate' : 'High'),
      summary: data.summary || data.message || 'AI visual accessibility analysis completed.',
      detectedObjects: data.detectedObjects || data.results || []
    };
  }
};