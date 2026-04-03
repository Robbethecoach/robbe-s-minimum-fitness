
-- Daily thoughts table
CREATE TABLE public.daily_thoughts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  publish_date DATE NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  attribution TEXT,
  image_url TEXT,
  caption TEXT,
  layout_order TEXT DEFAULT 'text_first',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_thoughts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily thoughts viewable by authenticated"
  ON public.daily_thoughts FOR SELECT TO authenticated
  USING (publish_date <= CURRENT_DATE);

-- Storage bucket for thought images
INSERT INTO storage.buckets (id, name, public) VALUES ('think-images', 'think-images', true);

CREATE POLICY "Think images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'think-images');

CREATE POLICY "Authenticated users can upload think images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'think-images');
