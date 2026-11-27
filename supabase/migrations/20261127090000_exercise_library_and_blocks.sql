-- Exercise library + blocks (decided 27 Nov 2026).
-- Robbe adds an exercise once to the library (video, cues, tags) and builds each 4-week block
-- by placing library exercises in sessions A–D. The app orders sessions, pairs supersets,
-- estimates duration and scales sets per member.

CREATE TABLE public.exercise_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  video_url TEXT CHECK (video_url IS NULL OR char_length(video_url) <= 500),
  cues TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(cues) <= 3),
  role TEXT NOT NULL DEFAULT 'accessory' CHECK (role IN ('main', 'accessory', 'extra')),
  quality TEXT NOT NULL DEFAULT 'strength' CHECK (quality IN ('strength', 'mobility', 'power')),
  region TEXT NOT NULL DEFAULT 'full_body' CHECK (region IN ('upper', 'lower', 'full_body', 'core')),
  pattern TEXT CHECK (pattern IN ('squat', 'hinge', 'push', 'pull')),
  unit TEXT NOT NULL DEFAULT 'reps' CHECK (unit IN ('reps', 'seconds', 'per_side')),
  default_sets SMALLINT NOT NULL DEFAULT 3 CHECK (default_sets BETWEEN 1 AND 10),
  default_reps TEXT NOT NULL DEFAULT '8-10' CHECK (char_length(default_reps) <= 20),
  emom_interval_sec SMALLINT CHECK (emom_interval_sec BETWEEN 30 AND 600),
  superset_ok BOOLEAN NOT NULL DEFAULT false,
  regression_id UUID REFERENCES public.exercise_library(id) ON DELETE SET NULL,
  progression_id UUID REFERENCES public.exercise_library(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (pattern IS NULL OR (role = 'main' AND quality = 'strength'))
);

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read the library" ON public.exercise_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages the library" ON public.exercise_library FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER exercise_library_touch BEFORE UPDATE ON public.exercise_library
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- A 4-week block. Members see the latest published block that has started.
CREATE TABLE public.training_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_number INTEGER NOT NULL CHECK (block_number > 0),
  title TEXT,
  starts_on DATE NOT NULL,
  power_included BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read published blocks" ON public.training_blocks FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY "Admin manages blocks" ON public.training_blocks FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER training_blocks_touch BEFORE UPDATE ON public.training_blocks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Sessions (A–D…) belong to a block; exercises are placements of library exercises.
ALTER TABLE public.workout_blocks
  ADD COLUMN training_block_id UUID REFERENCES public.training_blocks(id) ON DELETE CASCADE;

ALTER TABLE public.exercises
  ADD COLUMN library_id UUID REFERENCES public.exercise_library(id) ON DELETE RESTRICT,
  ADD COLUMN role TEXT CHECK (role IN ('main', 'accessory', 'extra')),
  ADD COLUMN emom_interval_sec SMALLINT CHECK (emom_interval_sec BETWEEN 30 AND 600),
  ADD COLUMN superset_with UUID REFERENCES public.exercises(id) ON DELETE SET NULL;

-- Session length: 60 minutes by default; members can allow longer sessions.
ALTER TABLE public.user_profiles
  ADD COLUMN session_minutes SMALLINT NOT NULL DEFAULT 60 CHECK (session_minutes BETWEEN 30 AND 150),
  ADD COLUMN ask_when_longer BOOLEAN NOT NULL DEFAULT true;

-- "Watched" in the block overview.
CREATE TABLE public.exercise_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  library_id UUID NOT NULL REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, library_id)
);

ALTER TABLE public.exercise_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own watched" ON public.exercise_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users mark watched" ON public.exercise_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unmark watched" ON public.exercise_views FOR DELETE USING (auth.uid() = user_id);
