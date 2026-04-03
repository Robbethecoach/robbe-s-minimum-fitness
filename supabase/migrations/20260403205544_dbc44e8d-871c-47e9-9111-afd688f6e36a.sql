
-- User profiles for onboarding data
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_days TEXT[] NOT NULL DEFAULT '{}',
  experience_level TEXT NOT NULL DEFAULT 'beginner',
  equipment_access TEXT NOT NULL DEFAULT 'gym',
  training_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Workout blocks (4-week programme)
CREATE TABLE public.workout_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 4),
  day_type TEXT NOT NULL,
  workout_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workout blocks viewable by authenticated" ON public.workout_blocks FOR SELECT TO authenticated USING (true);

-- Exercises linked to workout blocks
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_block_id UUID NOT NULL REFERENCES public.workout_blocks(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'main_lift',
  name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '8',
  coaching_note TEXT,
  youtube_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  alternative_name TEXT,
  alternative_youtube_url TEXT,
  alternative_coaching_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercises viewable by authenticated" ON public.exercises FOR SELECT TO authenticated USING (true);

-- User workout completions
CREATE TABLE public.user_workout_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_block_id UUID NOT NULL REFERENCES public.workout_blocks(id),
  week_number INTEGER NOT NULL,
  day_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workout_block_id, day_date)
);

ALTER TABLE public.user_workout_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own completions" ON public.user_workout_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.user_workout_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own completions" ON public.user_workout_completions FOR DELETE USING (auth.uid() = user_id);

-- Mobility flows library
CREATE TABLE public.mobility_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 10,
  tag TEXT NOT NULL DEFAULT 'Full body',
  description TEXT NOT NULL DEFAULT '',
  youtube_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mobility_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mobility flows viewable by authenticated" ON public.mobility_flows FOR SELECT TO authenticated USING (true);

-- Accessory drills library
CREATE TABLE public.accessory_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  target_area TEXT NOT NULL DEFAULT 'Full body',
  coaching_note TEXT,
  youtube_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accessory_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accessory library viewable by authenticated" ON public.accessory_library FOR SELECT TO authenticated USING (true);

-- Timestamp trigger for user_profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
