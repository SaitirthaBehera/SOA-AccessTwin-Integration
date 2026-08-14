-- ====================================================================
-- SUPABASE MIGRATION FOR ACCESSIBILITY REPORTING SYSTEM
-- ====================================================================

-- 1. CREATE "reports" TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_name TEXT NOT NULL,
    building_id TEXT NOT NULL DEFAULT 'bldg-iter-main',
    building_name TEXT NOT NULL DEFAULT 'SOA ITER Academic Block C',
    floor TEXT DEFAULT 'Ground Floor',
    floor_id INT DEFAULT 0,
    floor_name TEXT DEFAULT 'Ground Floor',
    feature_id TEXT,
    feature_name TEXT NOT NULL DEFAULT 'Reported Location',
    feature_type TEXT NOT NULL DEFAULT 'other',
    location TEXT,
    issue_type TEXT DEFAULT 'broken',
    status TEXT DEFAULT 'broken',
    description TEXT,
    image_url TEXT,
    photo_url TEXT,
    confidence_score NUMERIC DEFAULT 40,
    confidence_level TEXT DEFAULT 'LOW',
    verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'rejected', 'admin_verified')),
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejection_note TEXT,
    admin_notes TEXT,
    rejection_reason TEXT,
    resolution_status TEXT DEFAULT 'pending',
    reporter_count INT DEFAULT 1,
    confirmations_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Index for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_reports_duplicate_lookup 
ON public.reports(building_id, feature_name, feature_type, verification_status);

-- 2. CREATE "admin_reports" TABLE (Active Admin Verifications Queue)
CREATE TABLE IF NOT EXISTS public.admin_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ DEFAULT now(),
    admin_notes TEXT,
    status TEXT DEFAULT 'verified',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CREATE "report_confirmations" TABLE
CREATE TABLE IF NOT EXISTS public.report_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    reporter_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_report_reporter UNIQUE (report_id, reporter_name)
);

-- 4. CREATE "admin_users" TABLE
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Reports Policies
DROP POLICY IF EXISTS "Allow public read reports" ON public.reports;
CREATE POLICY "Allow public read reports" 
ON public.reports FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow public insert reports" ON public.reports;
CREATE POLICY "Allow public insert reports" 
ON public.reports FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update reports" ON public.reports;
CREATE POLICY "Allow public update reports" 
ON public.reports FOR UPDATE 
USING (true);

-- Admin Reports Policies
DROP POLICY IF EXISTS "Allow public read admin_reports" ON public.admin_reports;
CREATE POLICY "Allow public read admin_reports" ON public.admin_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert admin_reports" ON public.admin_reports;
CREATE POLICY "Allow public insert admin_reports" ON public.admin_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update admin_reports" ON public.admin_reports;
CREATE POLICY "Allow public update admin_reports" ON public.admin_reports FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete admin_reports" ON public.admin_reports;
CREATE POLICY "Allow public delete admin_reports" ON public.admin_reports FOR DELETE USING (true);

-- Confirmations Policies
DROP POLICY IF EXISTS "Allow public read confirmations" ON public.report_confirmations;
CREATE POLICY "Allow public read confirmations" 
ON public.report_confirmations FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow public insert confirmations" ON public.report_confirmations;
CREATE POLICY "Allow public insert confirmations" 
ON public.report_confirmations FOR INSERT 
WITH CHECK (true);

-- Admin Users Policies
DROP POLICY IF EXISTS "Allow authenticated read admin_users" ON public.admin_users;
CREATE POLICY "Allow authenticated read admin_users" 
ON public.admin_users FOR SELECT 
USING (auth.role() = 'authenticated');

-- 5. ATOMIC RPC FUNCTION FOR DUPLICATE DETECTION & CONFIDENCE BOOST
CREATE OR REPLACE FUNCTION public.submit_or_confirm_report(
  p_reporter_name TEXT,
  p_building_id TEXT,
  p_building_name TEXT DEFAULT 'SOA ITER Academic Block C',
  p_floor TEXT DEFAULT 'Ground Floor',
  p_feature_id TEXT DEFAULT NULL,
  p_feature_name TEXT DEFAULT 'Reported Location',
  p_feature_type TEXT DEFAULT 'other',
  p_location TEXT DEFAULT NULL,
  p_issue_type TEXT DEFAULT 'broken',
  p_description TEXT DEFAULT '',
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_report_id UUID;
  v_current_count INT;
  v_new_confidence NUMERIC;
  v_new_level TEXT;
  v_existing_reporters TEXT;
  v_result JSON;
BEGIN
  -- Search for matching existing unverified report
  SELECT id, reporter_count INTO v_existing_report_id, v_current_count
  FROM public.reports
  WHERE building_id = p_building_id
    AND (
      LOWER(TRIM(COALESCE(floor, ''))) = LOWER(TRIM(COALESCE(p_floor, '')))
      OR floor_id::TEXT = p_floor
    )
    AND LOWER(TRIM(feature_name)) = LOWER(TRIM(p_feature_name))
    AND LOWER(TRIM(feature_type)) = LOWER(TRIM(p_feature_type))
    AND (verification_status = 'unverified' OR verification_status IS NULL)
  LIMIT 1;

  IF v_existing_report_id IS NOT NULL THEN
    -- Record confirmation
    INSERT INTO public.report_confirmations (report_id, reporter_name)
    VALUES (v_existing_report_id, TRIM(p_reporter_name))
    ON CONFLICT (report_id, reporter_name) DO NOTHING;

    -- Aggregate reporter names
    SELECT string_agg(DISTINCT reporter_name, ', '), COUNT(DISTINCT reporter_name)
    INTO v_existing_reporters, v_current_count
    FROM public.report_confirmations
    WHERE report_id = v_existing_report_id;

    IF v_current_count <= 1 THEN
      v_new_confidence := 40;
      v_new_level := 'LOW';
    ELSIF v_current_count = 2 THEN
      v_new_confidence := 60;
      v_new_level := 'MEDIUM';
    ELSIF v_current_count = 3 THEN
      v_new_confidence := 80;
      v_new_level := 'HIGH';
    ELSE
      v_new_confidence := 90;
      v_new_level := 'HIGH';
    END IF;

    -- Update existing report
    UPDATE public.reports
    SET 
      reporter_name = COALESCE(v_existing_reporters, reporter_name),
      reporter_count = v_current_count,
      confirmations_count = v_current_count,
      confidence_score = v_new_confidence,
      confidence_level = v_new_level,
      updated_at = now()
    WHERE id = v_existing_report_id;

    SELECT row_to_json(r) INTO v_result
    FROM public.reports r
    WHERE id = v_existing_report_id;

    RETURN v_result;
  ELSE
    -- Create new report
    INSERT INTO public.reports (
      reporter_name,
      building_id,
      building_name,
      floor,
      feature_id,
      feature_name,
      feature_type,
      location,
      issue_type,
      description,
      image_url,
      photo_url,
      confidence_score,
      confidence_level,
      verification_status,
      reporter_count,
      confirmations_count
    )
    VALUES (
      TRIM(p_reporter_name),
      p_building_id,
      p_building_name,
      p_floor,
      p_feature_id,
      p_feature_name,
      p_feature_type,
      p_location,
      p_issue_type,
      p_description,
      p_image_url,
      p_image_url,
      40,
      'LOW',
      'unverified',
      1,
      1
    )
    RETURNING id INTO v_existing_report_id;

    -- Record confirmation
    INSERT INTO public.report_confirmations (report_id, reporter_name)
    VALUES (v_existing_report_id, TRIM(p_reporter_name))
    ON CONFLICT (report_id, reporter_name) DO NOTHING;

    SELECT row_to_json(r) INTO v_result
    FROM public.reports r
    WHERE id = v_existing_report_id;

    RETURN v_result;
  END IF;
END;
$$;
