import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import FeedLayout from './FeedLayout';
import { useTiming } from '@/hooks/useMethodSettings';
import { DEFAULT_TIMING, type Quality, type Role, type Timing } from '@/lib/session';

const QUALITIES: { value: Quality; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'power', label: 'Power' },
  { value: 'mobility', label: 'Mobility' },
];
const ROLES: { value: Role; label: string }[] = [
  { value: 'main', label: 'Main' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'extra', label: 'Extra' },
];

const toMmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const fromMmss = (v: string): number | null => {
  const m = v.trim().match(/^(\d+):(\d{2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = v.trim().match(/^\d+$/);
  return n ? Number(v) : null;
};

/** Robbe's own numbers for the session-length estimate. */
const FeedSettings = () => {
  const queryClient = useQueryClient();
  const { data: timing } = useTiming();
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!timing) return;
    const d: Record<string, string> = { secondsPerRep: String(timing.secondsPerRep), warmUpMinutes: String(timing.warmUpMinutes) };
    for (const q of QUALITIES) for (const r of ROLES) d[`${q.value}.${r.value}`] = toMmss(timing.rest[q.value][r.value]);
    setDraft(d);
  }, [timing]);

  const save = useMutation({
    mutationFn: async () => {
      const rest = {} as Timing['rest'];
      for (const q of QUALITIES) {
        rest[q.value] = {} as Record<Role, number>;
        for (const r of ROLES) {
          const v = fromMmss(draft[`${q.value}.${r.value}`] ?? '');
          if (v == null || v > 900) throw new Error(`${q.label} · ${r.label}: write the rest as 1:30.`);
          rest[q.value][r.value] = v;
        }
      }
      const secondsPerRep = Number(draft.secondsPerRep);
      const warmUpMinutes = Number(draft.warmUpMinutes);
      if (!(secondsPerRep > 0 && secondsPerRep <= 15)) throw new Error('Seconds per rep: a number between 1 and 15.');
      if (!(warmUpMinutes >= 0 && warmUpMinutes <= 30)) throw new Error('Warm-up: a number of minutes between 0 and 30.');
      const value: Timing = { rest, secondsPerRep, warmUpMinutes };
      const { error } = await supabase.from('method_settings').upsert({ key: 'timing', value: value as unknown as never });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Saved. Durations update everywhere.');
      queryClient.invalidateQueries({ queryKey: ['method_settings'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = 'h-10 w-24 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground/40';

  return (
    <FeedLayout>
      <div className="max-w-2xl space-y-8">
        <div>
          <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">Settings</p>
          <h1 className="mt-1 font-serif text-4xl italic">Session timing</h1>
          <p className="mt-2 text-sm text-muted-foreground">Used to estimate how long a session takes, and when members get the "longer than your limit" question.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="pb-2 pr-6 font-medium">Rest between sets</th>
                {ROLES.map((r) => <th key={r.value} className="pb-2 pr-4 font-medium">{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {QUALITIES.map((q) => (
                <tr key={q.value}>
                  <td className="py-1.5 pr-6">{q.label}</td>
                  {ROLES.map((r) => (
                    <td key={r.value} className="py-1.5 pr-4">
                      <input aria-label={`${q.label} ${r.label} rest`} value={draft[`${q.value}.${r.value}`] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [`${q.value}.${r.value}`]: e.target.value }))} className={field} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="space-y-1.5 text-sm">Seconds per rep
            <input value={draft.secondsPerRep ?? ''} onChange={(e) => setDraft((d) => ({ ...d, secondsPerRep: e.target.value }))} className={`${field} block`} />
          </label>
          <label className="space-y-1.5 text-sm">Warm-up (minutes)
            <input value={draft.warmUpMinutes ?? ''} onChange={(e) => setDraft((d) => ({ ...d, warmUpMinutes: e.target.value }))} className={`${field} block`} />
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={() => save.mutate()} disabled={save.isPending} className="h-12 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-40">Save</button>
          <button
            onClick={() => {
              const d: Record<string, string> = { secondsPerRep: String(DEFAULT_TIMING.secondsPerRep), warmUpMinutes: String(DEFAULT_TIMING.warmUpMinutes) };
              for (const q of QUALITIES) for (const r of ROLES) d[`${q.value}.${r.value}`] = toMmss(DEFAULT_TIMING.rest[q.value][r.value]);
              setDraft(d);
            }}
            className="h-12 rounded-xl border border-border px-6 text-sm"
          >
            Back to defaults
          </button>
        </div>
      </div>
    </FeedLayout>
  );
};

export default FeedSettings;
