import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import FeedLayout from './FeedLayout';

interface Visit {
  user_id: string | null;
  path: string;
  referrer: string | null;
  device: string | null;
  standalone: boolean;
  created_at: string;
}

const RANGES = [7, 30, 90] as const;

/** Visits in Robbe's Feed: page views, unique members, top pages, where people come from. */
const FeedVisits = () => {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const since = startOfDay(subDays(new Date(), days - 1));

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['app_visits', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_visits')
        .select('user_id, path, referrer, device, standalone, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(10000);
      if (error) throw error;
      return data as Visit[];
    },
  });

  const stats = useMemo(() => {
    const members = new Set(visits.filter((v) => v.user_id).map((v) => v.user_id));
    const byDay = new Map<string, { views: number; members: Set<string> }>();
    for (let i = days - 1; i >= 0; i--) byDay.set(format(subDays(new Date(), i), 'yyyy-MM-dd'), { views: 0, members: new Set() });
    const pages = new Map<string, number>();
    const refs = new Map<string, number>();
    for (const v of visits) {
      const d = byDay.get(format(new Date(v.created_at), 'yyyy-MM-dd'));
      if (d) {
        d.views++;
        if (v.user_id) d.members.add(v.user_id);
      }
      pages.set(v.path, (pages.get(v.path) ?? 0) + 1);
      if (v.referrer) refs.set(v.referrer, (refs.get(v.referrer) ?? 0) + 1);
    }
    const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return {
      views: visits.length,
      members: members.size,
      anonymous: visits.filter((v) => !v.user_id).length,
      mobile: visits.length ? Math.round((visits.filter((v) => v.device === 'mobile').length / visits.length) * 100) : 0,
      installed: visits.filter((v) => v.standalone).length,
      days: [...byDay.entries()],
      pages: top(pages),
      refs: top(refs),
    };
  }, [visits, days]);

  const maxViews = Math.max(1, ...stats.days.map(([, d]) => d.views));
  const tile = 'rounded-xl border border-border bg-card p-4';
  const label = 'text-[11px] tracking-[0.08em] uppercase text-muted-foreground';

  return (
    <FeedLayout>
      <h1 className="mb-6 mt-1 font-serif text-4xl italic">Visits</h1>
      <div className="mb-6 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setDays(r)}
            className={`rounded-lg border px-3 py-2 text-[12px] tracking-[0.06em] uppercase ${days === r ? 'border-foreground text-foreground' : 'border-border text-muted-foreground'}`}
          >
            {r} days
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className={tile}><p className={label}>Page views</p><p className="mt-1 text-2xl">{stats.views}</p></div>
            <div className={tile}><p className={label}>Members active</p><p className="mt-1 text-2xl">{stats.members}</p></div>
            <div className={tile}><p className={label}>Not signed in</p><p className="mt-1 text-2xl">{stats.anonymous}</p></div>
            <div className={tile}><p className={label}>On mobile</p><p className="mt-1 text-2xl">{stats.mobile}%</p><p className="text-[11px] text-muted-foreground">{stats.installed} views from the installed app</p></div>
          </div>

          <div className={tile}>
            <p className={label}>Per day · bar = page views, number = members</p>
            <div className="mt-4 flex h-32 items-end gap-[2px]">
              {stats.days.map(([day, d]) => (
                <div key={day} className="group relative flex flex-1 flex-col items-center justify-end" title={`${format(new Date(day), 'd MMM')}: ${d.views} views, ${d.members.size} members`}>
                  <div className="w-full rounded-t-sm bg-foreground/70" style={{ height: `${(d.views / maxViews) * 100}%`, minHeight: d.views ? 2 : 0 }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{format(since, 'd MMM')}</span>
              <span>today</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className={tile}>
              <p className={label}>Top pages</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {stats.pages.map(([p, n]) => (
                  <li key={p} className="flex justify-between gap-3"><span className="truncate">{p}</span><span className="text-muted-foreground">{n}</span></li>
                ))}
                {!stats.pages.length && <li className="text-muted-foreground">No visits yet.</li>}
              </ul>
            </div>
            <div className={tile}>
              <p className={label}>Coming from</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {stats.refs.map(([r, n]) => (
                  <li key={r} className="flex justify-between gap-3"><span className="truncate">{r}</span><span className="text-muted-foreground">{n}</span></li>
                ))}
                {!stats.refs.length && <li className="text-muted-foreground">Direct visits only so far.</li>}
              </ul>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Counted in the app itself: no cookies, no IP addresses, no third parties. Your own Feed pages are not counted.</p>
        </div>
      )}
    </FeedLayout>
  );
};

export default FeedVisits;
