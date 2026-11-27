import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { timingFrom, type Timing } from '@/lib/session';

/** Robbe's own numbers (rest times, warm-up, seconds per rep), with safe defaults. */
export const useTiming = () =>
  useQuery({
    queryKey: ['method_settings', 'timing'],
    queryFn: async (): Promise<Timing> => {
      const { data, error } = await supabase.from('method_settings').select('value').eq('key', 'timing').maybeSingle();
      if (error) throw error;
      return timingFrom(data?.value);
    },
  });
