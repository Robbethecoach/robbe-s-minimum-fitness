import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, Copy, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { callFunction } from '@/lib/functions';
import { DEFAULT_FREE_DAYS } from '@/lib/membership';
import FeedLayout from './FeedLayout';

interface InviteRow {
  id: string;
  code: string;
  email: string | null;
  note: string | null;
  free_days: number;
  max_uses: number;
  uses: number;
  expires_at: string;
  revoked: boolean;
  sent_at: string | null;
  created_at: string;
}

interface MemberRow {
  user_id: string;
  status: string;
  trial_ends_at: string | null;
  invite_id: string | null;
}

const linkFor = (code: string) => `${window.location.origin}/invite/${code}`;

const statusOf = (i: InviteRow) =>
  i.revoked ? 'Revoked'
  : i.uses >= i.max_uses ? (i.max_uses === 1 ? 'Used' : 'Full')
  : new Date(i.expires_at) < new Date() ? 'Expired'
  : i.max_uses > 1 ? `${i.uses}/${i.max_uses} used` : 'Open';

/** Feed › Invites: make a link (personal or for a group), copy it or email it. */
const FeedInvites = () => {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [freeDays, setFreeDays] = useState(String(DEFAULT_FREE_DAYS));
  const [group, setGroup] = useState(false);
  const [maxUses, setMaxUses] = useState('10');
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data: invites = [] } = useQuery({
    queryKey: ['invites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invites').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data as InviteRow[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['memberships-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('memberships').select('user_id, status, trial_ends_at, invite_id');
      if (error) throw error;
      return data as MemberRow[];
    },
  });

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(linkFor(code));
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const create = useMutation({
    mutationFn: async () => {
      const days = Number(freeDays);
      if (!Number.isInteger(days) || days < 0 || days > 365) throw new Error('Free days: a whole number between 0 and 365.');
      const uses = group ? Number(maxUses) : 1;
      if (!Number.isInteger(uses) || uses < 1 || uses > 1000) throw new Error('Number of people: between 1 and 1000.');
      const cleanEmail = group ? null : email.trim().toLowerCase() || null;
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('That email address doesn’t look right.');
      const { data, error } = await supabase
        .from('invites')
        .insert({ email: cleanEmail, note: note.trim() || null, free_days: days, max_uses: uses })
        .select()
        .single();
      if (error) throw error;
      return data as InviteRow;
    },
    onSuccess: async (inv) => {
      setEmail('');
      setNote('');
      setError('');
      await copy(inv.code);
      setMessage('Link created and copied.');
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
    onError: (e: Error) => { setError(e.message); setMessage(''); },
  });

  const send = useMutation({
    mutationFn: (inv: InviteRow) => callFunction('send-invite', { inviteId: inv.id }),
    onSuccess: () => { setMessage('Email sent.'); setError(''); queryClient.invalidateQueries({ queryKey: ['invites'] }); },
    onError: (e: Error) => { setError(e.message); setMessage(''); },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invites').update({ revoked: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invites'] }),
  });

  const counts = {
    trial: members.filter((m) => m.status === 'trial' && m.trial_ends_at && new Date(m.trial_ends_at) > new Date()).length,
    paying: members.filter((m) => m.status === 'active' || m.status === 'past_due').length,
  };

  const input = 'mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground/40';
  const label = 'text-[11px] tracking-[0.06em] uppercase text-muted-foreground';
  const tile = 'rounded-xl border border-border bg-card p-4';

  return (
    <FeedLayout>
      <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Members</p>
      <h1 className="mb-6 mt-1 font-serif text-4xl italic">Invites</h1>

      <div className="mb-8 grid max-w-xl grid-cols-2 gap-3">
        <div className={tile}><p className={label}>In free days</p><p className="mt-1 text-2xl">{counts.trial}</p></div>
        <div className={tile}><p className={label}>Paying</p><p className="mt-1 text-2xl">{counts.paying}</p></div>
      </div>

      <section className={`${tile} mb-10 max-w-xl p-5`}>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {[false, true].map((g) => (
            <button key={String(g)} onClick={() => setGroup(g)}
              className={`rounded-lg border px-3 py-2.5 text-[12px] tracking-[0.06em] uppercase ${group === g ? 'border-foreground text-foreground' : 'border-border text-muted-foreground'}`}>
              {g ? 'Group link' : 'One person'}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {!group ? (
            <label className={`${label} sm:col-span-2`}>Email (optional: locks the link to this person)
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="name@example.com" />
            </label>
          ) : (
            <label className={label}>Number of people
              <input inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={input} />
            </label>
          )}
          <label className={label}>Free days
            <input inputMode="numeric" value={freeDays} onChange={(e) => setFreeDays(e.target.value)} className={input} />
          </label>
          <label className={`${label} ${group ? '' : 'sm:col-span-1'}`}>Note (only you see it)
            <input value={note} onChange={(e) => setNote(e.target.value)} className={input} placeholder={group ? 'Zweet Club December' : 'Sarah, from the studio'} />
          </label>
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">The link works for 30 days. No card needed during the free days.</p>
        <button onClick={() => create.mutate()} disabled={create.isPending}
          className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-[12px] font-medium tracking-[0.08em] uppercase text-primary-foreground disabled:opacity-40">
          {create.isPending ? '...' : 'Create link'}
        </button>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </section>

      <div className="max-w-3xl divide-y divide-border rounded-xl border border-border">
        {invites.length === 0 && <p className="p-5 text-sm text-muted-foreground">No invites yet.</p>}
        {invites.map((i) => {
          const status = statusOf(i);
          const open = status === 'Open' || status.includes('/');
          return (
            <div key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{i.email ?? (i.max_uses > 1 ? `Group · ${i.max_uses} people` : 'Anyone with the link')}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {i.note ? `${i.note} · ` : ''}{i.free_days} days free · made {format(new Date(i.created_at), 'd MMM')}{i.sent_at ? ` · emailed ${format(new Date(i.sent_at), 'd MMM')}` : ''}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.06em] ${open ? 'bg-accent/15 text-foreground' : 'bg-muted text-muted-foreground'}`}>{status}</span>
              {open && (
                <div className="flex items-center gap-1">
                  <button onClick={() => copy(i.code)} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.06em]">
                    {copied === i.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied === i.code ? 'Copied' : 'Copy link'}
                  </button>
                  {i.email && (
                    <button onClick={() => send.mutate(i)} disabled={send.isPending} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.06em] disabled:opacity-40">
                      <Mail className="h-3.5 w-3.5" />{i.sent_at ? 'Resend' : 'Email'}
                    </button>
                  )}
                  <button onClick={() => revoke.mutate(i.id)} className="rounded-md px-2.5 py-1.5 text-[11px] uppercase tracking-[0.06em] text-muted-foreground hover:text-destructive">Revoke</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </FeedLayout>
  );
};

export default FeedInvites;
