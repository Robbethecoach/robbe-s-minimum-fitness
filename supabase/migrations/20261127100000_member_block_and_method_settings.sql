-- Members who join mid-block start with the previous block and stay on it until the next
-- block starts (5–7 weeks; 6 when joining in week 3). The deload is the last week of their block.
ALTER TABLE public.member_plans
  ADD COLUMN training_block_id UUID REFERENCES public.training_blocks(id) ON DELETE SET NULL,
  ADD COLUMN block_weeks SMALLINT NOT NULL DEFAULT 4 CHECK (block_weeks BETWEEN 4 AND 8);

ALTER TABLE public.member_plans DROP CONSTRAINT IF EXISTS member_plans_deload_week_check;
ALTER TABLE public.member_plans ADD CONSTRAINT member_plans_deload_week_check CHECK (deload_week BETWEEN 2 AND 8);

-- Numbers Robbe tunes himself in the Feed (rest times, warm-up, seconds per rep).
CREATE TABLE public.method_settings (
  key TEXT PRIMARY KEY CHECK (char_length(key) <= 60),
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.method_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read settings" ON public.method_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages settings" ON public.method_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER method_settings_touch BEFORE UPDATE ON public.method_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
