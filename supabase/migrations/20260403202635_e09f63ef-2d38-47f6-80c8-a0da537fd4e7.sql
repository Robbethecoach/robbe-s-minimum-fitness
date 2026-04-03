-- Weekly chain tasks set by the coach
CREATE TABLE public.chain_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  day_date DATE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chain_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chain tasks are viewable by authenticated users"
ON public.chain_tasks
FOR SELECT
TO authenticated
USING (true);

-- User progress on chain tasks
CREATE TABLE public.chain_user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES public.chain_tasks(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pushed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id, day_date)
);

ALTER TABLE public.chain_user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
ON public.chain_user_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.chain_user_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.chain_user_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
ON public.chain_user_progress
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);