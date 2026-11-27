/** Membership rules shown in the app. The server (has_access) is the source of truth. */

/** PLACEHOLDER until Robbe confirms the price; Stripe holds the real amount. */
export const PRICE_LABEL = '€75';
export const DEFAULT_FREE_DAYS = 28;

export interface MembershipRow {
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export type AccessState =
  | { kind: 'admin' }
  | { kind: 'trial'; daysLeft: number; endsAt: Date }
  | { kind: 'paid'; renewsAt: Date | null; cancelling: boolean }
  | { kind: 'past_due' }
  | { kind: 'ending'; endsAt: Date }
  | { kind: 'none' };

/** Same rule as public.has_access, for the UI. */
export const accessState = (m: MembershipRow | null | undefined, isAdmin: boolean, now = new Date()): AccessState => {
  if (isAdmin) return { kind: 'admin' };
  if (!m) return { kind: 'none' };
  if (m.status === 'active') {
    return { kind: 'paid', renewsAt: m.current_period_end ? new Date(m.current_period_end) : null, cancelling: m.cancel_at_period_end };
  }
  if (m.status === 'past_due') return { kind: 'past_due' };
  if (m.status === 'trial' && m.trial_ends_at && new Date(m.trial_ends_at) > now) {
    const endsAt = new Date(m.trial_ends_at);
    return { kind: 'trial', endsAt, daysLeft: Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 86400000)) };
  }
  if (m.status === 'canceled' && m.current_period_end && new Date(m.current_period_end) > now) {
    return { kind: 'ending', endsAt: new Date(m.current_period_end) };
  }
  return { kind: 'none' };
};

export const hasAccess = (s: AccessState) => s.kind !== 'none';
