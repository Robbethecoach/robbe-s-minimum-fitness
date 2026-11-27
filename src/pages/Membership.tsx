import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useMembership } from '@/hooks/useMembership';
import { callFunction } from '@/lib/functions';
import { PRICE_LABEL } from '@/lib/membership';

const POINTS = [
  'Your plan, adapted to your focus and your week',
  'A new training block from Robbe every 4 weeks',
  'Zones and weights that move with your progress',
  'The Chain, Fuel and weekly check-ins',
];

/** /membership — status, subscribe (Stripe Checkout) and manage billing (Stripe portal). */
const Membership = () => {
  const { state, membership, isLoading, refetch } = useMembership();
  const [params] = useSearchParams();
  const justPaid = params.get('paid') === '1';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Stripe's webhook can land a few seconds after the redirect: poll briefly.
  useEffect(() => {
    if (!justPaid || state?.kind === 'paid') return;
    const id = setInterval(() => refetch(), 2500);
    const stop = setTimeout(() => clearInterval(id), 30000);
    return () => { clearInterval(id); clearTimeout(stop); };
  }, [justPaid, state?.kind, refetch]);

  const go = async (fn: 'create-checkout' | 'customer-portal') => {
    setBusy(true);
    setError('');
    try {
      const { url } = await callFunction<{ url: string }>(fn, {});
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const primary = 'w-full rounded-lg bg-primary px-8 py-[14px] text-[13px] font-medium tracking-[0.08em] uppercase text-primary-foreground transition-colors hover:bg-foreground/90 disabled:opacity-40';
  const secondary = 'w-full rounded-lg border border-foreground/60 px-8 py-[13px] text-[13px] font-medium tracking-[0.08em] uppercase disabled:opacity-40';

  if (isLoading || !state) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-xs tracking-[0.1em] uppercase text-muted-foreground">Loading...</p></div>;
  }

  const headline =
    state.kind === 'admin' ? 'Coach account'
    : state.kind === 'trial' ? `${state.daysLeft} free ${state.daysLeft === 1 ? 'day' : 'days'} left`
    : state.kind === 'paid' ? 'You’re a member'
    : state.kind === 'past_due' ? 'Payment needs attention'
    : state.kind === 'ending' ? 'Membership ending'
    : justPaid ? 'Almost there' : 'Keep training';

  return (
    <div className="flex min-h-screen items-center justify-center px-6 pt-20 pb-16">
      <div className="w-full max-w-sm">
        <p className="text-center text-[12px] tracking-[0.1em] uppercase text-muted-foreground">Membership</p>
        <h1 className="mt-3 text-center font-serif italic text-3xl md:text-4xl">{headline}</h1>

        <div className="mt-6 text-center text-sm text-muted-foreground leading-relaxed">
          {state.kind === 'admin' && <p>You have full access as the coach. Members see their own status here.</p>}
          {state.kind === 'trial' && <p>Your free days end on {format(state.endsAt, 'd MMMM')}. Subscribe now and you keep the free days you have left: the first payment is on that date.</p>}
          {state.kind === 'paid' && (
            <p>{state.cancelling && state.renewsAt ? `Cancelled. You keep access until ${format(state.renewsAt, 'd MMMM')}.` : state.renewsAt ? `Renews on ${format(state.renewsAt, 'd MMMM')}.` : 'Thanks for training with me.'}</p>
          )}
          {state.kind === 'past_due' && <p>Your last payment didn't go through. Update your card to keep your plan.</p>}
          {state.kind === 'ending' && <p>You keep access until {format(state.endsAt, 'd MMMM')}.</p>}
          {state.kind === 'none' && (justPaid
            ? <p>Payment received. Activating your membership…</p>
            : <p>Your free days are over. Pick up where you left off: your plan, your weights and your chain are all still here.</p>)}
        </div>

        {(state.kind === 'trial' || state.kind === 'none' || state.kind === 'ending') && !justPaid && (
          <div className="mt-10 rounded-xl border border-border bg-card p-6">
            <p className="font-serif italic text-4xl">{PRICE_LABEL}<span className="ml-1 font-sans not-italic text-sm text-muted-foreground">/ month</span></p>
            <p className="mt-1 text-[12px] text-muted-foreground">VAT included · cancel any time</p>
            <ul className="mt-5 space-y-2 text-sm">
              {POINTS.map((p) => <li key={p} className="flex gap-2"><span className="text-accent">—</span>{p}</li>)}
            </ul>
            <button onClick={() => go('create-checkout')} disabled={busy} className={`${primary} mt-6`}>
              {busy ? '...' : state.kind === 'trial' ? 'Subscribe now' : 'Subscribe'}
            </button>
          </div>
        )}

        {(state.kind === 'paid' || state.kind === 'past_due' || (state.kind === 'ending' && membership?.stripe_customer_id)) && (
          <button onClick={() => go('customer-portal')} disabled={busy} className={`${state.kind === 'past_due' ? primary : secondary} mt-10`}>
            {busy ? '...' : state.kind === 'past_due' ? 'Update card' : 'Manage billing'}
          </button>
        )}

        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
        <p className="mt-10 text-center text-[11px] text-muted-foreground">Payments are handled by Stripe. Your card never touches this app.</p>
      </div>
    </div>
  );
};

export default Membership;
