// Signed-in member → Stripe Checkout for the monthly subscription. Free days left are kept as a Stripe trial.
import { APP_URL, admin, cors, json, stripe, userFrom } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const user = await userFrom(req);
    if (!user) return json({ error: 'Sign in first.' }, 401);
    const price = Deno.env.get('STRIPE_PRICE_ID');
    if (!price || !Deno.env.get('STRIPE_SECRET_KEY')) return json({ error: 'Payments are not switched on yet.' }, 503);

    const db = admin();
    const { data: m } = await db.from('memberships').select('*').eq('user_id', user.id).maybeSingle();
    if (m && ['active', 'past_due'].includes(m.status) && m.stripe_subscription_id) {
      return json({ error: 'You already have a subscription. Use "Manage billing".' }, 400);
    }

    let customer = m?.stripe_customer_id as string | undefined;
    if (!customer) {
      const c = await stripe('customers', { email: user.email, metadata: { user_id: user.id, app: 'minimum-fitness' } });
      customer = c.id;
      await db.from('memberships').upsert({ user_id: user.id, stripe_customer_id: customer, status: m?.status ?? 'canceled', updated_at: new Date().toISOString() });
    }

    // Keep remaining free days: Stripe needs a trial end at least 48 h ahead.
    const trialEnd = m?.status === 'trial' && m.trial_ends_at ? Math.floor(new Date(m.trial_ends_at).getTime() / 1000) : 0;
    const keepTrial = trialEnd > Date.now() / 1000 + 49 * 3600;

    const session = await stripe('checkout/sessions', {
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      success_url: `${APP_URL}/membership?paid=1`,
      cancel_url: `${APP_URL}/membership`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      tax_id_collection: { enabled: true },
      subscription_data: { metadata: { user_id: user.id }, ...(keepTrial ? { trial_end: trialEnd } : {}) },
    });
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'Could not start the payment. Try again in a minute.' }, 500);
  }
});
