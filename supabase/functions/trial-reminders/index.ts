// Daily job: remind trial members 7 days and 1 day before their free days end.
// Called by pg_cron with the CRON_SECRET header; does nothing until Brevo is set up.
import { APP_URL, admin, json, mailLayout, sendMail } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (!Deno.env.get('CRON_SECRET') || req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return json({ error: 'forbidden' }, 403);
  }
  const db = admin();
  const now = Date.now();
  const { data: trials } = await db.from('memberships').select('user_id, trial_ends_at, reminded_7_at, reminded_1_at')
    .eq('status', 'trial').gt('trial_ends_at', new Date(now).toISOString());
  let sent = 0;
  for (const m of trials ?? []) {
    const daysLeft = (new Date(m.trial_ends_at).getTime() - now) / 86400000;
    const which = daysLeft <= 1.5 && !m.reminded_1_at ? 1 : daysLeft <= 7.5 && !m.reminded_7_at ? 7 : null;
    if (!which) continue;
    const { data: u } = await db.auth.admin.getUserById(m.user_id);
    if (!u.user?.email) continue;
    const ok = await sendMail(
      u.user.email,
      which === 7 ? 'One more week of free training' : 'Your free days end tomorrow',
      mailLayout(
        which === 7 ? 'One more week.' : 'Tomorrow.',
        `<p>${which === 7 ? 'Your free days end in a week.' : 'Your free days end tomorrow.'} Keep your plan, your progress and the chain going by starting your membership.</p>
         <p>Subscribe now and you still keep the free days you have left.</p><p>Robbe</p>`,
        { label: 'Keep training', url: `${APP_URL}/membership` },
      ),
    );
    if (!ok) break;
    await db.from('memberships').update(which === 7 ? { reminded_7_at: new Date().toISOString() } : { reminded_1_at: new Date().toISOString() }).eq('user_id', m.user_id);
    sent++;
  }
  return json({ sent });
});
