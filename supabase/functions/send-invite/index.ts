// Admin: email an invite link through Brevo.
import { APP_URL, admin, cors, json, mailLayout, sendMail, userFrom } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const user = await userFrom(req);
    if (!user) return json({ error: 'Sign in first.' }, 401);
    const db = admin();
    const { data: isAdmin } = await db.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Not allowed.' }, 403);

    const { inviteId, email: overrideEmail } = await req.json();
    const { data: inv } = await db.from('invites').select('*').eq('id', inviteId).maybeSingle();
    if (!inv) return json({ error: 'Invite not found.' }, 404);
    const to = (inv.email ?? overrideEmail ?? '').trim();
    if (!to) return json({ error: 'This invite has no email address.' }, 400);

    const url = `${APP_URL}/invite/${inv.code}`;
    const sent = await sendMail(
      to,
      `You're invited to Minimum Fitness — ${inv.free_days} days free`,
      mailLayout(
        "You're in.",
        `<p>I'd like you to try Minimum Fitness: your training plan, built on my method and adapted to you every week.</p>
         <p>Your first <b>${inv.free_days} days are free</b>. No card needed.</p>
         <p>Robbe</p>`,
        { label: 'Activate my account', url },
      ),
    );
    if (!sent) return json({ error: 'Email is not set up yet. Copy the link and send it yourself.' }, 503);
    await db.from('invites').update({ sent_at: new Date().toISOString() }).eq('id', inv.id);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'Could not send the email.' }, 500);
  }
});
