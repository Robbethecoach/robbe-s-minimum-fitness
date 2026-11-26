-- Adaptive plan foundation
-- Everyone follows the same session variation (workout_blocks / exercises = the template).
-- What differs per member: focus (sets/reps emphasis), deload timing, and per-exercise
-- overrides created when a member accepts a suggestion.

-- ── 1. Roles (Robbe = admin) ───────────────────────────────────────────
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER so policies can check roles without recursive RLS.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
-- Roles are granted from the Supabase dashboard / SQL only (no insert policy).

-- Admin can write all content tables (prepares the Feed / admin area).
CREATE POLICY "Admin manages workout blocks" ON public.workout_blocks FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages exercises" ON public.exercises FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages mobility flows" ON public.mobility_flows FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages accessory library" ON public.accessory_library FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages chain tasks" ON public.chain_tasks FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages daily thoughts" ON public.daily_thoughts FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages recipes" ON public.recipes FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages content library" ON public.content_library FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tighten image uploads: only admin may upload Think images.
DROP POLICY IF EXISTS "Authenticated users can upload think images" ON storage.objects;
CREATE POLICY "Admin can upload think images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'think-images' AND public.has_role(auth.uid(), 'admin'));

-- ── 2. Profile: focus + 3–6 training days ──────────────────────────────
-- Focus scores 1-5, relative to each other; the number of days makes them absolute.
ALTER TABLE public.user_profiles
  ADD COLUMN focus_strength SMALLINT NOT NULL DEFAULT 3 CHECK (focus_strength BETWEEN 1 AND 5),
  ADD COLUMN focus_conditioning SMALLINT NOT NULL DEFAULT 3 CHECK (focus_conditioning BETWEEN 1 AND 5),
  ADD COLUMN focus_mobility SMALLINT NOT NULL DEFAULT 3 CHECK (focus_mobility BETWEEN 1 AND 5),
  ADD COLUMN conditioning_goal TEXT CHECK (conditioning_goal IN ('5k', '10k', 'half_marathon', 'marathon', 'fitter')),
  ADD COLUMN goal TEXT;

-- Existing rows may predate the rule, so validate only new / updated rows.
ALTER TABLE public.user_profiles
  ADD CONSTRAINT preferred_days_3_to_6
  CHECK (NOT onboarding_completed OR cardinality(preferred_days) BETWEEN 3 AND 6) NOT VALID;

-- Which quality an exercise mainly trains, so focus can scale it.
ALTER TABLE public.exercises
  ADD COLUMN focus TEXT NOT NULL DEFAULT 'strength'
  CHECK (focus IN ('strength', 'conditioning', 'mobility')),
  -- Main lifts get an estimated 5RM/1RM and a load range.
  ADD COLUMN pattern TEXT CHECK (pattern IN ('squat', 'hinge', 'push', 'pull', 'single_leg', 'carry_trunk', 'accessory')),
  ADD COLUMN is_main_lift BOOLEAN NOT NULL DEFAULT false,
  -- Mobility exercises Robbe marks as usable in the mobility block of A/B.
  ADD COLUMN usable_in_strength_block BOOLEAN NOT NULL DEFAULT false;

-- ── 3. Member plan (season → block → deload timing) ────────────────────
CREATE TABLE public.member_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL DEFAULT 1,
  block_number INTEGER NOT NULL DEFAULT 1 CHECK (block_number BETWEEN 1 AND 3),
  block_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Week of the block in which the deload happens. Default week 4; a suggestion can move it earlier.
  deload_week INTEGER NOT NULL DEFAULT 4 CHECK (deload_week BETWEEN 2 AND 4),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX member_plans_one_active ON public.member_plans (user_id) WHERE status = 'active';

ALTER TABLE public.member_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own plans" ON public.member_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own plans" ON public.member_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manages plans" ON public.member_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Plan changes (e.g. deload_week) happen through accepted suggestions / the engine, not direct member updates.

-- Per-member overrides on the template prescription (from accepted suggestions or admin).
CREATE TABLE public.member_exercise_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets INTEGER CHECK (sets BETWEEN 1 AND 10),
  reps TEXT,
  target_load_kg NUMERIC(6,2) CHECK (target_load_kg >= 0),
  paused BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'suggestion' CHECK (source IN ('suggestion', 'escalation', 'admin')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id)
);

ALTER TABLE public.member_exercise_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own overrides" ON public.member_exercise_overrides FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manages overrides" ON public.member_exercise_overrides FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 4. Logged sets: weight, reps and RIR per set ──────────────────────
CREATE POLICY "Users can update own completions" ON public.user_workout_completions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.exercise_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completion_id UUID NOT NULL REFERENCES public.user_workout_completions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_number SMALLINT NOT NULL CHECK (set_number BETWEEN 1 AND 10),
  weight_kg NUMERIC(6,2) CHECK (weight_kg >= 0 AND weight_kg <= 1000),
  reps SMALLINT CHECK (reps BETWEEN 0 AND 100),
  rir SMALLINT CHECK (rir BETWEEN 0 AND 10),
  is_calibration BOOLEAN NOT NULL DEFAULT false, -- the once-per-block set to failure
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (completion_id, exercise_id, set_number)
);

CREATE INDEX exercise_sets_user_exercise ON public.exercise_sets (user_id, exercise_id, logged_at DESC);

ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sets" ON public.exercise_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sets" ON public.exercise_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sets" ON public.exercise_sets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sets" ON public.exercise_sets FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin views all sets" ON public.exercise_sets FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Weekly check-in fields from the 26 Nov model (weight and waist optional).
ALTER TABLE public.weekly_checkins
  ADD COLUMN stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  ADD COLUMN pain BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN pain_detail TEXT,
  ADD COLUMN weight_kg NUMERIC(5,1) CHECK (weight_kg BETWEEN 20 AND 400),
  ADD COLUMN waist_cm NUMERIC(5,1) CHECK (waist_cm BETWEEN 30 AND 250);

-- ── 5. Method rules (Robbe's decision rules) ───────────────────────────
CREATE TABLE public.method_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step TEXT NOT NULL CHECK (step IN ('read', 'build', 'coach', 'adapt')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,             -- the rule in Robbe's own words
  condition JSONB NOT NULL DEFAULT '{}', -- machine-readable trigger, e.g. {"energy_below": 5, "weeks": 2}
  action JSONB NOT NULL DEFAULT '{}',    -- e.g. {"type": "move_deload", "to_week": 3}
  priority INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.method_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages method rules" ON public.method_rules FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 6. Suggestions ─────────────────────────────────────────────────────
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'progress_load', 'hold', 'reduce_volume', 'swap_session',
    'move_deload', 'reduce_sessions', 'minimums_focus'
  )),
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',   -- e.g. {"delta_kg": 2.5} or {"to_week": 3}
  reason TEXT NOT NULL,                  -- one line shown to the member
  rule_id UUID REFERENCES public.method_rules(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'rule' CHECK (source IN ('rule', 'ai')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  decided_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX suggestions_user_week ON public.suggestions (user_id, week_start DESC);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own suggestions" ON public.suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manages suggestions" ON public.suggestions FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Members only change the status, through this function (no direct UPDATE policy).
CREATE OR REPLACE FUNCTION public.decide_suggestion(_suggestion_id UUID, _decision TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _decision NOT IN ('accepted', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;
  UPDATE public.suggestions
     SET status = _decision, decided_at = now()
   WHERE id = _suggestion_id AND user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion not found or already decided';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_suggestion(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_suggestion(UUID, TEXT) TO authenticated;

-- ── 7. Escalation flags ────────────────────────────────────────────────
CREATE TABLE public.escalation_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('onboarding', 'checkin', 'session', 'engine')),
  category TEXT NOT NULL CHECK (category IN (
    'pain', 'injury', 'under_eating', 'food_relationship', 'cycle', 'pregnancy', 'medical', 'other'
  )),
  detail TEXT,
  refer_to TEXT CHECK (refer_to IN ('gp', 'physio', 'dietitian', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.escalation_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own flags" ON public.escalation_flags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users self-report flags" ON public.escalation_flags FOR INSERT
  WITH CHECK (auth.uid() = user_id AND source IN ('onboarding', 'checkin', 'session') AND status = 'open');
CREATE POLICY "Admin manages flags" ON public.escalation_flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 8. Interview queue (questions for Robbe) ───────────────────────────
CREATE TABLE public.robbe_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step TEXT NOT NULL CHECK (step IN ('read', 'build', 'coach', 'adapt')),
  question TEXT NOT NULL,
  context TEXT,                          -- why it is asked: the gap, dismissal pattern or edge case
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('gap', 'dismissal_pattern', 'edge_case', 'manual')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'skipped')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.robbe_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.robbe_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  rule_id UUID REFERENCES public.method_rules(id) ON DELETE SET NULL, -- set when the answer became a rule
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.robbe_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robbe_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages questions" ON public.robbe_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages answers" ON public.robbe_answers FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 9. updated_at triggers ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER member_plans_touch BEFORE UPDATE ON public.member_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER member_exercise_overrides_touch BEFORE UPDATE ON public.member_exercise_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER method_rules_touch BEFORE UPDATE ON public.method_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
