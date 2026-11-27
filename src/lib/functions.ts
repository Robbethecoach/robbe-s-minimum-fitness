import { supabase } from '@/integrations/supabase/client';

/** Call an edge function and surface its own error message (not just "non-2xx status"). */
export const callFunction = async <T = Record<string, unknown>>(name: string, body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = 'Something went wrong. Try again.';
    try {
      const ctx = (error as { context?: Response }).context;
      const parsed = ctx ? await ctx.json() : null;
      if (parsed?.error) message = parsed.error;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
};
