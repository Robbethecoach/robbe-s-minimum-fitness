// Shared helpers for the Minimum Fitness edge functions.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.robbethecoach.com';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** Service-role client: bypasses RLS, only ever used server side. */
export const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** The signed-in user behind the request's Authorization header, or null. */
export const userFrom = async (req: Request) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data } = await admin().auth.getUser(token);
  return data.user ?? null;
};

/** Flatten nested params into Stripe's form encoding: a[b][0][c]=v. */
const encode = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) => {
    if (v === undefined || v === null) return [];
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) return v.flatMap((item, i) => (typeof item === 'object' ? encode(item as Record<string, unknown>, `${key}[${i}]`) : [`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`]));
    if (typeof v === 'object') return encode(v as Record<string, unknown>, key);
    return [`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`];
  });

export const stripe = async (path: string, params?: Record<string, unknown>, method = 'POST') => {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('stripe_not_configured');
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : encode(params ?? {}).join('&'),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? `stripe_${res.status}`);
  return body;
};

/** Transactional email through Brevo. Returns false when Brevo isn't set up yet. */
export const sendMail = async (to: string, subject: string, html: string) => {
  const key = Deno.env.get('BREVO_API_KEY');
  if (!key) return false;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Robbe — robbethecoach', email: Deno.env.get('MAIL_FROM') ?? 'robbe@robbethecoach.com' },
      replyTo: { email: Deno.env.get('MAIL_REPLY_TO') ?? 'robbe@zweet.club' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`brevo_${res.status}: ${await res.text()}`);
  return true;
};

/** Plain, on-brand email layout. */
export const mailLayout = (title: string, body: string, cta?: { label: string; url: string }) => `
<div style="background:#f3eee8;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#1f1d1a">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
    <p style="font-family:Georgia,serif;font-style:italic;font-size:20px;margin:0 0 24px">robbethecoach</p>
    <h1 style="font-family:Georgia,serif;font-style:italic;font-weight:normal;font-size:28px;margin:0 0 16px">${title}</h1>
    <div style="font-size:15px;line-height:1.6">${body}</div>
    ${cta ? `<p style="margin:28px 0 8px"><a href="${cta.url}" style="background:#1f1d1a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;display:inline-block">${cta.label}</a></p>` : ''}
    <p style="font-size:12px;color:#7a746c;margin-top:32px">Minimum Fitness — robbethecoach · Gent</p>
  </div>
</div>`;
