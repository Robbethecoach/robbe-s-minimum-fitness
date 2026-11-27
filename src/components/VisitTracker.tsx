import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Logs one row per page view in app_visits. First party: no cookies, no IP, no third parties.
 * Robbe's Feed pages are not counted, and a reload of the same page within 30 s counts once.
 */
const VisitTracker = () => {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const last = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (loading || pathname.startsWith('/feed') || pathname === '/reset-password') return;
    const now = Date.now();
    if (last.current && last.current.path === pathname && now - last.current.at < 30_000) return;
    last.current = { path: pathname, at: now };

    let referrer: string | null = null;
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      referrer = ref && ref.host !== window.location.host ? ref.host.slice(0, 200) : null;
    } catch {
      referrer = null;
    }
    supabase
      .from('app_visits')
      .insert({
        user_id: user?.id ?? null,
        path: pathname.slice(0, 200),
        referrer,
        device: window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
        standalone: window.matchMedia('(display-mode: standalone)').matches,
      })
      .then(() => undefined);
  }, [pathname, user?.id, loading]);

  return null;
};

export default VisitTracker;
