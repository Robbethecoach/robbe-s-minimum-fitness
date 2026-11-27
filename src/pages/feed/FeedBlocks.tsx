import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, nextMonday } from 'date-fns';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import FeedLayout from './FeedLayout';
import { PREVIEW_PROFILES, type LibraryRow, type PlacementRow, formatEmom, formatSetsReps, parseEmom, parseSetsReps, toPlacement } from '@/lib/feed';
import { composeSession, placementsForSession, type Placement } from '@/lib/session';
import { SESSION_NAMES, STRENGTH_SESSIONS, planWeek } from '@/lib/allocation';

const SESSIONS = [
  { code: 'A', name: 'Push' },
  { code: 'B', name: 'Pull' },
  { code: 'C', name: 'Mobility' },
  { code: 'D', name: 'Mobility' },
];

interface TrainingBlock {
  id: string;
  block_number: number;
  starts_on: string;
  power_included: boolean;
  status: string;
}

interface SessionRow {
  id: string;
  day_type: string;
}

const inputClass = 'h-9 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:outline-none focus:border-foreground/40';
const BALANCED = { focus_strength: 3, focus_mobility: 3, focus_conditioning: 3 };

const FeedBlocks = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: blocks = [] } = useQuery({
    queryKey: ['training_blocks_admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('training_blocks').select('*').order('block_number', { ascending: false });
      if (error) throw error;
      return data as TrainingBlock[];
    },
  });

  const block = blocks.find((b) => b.id === selectedId) ?? blocks[0] ?? null;

  const { data: library = [] } = useQuery({
    queryKey: ['exercise_library'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercise_library').select('*').order('name');
      if (error) throw error;
      return data as (LibraryRow & { video_url: string | null; cues: string[] })[];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['block_sessions', block?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('workout_blocks').select('id, day_type').eq('training_block_id', block!.id);
      if (error) throw error;
      return data as SessionRow[];
    },
    enabled: !!block,
  });

  const sessionIds = sessions.map((s) => s.id);
  const { data: rows = [] } = useQuery({
    queryKey: ['block_exercises', sessionIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, workout_block_id, name, sets, reps, role, emom_interval_sec, superset_with, order_index, library:exercise_library(*)')
        .in('workout_block_id', sessionIds)
        .order('order_index');
      if (error) throw error;
      return data as unknown as (PlacementRow & { workout_block_id: string })[];
    },
    enabled: sessionIds.length > 0,
  });

  const byCode = useMemo(() => {
    const map: Record<string, Placement[]> = {};
    for (const s of sessions) map[s.day_type] = rows.filter((r) => r.workout_block_id === s.id).map(toPlacement);
    return map;
  }, [sessions, rows]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['training_blocks_admin'] });
    queryClient.invalidateQueries({ queryKey: ['block_sessions'] });
    queryClient.invalidateQueries({ queryKey: ['block_exercises'] });
  };

  const createBlock = useMutation({
    mutationFn: async () => {
      const last = blocks[0];
      const starts = last ? addDays(new Date(last.starts_on), 28) : nextMonday(new Date());
      const { data, error } = await supabase
        .from('training_blocks')
        .insert({ block_number: (last?.block_number ?? 0) + 1, starts_on: format(starts, 'yyyy-MM-dd') })
        .select('id')
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase.from('workout_blocks').insert(
        SESSIONS.map((s) => ({ training_block_id: data.id, day_type: s.code, workout_name: s.name, week_number: 1 })),
      );
      if (e2) throw e2;
      return data.id as string;
    },
    onSuccess: (id) => {
      setSelectedId(id);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBlock = useMutation({
    mutationFn: async (patch: Partial<TrainingBlock>) => {
      const { error } = await supabase.from('training_blocks').update(patch).eq('id', block!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const addExercise = useMutation({
    mutationFn: async ({ sessionId, libraryId }: { sessionId: string; libraryId: string }) => {
      const lib = library.find((l) => l.id === libraryId)!;
      const count = rows.filter((r) => r.workout_block_id === sessionId).length;
      const { error } = await supabase.from('exercises').insert({
        workout_block_id: sessionId,
        library_id: lib.id,
        name: lib.name,
        sets: lib.default_sets,
        reps: lib.default_reps,
        type: lib.role,
        focus: lib.quality === 'mobility' ? 'mobility' : 'strength',
        pattern: lib.pattern,
        is_main_lift: lib.role === 'main' && lib.quality === 'strength',
        usable_in_strength_block: lib.quality === 'mobility' && lib.role === 'accessory',
        youtube_url: lib.video_url,
        coaching_note: lib.cues.join(' · ') || null,
        order_index: count,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const updateExercise = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { sets?: number; reps?: string; emom_interval_sec?: number | null } }) => {
      const { error } = await supabase.from('exercises').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const copyPrevious = useMutation({
    mutationFn: async () => {
      const prev = blocks.find((b) => b.block_number === block!.block_number - 1);
      if (!prev) throw new Error('There is no previous block to copy.');
      const { data: prevSessions, error } = await supabase.from('workout_blocks').select('id, day_type').eq('training_block_id', prev.id);
      if (error) throw error;
      const { data: prevRows, error: e2 } = await supabase.from('exercises').select('*').in('workout_block_id', prevSessions.map((s) => s.id));
      if (e2) throw e2;
      const target = new Map(sessions.map((s) => [s.day_type, s.id]));
      const inserts = prevRows
        .map((r) => {
          const code = prevSessions.find((s) => s.id === r.workout_block_id)?.day_type;
          const sessionId = code ? target.get(code) : undefined;
          if (!sessionId) return null;
          const { id: _id, created_at: _c, workout_block_id: _w, superset_with: _s, ...rest } = r;
          return { ...rest, workout_block_id: sessionId, superset_with: null };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (inserts.length === 0) throw new Error('The previous block has no exercises.');
      const { error: e3 } = await supabase.from('exercises').insert(inserts);
      if (e3) throw e3;
    },
    onSuccess: () => {
      toast.success('Copied from the previous block');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sessionIdFor = (code: string) => sessions.find((s) => s.day_type === code)?.id;
  const rowsFor = (code: string) => rows.filter((r) => r.workout_block_id === sessionIdFor(code));
  const isEmpty = rows.length === 0;

  return (
    <FeedLayout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] tracking-[0.12em] uppercase text-muted-foreground">
              {block ? `Block ${block.block_number} · ${block.status === 'published' ? 'published' : 'draft'}` : 'No blocks yet'}
            </p>
            <h1 className="font-serif italic text-4xl mt-1">Build the block</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {blocks.length > 1 && (
              <select aria-label="Choose a block" value={block?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
                {blocks.map((b) => <option key={b.id} value={b.id}>Block {b.block_number}</option>)}
              </select>
            )}
            <button onClick={() => createBlock.mutate()} disabled={createBlock.isPending} className="h-11 rounded-lg border border-border px-4 text-sm">New block</button>
          </div>
        </div>

        {block && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">Starts
                <input type="date" value={block.starts_on} onChange={(e) => e.target.value && updateBlock.mutate({ starts_on: e.target.value })} className="bg-transparent text-sm" />
              </label>
              <label className="flex h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
                <input type="checkbox" checked={block.power_included} onChange={(e) => updateBlock.mutate({ power_included: e.target.checked })} className="h-[18px] w-[18px]" />
                Power in this block
              </label>
              {isEmpty && block.block_number > 1 && (
                <button onClick={() => copyPrevious.mutate()} disabled={copyPrevious.isPending} className="h-11 rounded-lg border border-border px-4 text-sm">Copy from block {block.block_number - 1}</button>
              )}
            </div>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))] items-start">
              {SESSIONS.map((s) => {
                const sessionId = sessionIdFor(s.code);
                const composed = composeSession(byCode[s.code] ?? [], BALANCED, { weekInBlock: 1, deloadWeek: 4, sessionMinutes: 60, includeAllExtras: true, powerIncluded: block.power_included });
                const raw = rowsFor(s.code);
                return (
                  <section key={s.code} className="space-y-2 rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="font-serif text-2xl">{s.code}</span>
                      <span className="text-[12px] text-muted-foreground">{s.name}</span>
                    </div>
                    {composed.items.map((item) => {
                      const row = raw.find((r) => r.id === item.placement.id)!;
                      return (
                        <div key={item.placement.id} className={`space-y-1.5 rounded-lg border p-2.5 ${item.placement.role === 'extra' ? 'border-dashed border-foreground/30' : 'border-border bg-background'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] leading-snug">
                              <b>{item.label}</b> {item.placement.name}
                              <span className="block text-[11px] text-muted-foreground">{item.placement.role} · {item.placement.quality}</span>
                            </p>
                            <button aria-label={`Remove ${item.placement.name}`} onClick={() => removeExercise.mutate(row.id)} className="p-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              aria-label={`${item.placement.name} sets and reps`}
                              defaultValue={formatSetsReps(row.sets, row.reps)}
                              onBlur={(e) => {
                                const v = parseSetsReps(e.target.value);
                                if (!v) return toast.error('Write it as sets × reps, e.g. 3 × 6–8');
                                if (v.sets !== row.sets || v.reps !== row.reps) updateExercise.mutate({ id: row.id, patch: v });
                              }}
                              className={inputClass}
                            />
                            <input
                              aria-label={`${item.placement.name} EMOM`}
                              defaultValue={formatEmom(row.emom_interval_sec)}
                              placeholder="EMOM"
                              onBlur={(e) => {
                                const v = parseEmom(e.target.value);
                                if (Number.isNaN(v) || (v != null && (v < 30 || v > 600))) return toast.error('EMOM: write it as 2:30 or leave it empty');
                                if (v !== row.emom_interval_sec) updateExercise.mutate({ id: row.id, patch: { emom_interval_sec: v } });
                              }}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {composed.dropped.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">Not shown this week: {composed.dropped.map((d) => d.name).join(', ')}</p>
                    )}
                    {sessionId && (
                      <select
                        aria-label={`Add an exercise to ${s.code}`}
                        value=""
                        onChange={(e) => e.target.value && addExercise.mutate({ sessionId, libraryId: e.target.value })}
                        className="h-9 w-full rounded-md border border-dashed border-foreground/30 bg-transparent px-2 text-[13px]"
                      >
                        <option value="">+ From library</option>
                        {(['strength', 'power', 'mobility'] as const).map((q) => (
                          <optgroup key={q} label={q[0].toUpperCase() + q.slice(1)}>
                            {library.filter((l) => l.quality === q).map((l) => <option key={l.id} value={l.id}>{l.name} · {l.role}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    )}
                    <p className={`pt-1 text-[13px] font-semibold ${composed.fullMinutes > 60 ? 'text-destructive' : ''}`}>
                      {composed.items.length === 0 ? (s.code === 'D' ? 'Empty: members get C twice' : 'Empty') : `≈ ${composed.fullMinutes} min${composed.fullMinutes > 60 ? ' · extras drop for 60-min members' : ''}`}
                    </p>
                  </section>
                );
              })}
            </div>

            <section className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-2xl">How members will see week 1</h2>
                <span className="text-[12px] text-muted-foreground">Change the block above; the previews update</span>
              </div>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                {PREVIEW_PROFILES.map((profile) => {
                  const week = planWeek(
                    { scores: { strength: profile.focus_strength, mobility: profile.focus_mobility, conditioning: profile.focus_conditioning }, days: profile.days.length, canDoIntervals: true, weekInBlock: 1 },
                    [...profile.days],
                  ).filter((d) => d.session);
                  const strengthDay = week.find((d) => d.session && STRENGTH_SESSIONS.includes(d.session));
                  const sample = strengthDay?.session
                    ? composeSession(placementsForSession(strengthDay.session, byCode), profile, { weekInBlock: 1, deloadWeek: 4, sessionMinutes: 60, powerIncluded: block.power_included })
                    : null;
                  const firstMain = sample?.items.find((i) => i.placement.role === 'main');
                  return (
                    <div key={profile.name} className="space-y-2 rounded-xl border border-border bg-card p-4">
                      <p className="text-sm font-semibold">{profile.name} · {profile.days.length} days</p>
                      <p className="text-[12px] text-muted-foreground">S{profile.focus_strength} · M{profile.focus_mobility} · C{profile.focus_conditioning}</p>
                      <p className="text-sm">{week.map((d) => `${d.day} ${d.session}`).join(' · ')}</p>
                      {sample && strengthDay?.session && (
                        <p className="text-[12px] text-muted-foreground">
                          {strengthDay.session} ({SESSION_NAMES[strengthDay.session]}): {firstMain ? `${firstMain.placement.name} ${firstMain.prescription.sets} × ${firstMain.prescription.reps}` : 'no main lift yet'} · ≈ {sample.estimatedMinutes} min
                          {sample.dropped.some((d) => d.role === 'extra') ? ' · extras out' : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
              {block.status === 'published' ? (
                <button onClick={() => updateBlock.mutate({ status: 'draft' })} className="h-12 rounded-xl border border-border px-6 text-sm">Back to draft</button>
              ) : (
                <button onClick={() => updateBlock.mutate({ status: 'published' })} disabled={isEmpty} className="h-12 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-40">
                  Publish block {block.block_number}
                </button>
              )}
              <span className="text-[13px] text-muted-foreground">Members get their block overview on {format(new Date(block.starts_on), 'd MMMM')}.</span>
            </div>
          </>
        )}
      </div>
    </FeedLayout>
  );
};

export default FeedBlocks;
