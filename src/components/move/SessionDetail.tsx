import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronDown, Play, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import EmomTimer from './EmomTimer';
import type { ActiveBlock } from '@/hooks/useActiveBlock';
import { toPlacement } from '@/lib/feed';
import { composeSession, placementsForSession, type Placement, type SessionItem } from '@/lib/session';
import { type LoggedSet, current1RM, loadIncrement, loadRange, weekTarget } from '@/lib/strength';
import type { FocusProfile } from '@/lib/prescription';

interface Props {
  block: ActiveBlock;
  code: string;
  title: string;
  day: string;
  date: string;
  completed: boolean;
  onBack: () => void;
  userId: string;
  weekNumber: number;
  deloadWeek: number;
  profile: FocusProfile & { session_minutes?: number; ask_when_longer?: boolean };
}

type SetInput = { weight: string; reps: string; rir: string; done: boolean };
const toNumber = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const youtubeId = (url: string | null | undefined) => url?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([^&\s?/]+)/)?.[1];

/** A session from a published block: automatic order, supersets, EMOM, 60-minute check, set logging. */
const SessionDetail = ({ block, code, title, day, date, completed, onBack, userId, weekNumber, deloadWeek, profile }: Props) => {
  const queryClient = useQueryClient();
  const [includeAll, setIncludeAll] = useState<boolean | null>(null);
  const [inputs, setInputs] = useState<Record<string, SetInput[]>>({});
  const [formError, setFormError] = useState('');
  const [showRir, setShowRir] = useState(false);

  const byCode = useMemo(() => {
    const map: Record<string, Placement[]> = {};
    for (const s of block.sessions) map[s.day_type] = block.rows.filter((r) => r.workout_block_id === s.id).map(toPlacement);
    return map;
  }, [block]);

  const limit = profile.session_minutes ?? 60;
  const composed = useMemo(
    () => composeSession(placementsForSession(code, byCode), profile, {
      weekInBlock: weekNumber,
      deloadWeek,
      sessionMinutes: limit,
      includeAllExtras: includeAll ?? false,
      powerIncluded: block.power_included,
    }),
    [code, byCode, profile, weekNumber, deloadWeek, limit, includeAll, block.power_included],
  );
  const askLonger = composed.overLimit && includeAll === null && (profile.ask_when_longer ?? true);

  const rowFor = (id: string) => block.rows.find((r) => r.id === id)!;
  const libraryIds = [...new Set(composed.items.map((i) => rowFor(i.placement.id).library?.id).filter(Boolean))] as string[];

  // History per library exercise, so weight estimates carry over from block to block.
  const { data: history } = useQuery({
    queryKey: ['library_sets', userId, libraryIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sets')
        .select('weight_kg, reps, rir, logged_at, completion_id, exercise:exercises!inner(library_id)')
        .eq('user_id', userId)
        .in('exercise.library_id', libraryIds)
        .order('logged_at', { ascending: false })
        .limit(400);
      if (error) throw error;
      const byLibrary: Record<string, LoggedSet[]> = {};
      for (const row of data as unknown as (LoggedSet & { exercise: { library_id: string } })[]) {
        (byLibrary[row.exercise.library_id] ??= []).push(row);
      }
      return byLibrary;
    },
    enabled: libraryIds.length > 0,
  });

  const isStrength = (i: SessionItem) => i.placement.quality === 'strength';
  const rangeFor = (i: SessionItem) => {
    if (!isStrength(i)) return null;
    const libId = rowFor(i.placement.id).library?.id;
    const oneRm = libId ? current1RM(history?.[libId] ?? []) : null;
    return oneRm ? loadRange(oneRm, i.prescription.reps, i.prescription.rir, loadIncrement(i.placement.pattern)) : null;
  };

  const setsFor = (i: SessionItem): SetInput[] => {
    const current = inputs[i.placement.id] ?? [];
    return Array.from({ length: i.prescription.sets }, (_, n) => current[n] ?? { weight: '', reps: '', rir: '', done: false });
  };
  const updateSet = (i: SessionItem, n: number, patch: Partial<SetInput>) => {
    const rows = setsFor(i);
    rows[n] = { ...rows[n], ...patch };
    setInputs((prev) => ({ ...prev, [i.placement.id]: rows }));
  };

  const sessionRowId = block.sessions.find((s) => s.day_type === code)?.id ?? block.rows.find((r) => r.id === composed.items[0]?.placement.id)?.workout_block_id;

  const complete = useMutation({
    mutationFn: async () => {
      const { data: completion, error } = await supabase
        .from('user_workout_completions')
        .insert({ user_id: userId, workout_block_id: sessionRowId!, week_number: weekNumber, day_date: date })
        .select('id')
        .single();
      if (error) throw error;
      const rows = Object.entries(inputs).flatMap(([exercise_id, sets]) =>
        sets
          .map((s, n) => ({ user_id: userId, completion_id: completion.id, exercise_id, set_number: n + 1, weight_kg: toNumber(s.weight), reps: toNumber(s.reps), rir: toNumber(s.rir) }))
          .filter((r) => r.weight_kg != null || r.reps != null || r.rir != null),
      );
      if (rows.length) {
        const { error: e2 } = await supabase.from('exercise_sets').insert(rows);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completions'] });
      queryClient.invalidateQueries({ queryKey: ['library_sets'] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const handleComplete = () => {
    for (const item of composed.items) {
      for (const s of inputs[item.placement.id] ?? []) {
        if ([s.weight, s.reps, s.rir].some((v) => v.trim() !== '' && !(Number(v.replace(',', '.')) >= 0))) {
          setFormError('Enter numbers only, e.g. 62.5 kg, 8 reps, RIR 2.');
          return;
        }
        if (isStrength(item) && (s.weight.trim() || s.reps.trim()) && !s.rir.trim()) {
          setFormError('Add your RIR to every strength set you logged: it is how the plan learns your weights.');
          return;
        }
      }
    }
    setFormError('');
    complete.mutate();
  };

  const target = weekTarget(weekNumber, deloadWeek);

  return (
    <div className="min-h-screen pt-14">
      <div className="container mx-auto max-w-2xl px-6 py-12">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to your week
        </button>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent">{code} · {day} · Week {weekNumber}</span>
        <h1 className="mt-1 font-serif text-3xl md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {target.isDeload ? 'Deload week: half the sets, no power, same quality.' : `Main lifts at ${target.label}.`} · ≈ {composed.estimatedMinutes} min
        </p>

        {askLonger && (
          <div className="mt-6 space-y-3 rounded-2xl bg-secondary p-4">
            <p className="text-[15px] font-semibold">This session takes about {composed.fullMinutes} minutes</p>
            <p className="text-sm text-muted-foreground">Your plan is set to {limit}. Skip the extras today, or do the full session?</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setIncludeAll(false)} className="h-11 rounded-xl bg-primary text-sm text-primary-foreground">Keep it to {limit}</button>
              <button onClick={() => setIncludeAll(true)} className="h-11 rounded-xl border border-border text-sm">Full session</button>
            </div>
          </div>
        )}

        <button onClick={() => setShowRir((v) => !v)} className="mt-6 flex w-full items-center justify-between rounded-xl bg-card px-4 py-3 text-left">
          <span className="text-[13px] font-medium">What is RIR?</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showRir ? 'rotate-180' : ''}`} strokeWidth={1.5} />
        </button>
        {showRir && (
          <div className="rounded-b-xl bg-card px-4 pb-4 text-[13px] leading-relaxed text-muted-foreground">
            Reps in reserve: how many more good reps you could have done. RIR 0 is failure, RIR 2 means two left. Sets count when they are hard,
            so after every set ask yourself honestly how many were left. Power work is never close to failure: stop while it's fast.
          </div>
        )}

        {composed.items.length === 0 && <p className="mt-8 text-sm text-muted-foreground">No exercises in this session yet.</p>}

        <div className="mt-6 space-y-4">
          {composed.items.map((item) => (
            <ItemCard
              key={item.placement.id}
              item={item}
              row={rowFor(item.placement.id)}
              names={block.names}
              range={rangeFor(item)}
              sets={completed ? null : setsFor(item)}
              onSetChange={(n, patch) => updateSet(item, n, patch)}
            />
          ))}
        </div>

        {composed.dropped.length > 0 && (
          <p className="mt-4 text-[13px] text-muted-foreground">Skipped today: {composed.dropped.map((d) => d.name).join(', ')}</p>
        )}

        {!completed ? (
          <div className="mt-10">
            {formError && <p className="mb-4 text-sm text-destructive">{formError}</p>}
            <button onClick={handleComplete} disabled={complete.isPending || !sessionRowId} className="w-full rounded-lg bg-primary px-8 py-[14px] text-[13px] font-medium uppercase tracking-[0.08em] text-primary-foreground disabled:opacity-40">
              {complete.isPending ? '...' : 'Complete session'}
            </button>
          </div>
        ) : (
          <div className="mt-10 flex items-center justify-center gap-2 py-4 text-accent">
            <Check className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-[12px] font-medium uppercase tracking-[0.08em]">Session completed</span>
          </div>
        )}
      </div>
    </div>
  );
};

const RIR_OPTIONS = ['0', '1', '2', '3', '4', '5'];
const unitText = (unit: string, reps: string) => (unit === 'seconds' ? `${reps} s` : unit === 'per_side' ? `${reps}/side` : reps);

const ItemCard = ({ item, row, names, range, sets, onSetChange }: {
  item: SessionItem;
  row: ActiveBlock['rows'][number];
  names: Record<string, string>;
  range: { low: number; high: number } | null;
  sets: SetInput[] | null;
  onSetChange: (n: number, patch: Partial<SetInput>) => void;
}) => {
  const [video, setVideo] = useState(false);
  const [timer, setTimer] = useState(false);
  const p = item.placement;
  const lib = row.library;
  const vid = youtubeId(lib?.video_url);
  const easier = lib?.regression_id ? names[lib.regression_id] : null;
  const strength = p.quality === 'strength';
  const power = p.quality === 'power';

  return (
    <div className={`rounded-xl border bg-card p-5 ${item.optional ? 'border-dashed border-foreground/30' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-base font-medium"><span className="mr-1.5 font-serif text-accent">{item.label}</span>{p.name}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {item.prescription.sets} × {unitText(p.unit, item.prescription.reps)}
            {strength ? ` · ${item.prescription.rirLabel}` : power ? ' · fast and crisp' : ''}
            {item.optional ? ' · optional' : ''}
          </p>
          {lib?.cues?.length ? <p className="mt-1 text-[12px] italic text-muted-foreground/80">{lib.cues.join(' · ')}</p> : null}
          {easier && <p className="mt-1 text-[12px] text-muted-foreground">Too hard? {easier}</p>}
        </div>
        <div className="flex gap-2">
          {vid && (
            <button aria-label="Show demo video" onClick={() => setVideo((v) => !v)} className="rounded-md border border-border p-2 hover:border-foreground/30">
              <Play className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          )}
          {p.emom_interval_sec && (
            <button aria-label="EMOM timer" onClick={() => setTimer((v) => !v)} className={`rounded-md border p-2 ${timer ? 'border-accent bg-accent/10' : 'border-border hover:border-foreground/30'}`}>
              <Timer className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {video && vid && (
        <div className="mt-4 aspect-video">
          <iframe title={`${p.name} demo`} src={`https://www.youtube-nocookie.com/embed/${vid}`} className="h-full w-full rounded-md" allowFullScreen allow="encrypted-media; picture-in-picture" />
        </div>
      )}
      {timer && p.emom_interval_sec && <EmomTimer intervalSec={p.emom_interval_sec} rounds={item.prescription.sets} />}

      {range && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary px-4 py-2.5">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Your range today</span>
          <span className="text-base font-semibold">{range.low === range.high ? range.low : `${range.low} – ${range.high}`} kg</span>
        </div>
      )}

      {sets && (strength || power) && (
        <div className="mt-4">
          <div className={`grid gap-2 px-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground ${strength ? 'grid-cols-[32px_1fr_1fr_1fr]' : 'grid-cols-[32px_1fr_1fr]'}`}>
            <span>Set</span><span>kg</span><span>{p.unit === 'seconds' ? 'Sec' : 'Reps'}</span>{strength && <span>RIR</span>}
          </div>
          <div className="mt-1.5 space-y-1.5">
            {sets.map((s, n) => (
              <div key={n} className={`grid items-center gap-2 ${strength ? 'grid-cols-[32px_1fr_1fr_1fr]' : 'grid-cols-[32px_1fr_1fr]'}`}>
                <span className="pl-1 text-sm text-muted-foreground">{n + 1}</span>
                <input aria-label={`Set ${n + 1} weight in kg`} inputMode="decimal" value={s.weight} onChange={(e) => onSetChange(n, { weight: e.target.value })} placeholder={range ? String(range.low) : 'kg'} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground/40" />
                <input aria-label={`Set ${n + 1} reps`} inputMode="numeric" value={s.reps} onChange={(e) => onSetChange(n, { reps: e.target.value })} placeholder="reps" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground/40" />
                {strength && (
                  <select aria-label={`Set ${n + 1} reps in reserve`} value={s.rir} onChange={(e) => onSetChange(n, { rir: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm">
                    <option value="">–</option>
                    {RIR_OPTIONS.map((r) => <option key={r} value={r}>{r === '5' ? '5+' : r}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {sets && p.quality === 'mobility' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {sets.map((s, n) => (
            <button key={n} onClick={() => onSetChange(n, { done: !s.done })} aria-pressed={s.done} className={`h-10 rounded-full px-4 text-[13px] ${s.done ? 'bg-accent text-accent-foreground' : 'border border-border'}`}>
              {s.done ? '✓ ' : ''}Set {n + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionDetail;
