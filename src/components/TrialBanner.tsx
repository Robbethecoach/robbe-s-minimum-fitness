import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useMembership } from '@/hooks/useMembership';

/** Slim reminder in the last week of the free days (and when a payment failed). */
const TrialBanner = () => {
  const { state } = useMembership();
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem('trial-banner-hidden') === '1'; } catch { return false; }
  });
  if (hidden || !state || pathname === '/membership' || pathname.startsWith('/feed') || pathname.startsWith('/invite')) return null;

  const text =
    state.kind === 'trial' && state.daysLeft <= 7 ? `${state.daysLeft} free ${state.daysLeft === 1 ? 'day' : 'days'} left`
    : state.kind === 'past_due' ? 'Your last payment failed'
    : null;
  if (!text) return null;

  const hide = () => {
    setHidden(true);
    try { sessionStorage.setItem('trial-banner-hidden', '1'); } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex items-center gap-4 rounded-full border border-border bg-background/95 py-2 pl-5 pr-2 shadow-sm backdrop-blur-sm">
        <span className="text-[12px] tracking-[0.06em] uppercase">{text}</span>
        <Link to="/membership" className="rounded-full bg-primary px-4 py-2 text-[11px] font-medium tracking-[0.08em] uppercase text-primary-foreground">
          {state.kind === 'past_due' ? 'Fix' : 'Keep training'}
        </Link>
        <button onClick={hide} aria-label="Hide" className="p-1 text-muted-foreground"><X className="h-4 w-4" strokeWidth={1.5} /></button>
      </div>
    </div>
  );
};

export default TrialBanner;
