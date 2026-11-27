// Public: check an invite link, or redeem it by creating the account (sign-ups stay off otherwise).
import { admin, cors, json } from '../_shared/common.ts';

const MESSAGES: Record<string, string> = {
  invite_invalid: 'This invite link is not valid.',
  invite_expired: 'This invite link has expired. Ask Robbe for a new one.',
  invite_used: 'This invite link has already been used.',
  invite_email: 'This invite is for a different email address.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { code, email, password, action } = await req.json();
    if (typeof code !== 'string' || code.length < 6 || code.length > 64) return json({ error: MESSAGES.invite_invalid }, 400);
    const db = admin();

    if (action === 'check') {
      const { data: inv } = await db.from('invites').select('email, free_days, max_uses, uses, expires_at, revoked').eq('code', code).maybeSingle();
      if (!inv || inv.revoked) return json({ valid: false, error: MESSAGES.invite_invalid });
      if (new Date(inv.expires_at) < new Date()) return json({ valid: false, error: MESSAGES.invite_expired });
      if (inv.uses >= inv.max_uses) return json({ valid: false, error: MESSAGES.invite_used });
      return json({ valid: true, email: inv.email, freeDays: inv.free_days });
    }

    const cleanEmail = String(email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) return json({ error: 'Enter a valid email address.' }, 400);
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) return json({ error: 'Use a password of at least 8 characters.' }, 400);

    const { data: inv, error: claimError } = await db.rpc('claim_invite', { _code: code, _email: cleanEmail });
    if (claimError) {
      const key = Object.keys(MESSAGES).find((k) => claimError.message.includes(k));
      return json({ error: key ? MESSAGES[key] : MESSAGES.invite_invalid }, 400);
    }

    const { data: created, error: userError } = await db.auth.admin.createUser({ email: cleanEmail, password, email_confirm: true });
    if (userError || !created.user) {
      await db.rpc('release_invite', { _id: inv.id });
      const exists = userError?.message?.toLowerCase().includes('already');
      return json({ error: exists ? 'There is already an account with this email. Sign in instead.' : 'Could not create the account. Try again.' }, 400);
    }

    const trialEnds = new Date(Date.now() + inv.free_days * 86400000).toISOString();
    const { error: memberError } = await db.from('memberships').insert({
      user_id: created.user.id, status: 'trial', trial_ends_at: trialEnds, invite_id: inv.id,
    });
    if (memberError) throw memberError;

    return json({ ok: true, trialEndsAt: trialEnds });
  } catch (e) {
    console.error(e);
    return json({ error: 'Something went wrong. Try again.' }, 500);
  }
});
