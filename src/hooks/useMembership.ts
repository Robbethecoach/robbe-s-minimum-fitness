import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { type AccessState, type MembershipRow, accessState } from '@/lib/membership';

/** The signed-in member's membership and what it gives access to. */
export const useMembership = () => {
  const { user } = useAuth();
  const admin = useIsAdmin();
  const q = useQuery({
    queryKey: ['membership', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('status, trial_ends_at, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as MembershipRow | null;
    },
    enabled: !!user,
  });
  const isLoading = !!user && (q.isLoading || admin.isLoading);
  const state: AccessState | undefined = isLoading ? undefined : accessState(q.data, !!admin.data);
  return { membership: q.data, state, isLoading, refetch: q.refetch };
};
