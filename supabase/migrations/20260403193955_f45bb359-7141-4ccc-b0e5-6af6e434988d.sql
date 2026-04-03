CREATE TABLE public.weekly_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workouts_completed INTEGER NOT NULL DEFAULT 0 CHECK (workouts_completed >= 0 AND workouts_completed <= 7),
  nutrition_adherence INTEGER NOT NULL DEFAULT 5 CHECK (nutrition_adherence >= 1 AND nutrition_adherence <= 10),
  sleep_quality INTEGER NOT NULL DEFAULT 5 CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  energy_levels INTEGER NOT NULL DEFAULT 5 CHECK (energy_levels >= 1 AND energy_levels <= 10),
  hard_this_week TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checkins"
  ON public.weekly_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checkins"
  ON public.weekly_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.content_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('Move', 'Fuel', 'Recover', 'Think')),
  description TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content is viewable by authenticated users"
  ON public.content_library FOR SELECT
  TO authenticated
  USING (true);