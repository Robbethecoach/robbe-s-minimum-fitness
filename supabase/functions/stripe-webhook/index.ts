// Stripe → memberships. Verifies the Stripe signature, then mirrors the subscription state.
import { admin, stripe } from '../_shared/common.ts';

const TOLERANCE_SEC = 300;

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const verify = async (payload: string, header: string | null, secret: string) => {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > TOLERANCE_SEC) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)));
  const given = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  return given.some((g) => g.length === expected.length && [...g].every((c, i) => c === expected[i]));
};

const mapStatus = (s: string) =>
  s === 'active' || s === 'trialing' ? 'active' : s === 'past_due' || s === 'unpaid' ? 'past_due' : s === 'canceled' || s === 'incomplete_expired' ? 'canceled' : null;

// deno-lint-ignore no-explicit-any
const syncSubscription = async (sub: any, fallbackUserId?: string) => {
  const db = admin();
  const status = mapStatus(sub.status);
  if (!status) return;
  let userId = sub.metadata?.user_id ?? fallbackUserId;
  if (!userId) {
    const { data } = await db.from('memberships').select('user_id').eq('stripe_customer_id', sub.customer).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) return console.warn('No member for customer', sub.customer);
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  await db.from('memberships').upsert({
    user_id: userId,
    status,
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });
};

Deno.serve(async (req) => {
  const payload = await req.text();
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret || !(await verify(payload, req.headers.get('Stripe-Signature'), secret))) {
    return new Response('invalid signature', { status: 400 });
  }
  const event = JSON.parse(payload);
  try {
    const obj = event.data.object;
    switch (event.type) {
      case 'checkout.session.completed':
        if (obj.mode === 'subscription' && obj.subscription) {
          await syncSubscription(await stripe(`subscriptions/${obj.subscription}`, undefined, 'GET'), obj.client_reference_id);
        }
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(obj);
        break;
    }
    return new Response('ok');
  } catch (e) {
    console.error(e);
    return new Response('error', { status: 500 });
  }
});
