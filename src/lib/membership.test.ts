import { describe, expect, it } from 'vitest';
import { accessState, hasAccess } from './membership';

const base = { trial_ends_at: null, current_period_end: null, cancel_at_period_end: false, stripe_customer_id: null, stripe_subscription_id: null };
const now = new Date('2026-12-01T12:00:00Z');

describe('membership access', () => {
  it('lets the admin in without a membership', () => {
    expect(hasAccess(accessState(null, true, now))).toBe(true);
  });
  it('counts trial days left, rounded up', () => {
    const s = accessState({ ...base, status: 'trial', trial_ends_at: '2026-12-03T10:00:00Z' }, false, now);
    expect(s).toMatchObject({ kind: 'trial', daysLeft: 2 });
  });
  it('closes the door when the trial is over', () => {
    expect(hasAccess(accessState({ ...base, status: 'trial', trial_ends_at: '2026-11-30T10:00:00Z' }, false, now))).toBe(false);
  });
  it('keeps a cancelled member in until the paid period ends', () => {
    expect(accessState({ ...base, status: 'canceled', current_period_end: '2026-12-20T00:00:00Z' }, false, now).kind).toBe('ending');
    expect(hasAccess(accessState({ ...base, status: 'canceled', current_period_end: '2026-11-20T00:00:00Z' }, false, now))).toBe(false);
  });
  it('keeps access while a payment is being retried', () => {
    expect(hasAccess(accessState({ ...base, status: 'past_due' }, false, now))).toBe(true);
  });
  it('no membership means no access', () => {
    expect(hasAccess(accessState(null, false, now))).toBe(false);
  });
});
