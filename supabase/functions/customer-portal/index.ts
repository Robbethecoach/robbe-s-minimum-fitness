// Signed-in member → Stripe customer portal (card, invoices, cancel).
import { APP_URL, admin, cors, json, stripe, userFrom } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const user = await userFrom(req);
    if (!user) return json({ error: 'Sign in first.' }, 401);
    const { data: m } = await admin().from('memberships').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
    if (!m?.stripe_customer_id) return json({ error: 'No billing account yet.' }, 400);
    const session = await stripe('billing_portal/sessions', { customer: m.stripe_customer_id, return_url: `${APP_URL}/membership` });
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'Could not open billing. Try again in a minute.' }, 500);
  }
});
