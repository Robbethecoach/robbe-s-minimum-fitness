-- 1) Alternatives to the 30-minute test: a recent lactate test or a 5 km best with heart rate.
ALTER TABLE public.conditioning_tests DROP CONSTRAINT IF EXISTS conditioning_tests_test_type_check;
ALTER TABLE public.conditioning_tests ADD CONSTRAINT conditioning_tests_test_type_check
  CHECK (test_type IN ('run_30', 'walk_1600', 'lactate', 'race_5k'));

ALTER TABLE public.conditioning_tests
  ADD COLUMN IF NOT EXISTS threshold_hr SMALLINT CHECK (threshold_hr BETWEEN 80 AND 230),
  ADD COLUMN IF NOT EXISTS threshold_pace_sec INTEGER CHECK (threshold_pace_sec BETWEEN 120 AND 900),
  ADD COLUMN IF NOT EXISTS lt1_hr SMALLINT CHECK (lt1_hr BETWEEN 60 AND 230),
  ADD COLUMN IF NOT EXISTS lt1_pace_sec INTEGER CHECK (lt1_pace_sec BETWEEN 120 AND 1200),
  ADD COLUMN IF NOT EXISTS report_path TEXT CHECK (char_length(report_path) <= 300);

-- Private bucket for lactate test reports (PDF or photo). Members see only their own folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('test-reports', 'test-reports', false, 10485760,
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Members upload own test reports" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'test-reports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members read own test reports" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'test-reports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admin reads all test reports" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'test-reports' AND public.has_role(auth.uid(), 'admin'));

-- 2) Visits: one row per page view. First party, no cookies, no IP. Only admins can read.
CREATE TABLE public.app_visits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  path TEXT NOT NULL CHECK (char_length(path) BETWEEN 1 AND 200),
  referrer TEXT CHECK (char_length(referrer) <= 200),
  device TEXT CHECK (device IN ('mobile', 'desktop')),
  standalone BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX app_visits_created ON public.app_visits (created_at DESC);

ALTER TABLE public.app_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone logs a visit as themselves" ON public.app_visits FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Admin reads visits" ON public.app_visits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
