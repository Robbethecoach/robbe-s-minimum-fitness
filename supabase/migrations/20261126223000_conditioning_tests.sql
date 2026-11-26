-- Conditioning baseline: the 30-minute threshold test, or the 1.6 km walk test for members
-- who can't run 30 minutes yet. Retested every 8 weeks. No intervals before a run test exists.
CREATE TABLE public.conditioning_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('run_30', 'walk_1600')),
  distance_km NUMERIC(5,2) CHECK (distance_km > 0 AND distance_km < 20),
  duration_sec INTEGER CHECK (duration_sec > 0 AND duration_sec < 7200),
  avg_hr SMALLINT CHECK (avg_hr BETWEEN 60 AND 230),
  finish_hr SMALLINT CHECK (finish_hr BETWEEN 60 AND 230),
  hr_after_1min SMALLINT CHECK (hr_after_1min BETWEEN 40 AND 230),
  tested_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX conditioning_tests_user ON public.conditioning_tests (user_id, tested_on DESC);

ALTER TABLE public.conditioning_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tests" ON public.conditioning_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tests" ON public.conditioning_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own tests" ON public.conditioning_tests FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin views all tests" ON public.conditioning_tests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
