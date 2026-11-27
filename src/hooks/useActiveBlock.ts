import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { LibraryRow, PlacementRow } from '@/lib/feed';

export interface LibraryDetail extends LibraryRow {
  video_url: string | null;
  cues: string[];
  regression_id: string | null;
  progression_id: string | null;
}

export interface ActiveBlock {
  id: string;
  block_number: number;
  starts_on: string;
  power_included: boolean;
  sessions: { id: string; day_type: string; workout_name: string }[];
  rows: (PlacementRow & { workout_block_id: string; library: LibraryDetail | null })[];
  /** Names of exercises referenced as regression / progression. */
  names: Record<string, string>;
}

/** The block members train now: the latest published block that has started. */
export const useActiveBlock = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['active_block', user?.id],
    queryFn: async (): Promise<ActiveBlock | null> => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: block, error } = await supabase
        .from('training_blocks')
        .select('id, block_number, starts_on, power_included')
        .eq('status', 'published')
        .lte('starts_on', today)
        .order('starts_on', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!block) return null;

      const { data: sessions, error: e2 } = await supabase
        .from('workout_blocks')
        .select('id, day_type, workout_name')
        .eq('training_block_id', block.id);
      if (e2) throw e2;

      const { data: rows, error: e3 } = await supabase
        .from('exercises')
        .select('id, workout_block_id, name, sets, reps, role, emom_interval_sec, superset_with, order_index, library:exercise_library(*)')
        .in('workout_block_id', sessions.map((s) => s.id))
        .order('order_index');
      if (e3) throw e3;
      const typedRows = rows as unknown as ActiveBlock['rows'];

      const linkIds = [...new Set(typedRows.flatMap((r) => [r.library?.regression_id, r.library?.progression_id]).filter(Boolean))] as string[];
      const names: Record<string, string> = {};
      if (linkIds.length) {
        const { data: linked } = await supabase.from('exercise_library').select('id, name').in('id', linkIds);
        for (const l of linked ?? []) names[l.id] = l.name;
      }
      return { ...block, sessions, rows: typedRows, names };
    },
    enabled: !!user,
  });
};
