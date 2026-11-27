import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useActiveBlock, type ActiveBlock } from '@/hooks/useActiveBlock';
import { supabase } from '@/integrations/supabase/client';
import { planWeek } from '@/lib/allocation';
import { toPlacement } from '@/lib/feed';
import { focusLabel, orderKey, roleLabel, type Placement } from '@/lib/session';

type Row = ActiveBlock['rows'][number];

const youtubeId = (url: string | null | undefined) => url?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([^&\s?/]+)/)?.[1];

/** Which session codes put this exercise in the member's week (U1/U2/L come from A/B). */
const sessionsUsing = (codes: string[], dayType: string, p: Placement) => {
  const lowerish = p.region === 'lower' || p.region === 'core';
  return codes.filter((c) =>
    c === dayType ||
    (c === 'U1' && dayType === 'A' && !lowerish) ||
    (c === 'U2' && dayType === 'B' && !lowerish) ||
    (c === 'L' && (dayType === 'A' || dayType === 'B') && lowerish) ||
    (c === 'D' && dayType === 'C'),
  );
};

/** Start of every block: all strength, power and mobility exercises for the next 4 weeks. */
const BlockOverview = () => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: block, isLoading } = useActiveBlock();
  const queryClient = useQueryClient();

  const { data: watched = [] } = useQuery({
    queryKey: ['exercise_views', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercise_views').select('library_id').eq('user_id', user!.id);
      if (error) throw error;
      return data.map((d) => d.library_id);
    },
    enabled: !!user,
  });

  const toggleWatched = useMutation({
    mutationFn: async ({ libraryId, on }: { libraryId: string; on: boolean }) => {
      const { error } = on
        ? await supabase.from('exercise_views').insert({ user_id: user!.id, library_id: libraryId })
        : await supabase.from('exercise_views').delete().eq('user_id', user!.id).eq('library_id', libraryId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercise_views'] }),
  });

  const groups = useMemo(() => {
    if (!block || !profile) return [];
    const days = (profile.preferred_days as string[]) ?? [];
    const codes = planWeek(
      { scores: { strength: profile.focus_strength, mobility: profile.focus_mobility, conditioning: profile.focus_conditioning }, days: days.length },
      days,
    )
      .map((d) => d.session)
      .filter((s): s is NonNullable<typeof s> => !!s);

    const seen = new Map<string, { row: Row; p: Placement; codes: Set<string> }>();
    for (const row of block.rows) {
      if (!row.library) continue;
      const p = toPlacement(row);
      if (p.quality === 'power' && !block.power_included) continue;
      const dayType = block.sessions.find((s) => s.id === row.workout_block_id)?.day_type ?? '';
      const using = sessionsUsing(codes, dayType, p);
      if (using.length === 0) continue;
      const entry = seen.get(row.library.id) ?? { row, p, codes: new Set<string>() };
      using.forEach((c) => entry.codes.add(c));
      seen.set(row.library.id, entry);
    }
    const byGroup = new Map<string, { row: Row; p: Placement; codes: Set<string> }[]>();
    [...seen.values()]
      .sort((a, b) => orderKey(a.p) - orderKey(b.p))
      .forEach((e) => {
        const key = e.p.quality === 'power' ? 'Power · before strength' : focusLabel(e.p);
        byGroup.set(key, [...(byGroup.get(key) ?? []), e]);
      });
    return [...byGroup.entries()];
  }, [block, profile]);

  const total = groups.reduce((n, [, list]) => n + list.length, 0);
  const watchedCount = groups.reduce((n, [, list]) => n + list.filter((e) => watched.includes(e.row.library!.id)).length, 0);

  return (
    <div className="min-h-screen pt-14">
      <div className="container mx-auto max-w-2xl px-6 py-12">
        <Link to="/move" className="mb-6 inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Move
        </Link>
        <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">{block ? `Block ${block.block_number}` : 'Block overview'}</p>
        <h1 className="mt-1 font-serif text-4xl italic">Your next 4 weeks</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          These are the strength, power and mobility exercises you'll do this block. Get familiar with them before you enter the gym.
        </p>

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !block && <p className="mt-8 text-sm text-muted-foreground">Your first block isn't published yet. You'll find it here as soon as it is.</p>}

        {total > 0 && (
          <div className="mt-6 flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm">
            <span>Watched</span>
            <span className="font-semibold">{watchedCount} of {total}</span>
          </div>
        )}

        <div className="mt-8 space-y-10">
          {groups.map(([label, list]) => (
            <section key={label} className="space-y-3">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">{label}</h2>
              {list.map((e) => (
                <OverviewCard
                  key={e.row.library!.id}
                  row={e.row}
                  p={e.p}
                  codes={[...e.codes]}
                  names={block?.names ?? {}}
                  watched={watched.includes(e.row.library!.id)}
                  onToggle={(on) => toggleWatched.mutate({ libraryId: e.row.library!.id, on })}
                />
              ))}
            </section>
          ))}
        </div>

        <Link to="/move" className="mt-12 flex h-[52px] items-center justify-center rounded-xl bg-primary text-[13px] font-medium uppercase tracking-[0.08em] text-primary-foreground">
          To my week
        </Link>
        <p className="mt-3 text-center text-[12px] text-muted-foreground">This overview stays in Move for the whole block.</p>
      </div>
    </div>
  );
};

const OverviewCard = ({ row, p, codes, names, watched, onToggle }: { row: Row; p: Placement; codes: string[]; names: Record<string, string>; watched: boolean; onToggle: (on: boolean) => void }) => {
  const [playing, setPlaying] = useState(false);
  const lib = row.library!;
  const vid = youtubeId(lib.video_url);
  const easier = lib.regression_id ? names[lib.regression_id] : null;
  const harder = lib.progression_id ? names[lib.progression_id] : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      {vid && (playing ? (
        <div className="aspect-video">
          <iframe title={`${lib.name} demo`} src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1`} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <button onClick={() => setPlaying(true)} aria-label={`Play ${lib.name} demo`} className="relative block aspect-video w-full bg-foreground">
          <img src={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-80" loading="lazy" />
          <span className="absolute inset-0 flex items-center justify-center"><Play className="h-10 w-10 text-background" strokeWidth={1.2} /></span>
        </button>
      ))}
      <div className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[17px] font-semibold">{lib.name}</h3>
          <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{roleLabel(p.role)} · {codes.join(', ')}</span>
        </div>
        {lib.cues.length > 0 && (
          <ul className="space-y-0.5 text-[14px] text-muted-foreground">
            {lib.cues.map((c, i) => <li key={i}>· {c}</li>)}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-[13px]">
          <span className="text-muted-foreground">
            {easier && <>Too hard? <b className="text-foreground">{easier}</b></>}
            {easier && harder && ' · '}
            {harder && <>Ready for more? <b className="text-foreground">{harder}</b></>}
          </span>
          <button onClick={() => onToggle(!watched)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ${watched ? 'bg-accent text-accent-foreground' : 'border border-border'}`}>
            {watched && <Check className="h-3.5 w-3.5" strokeWidth={2} />} {watched ? 'Watched' : 'Mark as watched'}
          </button>
        </div>
      </div>
    </article>
  );
};

export default BlockOverview;
