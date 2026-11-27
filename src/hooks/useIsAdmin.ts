import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/** True when the signed-in user has the admin role (Robbe). The database enforces it too. */
export const useIsAdmin = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is_admin', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user!.id).eq('role', 'admin').maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });
};
