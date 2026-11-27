import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Play, RefreshCw } from 'lucide-react';
import { addDays, format, startOfWeek } from 'date-fns';
import MovementLibrary from '@/components/move/MovementLibrary';
import ConditioningTest from '@/components/move/ConditioningTest';
import { THRESHOLD_TESTS } from '@/lib/zones';
import SessionDetail from '@/components/move/SessionDetail';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { weekOfPlan } from '@/lib/blocks';
import { type ExerciseOverride, type FocusProfile, prescribe, weekInBlock } from '@/lib/prescription';
import { SESSION_NAMES, type SessionCode, planWeek } from '@/lib/allocation';
import { type LoggedSet, current1RM, loadIncrement, loadRange, weekTarget } from '@/lib/strength';

interface WorkoutBlock {
  id: string;
  week_number: number;
  day_type: string;
  workout_name: string;
}

interface Exercise {
  id: string;
  workout_block_id: string;
  type: string;
  name: string;
  sets: number;
  reps: string;
  coaching_note: string | null;
  youtube_url: string | null;
  order_index: number;
  alternative_name: string | null;
  alternative_youtube_url: string | null;
  alternative_coaching_note: string | null;
  focus: string;
  pattern: string | null;
  is_main_lift: boolean;
}

interface Override extends ExerciseOverride {
  exercise_id: string;
}

const LOWER_PATTERNS = ['squat', 'hinge', 'single_leg', 'carry_trunk'];

/**
 * A session as the member sees it. U1 / U2 / L are built from the A and B exercises
 * (same exercises, regrouped) unless Robbe uploaded a dedicated block for them.
 */
interface SessionView {
  code: SessionCode;
  title: string;
  blocks: WorkoutBlock[];
  filter?: (ex: Exercise) => boolean;
}

const sessionView = (code: SessionCode, blocks: WorkoutBlock[]): SessionView | null => {
  const byCode = (c: string) => blocks.find((b) => b.day_type === c);
  const own = byCode(code);
  if (own) return { code, title: own.workout_name, blocks: [own] };
  const a = byCode('A');
  const b = byCode('B');
  if (code === 'U1' && a) return { code, title: SESSION_NAMES.U1, blocks: [a], filter: (e) => !LOWER_PATTERNS.includes(e.pattern ?? '') };
  if (code === 'U2' && b) return { code, title: SESSION_NAMES.U2, blocks: [b], filter: (e) => !LOWER_PATTERNS.includes(e.pattern ?? '') };
  if (code === 'L' && (a || b)) return { code, title: SESSION_NAMES.L, blocks: [a, b].filter(Boolean) as WorkoutBlock[], filter: (e) => LOWER_PATTERNS.includes(e.pattern ?? '') };
  return null;
};

const Move = () => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<{ view: SessionView; date: string; day: string } | null>(null);

  const { data: plan } = useQuery({
    queryKey: ['member_plan', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_plans')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: lastRunTest } = useQuery({
    queryKey: ['conditioning_tests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conditioning_tests')
        .select('*')
        .eq('user_id', user!.id)
        .order('tested_on', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // A published block sets the calendar for everyone (Robbe uploads every 4 weeks).
  const { data: activeBlock } = useActiveBlock();
  const blockStart = activeBlock?.startDate ?? plan?.block_start_date ?? profile?.training_start_date;
  const blockWeeks = activeBlock?.weeks ?? 4;
  const deloadWeek = activeBlock?.deloadWeek ?? plan?.deload_week ?? 4;
  const currentWeek = useMemo(() => {
    if (!blockStart) return 1;
    if (activeBlock) return weekOfPlan(new Date(blockStart), new Date(), blockWeeks) ?? blockWeeks;
    return weekInBlock(new Date(blockStart), new Date());
  }, [blockStart, blockWeeks, activeBlock]);
  const target = weekTarget(currentWeek, deloadWeek);
  const hasRunTest = !!lastRunTest?.some((t) => THRESHOLD_TESTS.includes(t.test_type));

  const { data: legacyBlocks } = useQuery({
    queryKey: ['workout_blocks', currentWeek],
    queryFn: async () => {
      const { data, error } = await supabase.from('workout_blocks').select('*').eq('week_number', currentWeek);
      if (error) throw error;
      return data as WorkoutBlock[];
    },
    enabled: !!user && activeBlock === null,
  });

  const workoutBlocks: WorkoutBlock[] | undefined = activeBlock
    ? activeBlock.sessions.map((s) => ({ id: s.id, week_number: currentWeek, day_type: s.day_type, workout_name: s.workout_name }))
    : legacyBlocks;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const { data: completions } = useQuery({
    queryKey: ['completions', user?.id, weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_workout_completions')
        .select('*')
        .eq('user_id', user!.id)
        .gte('day_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('day_date', format(addDays(weekStart, 6), 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const week = useMemo(() => {
    if (!profile?.preferred_days) return [];
    const days = profile.preferred_days as string[];
    const planned = planWeek(
      {
        scores: {
          strength: profile.focus_strength,
          mobility: profile.focus_mobility,
          conditioning: profile.focus_conditioning,
        },
        days: days.length,
        // The running plan only starts once there is a 30-minute test to set the paces.
        runningGoal: !!profile.conditioning_goal && profile.conditioning_goal !== 'fitter' && hasRunTest,
        canDoIntervals: hasRunTest,
        weekInBlock: currentWeek,
      },
      days,
    );
    return planned.map((p, i) => ({
      ...p,
      date: format(addDays(weekStart, i), 'yyyy-MM-dd'),
      view: p.session && workoutBlocks ? sessionView(p.session, workoutBlocks) : null,
    }));
  }, [profile, workoutBlocks, weekStart, currentWeek, hasRunTest]);

  const isCompleted = (view: SessionView | null, date: string) =>
    !!view && !!completions?.some((c) => c.workout_block_id === view.blocks[0]?.id && c.day_date === date);

  if (selected && profile && activeBlock) {
    return (
      <SessionDetail
        block={activeBlock}
        code={selected.view.code}
        title={selected.view.title}
        day={selected.day}
        date={selected.date}
        completed={isCompleted(selected.view, selected.date)}
        onBack={() => setSelected(null)}
        userId={user!.id}
        weekNumber={currentWeek}
        deloadWeek={deloadWeek}
        profile={profile}
      />
    );
  }

  if (selected && profile) {
    return (
      <WorkoutDetail
        view={selected.view}
        day={selected.day}
        date={selected.date}
        completed={isCompleted(selected.view, selected.date)}
        onBack={() => setSelected(null)}
        userId={user!.id}
        weekNumber={currentWeek}
        deloadWeek={deloadWeek}
        profile={profile}
        queryClient={queryClient}
      />
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="min-h-screen pt-14">
      <div className="container mx-auto px-6 py-12 md:py-16 max-w-3xl">
        <div className="mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Back
          </Link>
          <p className="text-[12px] tracking-[0.12em] uppercase text-muted-foreground">Block {activeBlock?.block_number ?? plan?.block_number ?? 1}</p>
          <h1 className="font-serif italic text-4xl md:text-5xl mt-1">Move</h1>
        </div>

        {activeBlock && (
          <Link to="/move/overview" className="mb-8 flex items-center justify-between rounded-xl bg-secondary px-4 py-3.5">
            <span>
              <span className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Block {activeBlock.block_number} overview</span>
              <span className="block text-[15px]">All exercises for these 4 weeks, with video</span>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        )}

        <section className="mb-10 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(blockWeeks, 4)}, minmax(0, 1fr))` }}>
          {Array.from({ length: blockWeeks }, (_, i) => i + 1).map((w) => {
            const t = weekTarget(w, deloadWeek);
            const now = w === currentWeek;
            return (
              <div key={w} className={`rounded-lg px-3 py-2.5 ${now ? 'bg-primary text-primary-foreground' : w < currentWeek ? 'bg-accent text-accent-foreground' : 'bg-card'}`}>
                <div className="text-[11px] opacity-80">Week {w}{now ? ' · now' : ''}</div>
                <div className="text-[13px] font-medium mt-0.5">{t.isDeload ? 'Deload' : t.label}</div>
              </div>
            );
          })}
        </section>

        <section className="mb-12">
          <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium mb-4">This week</h3>
          <div className="space-y-2">
            {week.map((slot) => {
              const done = isCompleted(slot.view, slot.date);
              const isToday = slot.date === today;
              if (!slot.session) {
                return (
                  <div key={slot.day} className="flex items-center gap-4 px-4 py-2 text-[13px] text-muted-foreground">
                    <span className="w-10">{slot.day}</span>
                    <span>Rest · walk</span>
                  </div>
                );
              }
              const isStrength = ['A', 'B', 'U1', 'U2', 'L'].includes(slot.session);
              const content = (
                <>
                  <span className={`w-10 text-[12px] ${isToday ? 'font-semibold' : 'text-muted-foreground'}`}>{slot.day}</span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg font-serif text-lg text-primary-foreground ${isStrength ? 'bg-accent' : slot.session === 'E' ? 'bg-destructive' : 'bg-foreground/80'}`}>
                    {slot.session === 'RUN' ? 'R' : slot.session}
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block text-[15px]">{slot.view?.title ?? SESSION_NAMES[slot.session]}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      {slot.session === 'RUN'
                        ? 'From your running plan'
                        : slot.view
                          ? `${isToday ? 'Today' : ''}${done ? (isToday ? ' · done' : 'Done') : ''}`
                          : 'Not uploaded yet for this week'}
                    </span>
                  </span>
                  {done && <Check className="h-4 w-4 text-accent" strokeWidth={2} />}
                </>
              );
              return slot.view ? (
                <button
                  key={slot.day}
                  onClick={() => setSelected({ view: slot.view!, date: slot.date, day: slot.day })}
                  className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 transition-colors hover:border-foreground/30 ${isToday ? 'border-foreground bg-card' : 'border-border bg-card/60'}`}
                >
                  {content}
                </button>
              ) : (
                <div key={slot.day} className="flex items-center gap-4 rounded-xl border border-border px-4 py-3 opacity-70">
                  {content}
                </div>
              );
            })}
          </div>
          {target.isDeload && (
            <p className="mt-4 text-sm text-muted-foreground">Deload week: half the sets, same exercises. Easier weeks are where progress shows.</p>
          )}
        </section>

        <ConditioningTest userId={user!.id} tests={lastRunTest ?? []} />

        <MovementLibrary />
      </div>
    </div>
  );
};

// ── Workout detail: log every set ───────────────────────────────────────

interface WorkoutDetailProps {
  view: SessionView;
  day: string;
  date: string;
  completed?: boolean;
  onBack: () => void;
  userId: string;
  weekNumber: number;
  deloadWeek: number;
  profile: FocusProfile;
  queryClient: ReturnType<typeof useQueryClient>;
}

type SetInput = { weight: string; reps: string; rir: string };

const toNumber = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

const WorkoutDetail = ({ view, day, date, completed, onBack, userId, weekNumber, deloadWeek, profile, queryClient }: WorkoutDetailProps) => {
  const [inputs, setInputs] = useState<Record<string, SetInput[]>>({});
  const [formError, setFormError] = useState('');
  const [showRir, setShowRir] = useState(false);
  const blockIds = view.blocks.map((b) => b.id);

  const { data: exercises } = useQuery({
    queryKey: ['exercises', blockIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select('*').in('workout_block_id', blockIds).order('order_index');
      if (error) throw error;
      return (data as Exercise[]).filter((e) => (view.filter ? view.filter(e) : true));
    },
  });

  const exerciseIds = exercises?.map((e) => e.id) ?? [];

  const { data: overrides } = useQuery({
    queryKey: ['exercise_overrides', userId, exerciseIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_exercise_overrides')
        .select('exercise_id, sets, reps, target_load_kg, paused')
        .eq('user_id', userId)
        .in('exercise_id', exerciseIds);
      if (error) throw error;
      return data as Override[];
    },
    enabled: exerciseIds.length > 0,
  });

  // Logged sets per exercise: the history behind the load range.
  const { data: history } = useQuery({
    queryKey: ['exercise_sets', userId, exerciseIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sets')
        .select('exercise_id, weight_kg, reps, rir, logged_at, completion_id')
        .eq('user_id', userId)
        .in('exercise_id', exerciseIds)
        .order('logged_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      const byExercise: Record<string, LoggedSet[]> = {};
      for (const row of data) (byExercise[row.exercise_id] ??= []).push(row as LoggedSet);
      return byExercise;
    },
    enabled: exerciseIds.length > 0,
  });

  const prescriptionFor = (ex: Exercise) =>
    prescribe(ex, profile, {
      weekInBlock: weekNumber,
      deloadWeek,
      override: overrides?.find((o) => o.exercise_id === ex.id) ?? null,
    });

  const rangeFor = (ex: Exercise) => {
    const p = prescriptionFor(ex);
    if (p.targetLoadKg != null) return { low: p.targetLoadKg, high: p.targetLoadKg };
    const oneRm = current1RM(history?.[ex.id] ?? []);
    return oneRm ? loadRange(oneRm, p.reps, p.rir, loadIncrement(ex.pattern)) : null;
  };

  const setsFor = (ex: Exercise): SetInput[] => {
    const n = prescriptionFor(ex).sets;
    const current = inputs[ex.id] ?? [];
    return Array.from({ length: n }, (_, i) => current[i] ?? { weight: '', reps: '', rir: '' });
  };

  const updateSet = (ex: Exercise, i: number, patch: Partial<SetInput>) => {
    const rows = setsFor(ex);
    rows[i] = { ...rows[i], ...patch };
    setInputs((prev) => ({ ...prev, [ex.id]: rows }));
  };

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { data: completion, error } = await supabase
        .from('user_workout_completions')
        .insert({ user_id: userId, workout_block_id: view.blocks[0].id, week_number: weekNumber, day_date: date })
        .select('id')
        .single();
      if (error) throw error;

      const rows = Object.entries(inputs).flatMap(([exercise_id, sets]) =>
        sets
          .map((s, i) => ({
            user_id: userId,
            completion_id: completion.id,
            exercise_id,
            set_number: i + 1,
            weight_kg: toNumber(s.weight),
            reps: toNumber(s.reps),
            rir: toNumber(s.rir),
          }))
          .filter((r) => r.weight_kg != null || r.reps != null || r.rir != null),
      );
      if (rows.length > 0) {
        const { error: setError } = await supabase.from('exercise_sets').insert(rows);
        if (setError) throw setError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completions'] });
      queryClient.invalidateQueries({ queryKey: ['exercise_sets'] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const handleComplete = () => {
    const values = Object.values(inputs).flat();
    const bad = values.some((s) =>
      [s.weight, s.reps, s.rir].some((v) => v.trim() !== '' && !(Number(v.replace(',', '.')) >= 0)),
    );
    if (bad) {
      setFormError('Enter numbers only, e.g. 62.5 kg, 8 reps, RIR 2.');
      return;
    }
    const missingRir = values.some((s) => (s.weight.trim() || s.reps.trim()) && !s.rir.trim());
    if (missingRir) {
      setFormError('Add your RIR to every set you logged: it is how the plan learns your weights.');
      return;
    }
    setFormError('');
    completeMutation.mutate();
  };

  const visible = exercises?.filter((e) => !prescriptionFor(e).paused) ?? [];
  const target = weekTarget(weekNumber, deloadWeek);

  return (
    <div className="min-h-screen pt-14">
      <div className="container mx-auto px-6 py-12 md:py-16 max-w-2xl">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back to your week
        </button>

        <div className="mb-8">
          <span className="text-[11px] tracking-[0.12em] uppercase text-accent font-medium">
            {view.code} · {day} · Week {weekNumber}
          </span>
          <h1 className="font-serif text-3xl md:text-4xl mt-1">{view.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {target.isDeload ? 'Deload week: half the sets, same quality.' : `Main lifts at ${target.label}.`}
          </p>
        </div>

        <button onClick={() => setShowRir((v) => !v)} className="mb-8 flex w-full items-center justify-between rounded-xl bg-card px-4 py-3 text-left">
          <span className="text-[13px] font-medium">What is RIR?</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showRir ? 'rotate-180' : ''}`} strokeWidth={1.5} />
        </button>
        {showRir && (
          <div className="-mt-6 mb-8 rounded-b-xl bg-card px-4 pb-4 text-[13px] leading-relaxed text-muted-foreground">
            Reps in reserve: how many more good reps you could have done. RIR 0 is failure, RIR 2 means two left.
            Sets count when they are hard, so after every set ask yourself honestly how many were left. Most people
            guess too high at first; once per block you'll do one set to failure to check your guess.
          </div>
        )}

        {exercises && visible.length === 0 && (
          <p className="text-sm text-muted-foreground">No exercises in this session yet.</p>
        )}

        <div className="space-y-4">
          {visible.map((ex) => {
            const p = prescriptionFor(ex);
            const range = rangeFor(ex);
            return (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                summary={`${p.sets} × ${p.reps} · ${p.rirLabel}`}
                range={range}
                sets={completed ? null : setsFor(ex)}
                onSetChange={(i, patch) => updateSet(ex, i, patch)}
              />
            );
          })}
        </div>

        {!completed ? (
          <div className="mt-10">
            {formError && <p className="text-sm text-destructive mb-4">{formError}</p>}
            <button
              onClick={handleComplete}
              disabled={completeMutation.isPending || !view.blocks[0]}
              className="w-full bg-primary text-primary-foreground px-8 py-[14px] text-[13px] font-medium tracking-[0.08em] uppercase transition-colors hover:bg-foreground/90 disabled:opacity-40 rounded-lg"
            >
              {completeMutation.isPending ? '...' : 'Complete session'}
            </button>
          </div>
        ) : (
          <div className="mt-10 flex items-center justify-center gap-2 py-4 text-accent">
            <Check className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-[12px] tracking-[0.08em] uppercase font-medium">Session completed</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Exercise card with set logging ──────────────────────────────────────

interface ExerciseCardProps {
  exercise: Exercise;
  summary: string;
  range: { low: number; high: number } | null;
  sets: SetInput[] | null;
  onSetChange: (index: number, patch: Partial<SetInput>) => void;
}

const RIR_OPTIONS = ['0', '1', '2', '3', '4', '5'];

const ExerciseCard = ({ exercise, summary, range, sets, onSetChange }: ExerciseCardProps) => {
  const [showAlt, setShowAlt] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);

  const active = showAlt && exercise.alternative_name
    ? { name: exercise.alternative_name, note: exercise.alternative_coaching_note, url: exercise.alternative_youtube_url }
    : { name: exercise.name, note: exercise.coaching_note, url: exercise.youtube_url };
  const youtubeId = active.url?.match(/(?:youtu\.be\/|v=|shorts\/)([^&\s?]+)/)?.[1];

  return (
    <div className="border border-border bg-card rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-base font-medium">{active.name}</p>
          <p className="text-[12px] text-muted-foreground mt-1">{summary}</p>
          {active.note && <p className="text-[12px] text-muted-foreground/80 mt-1 italic">{active.note}</p>}
        </div>
        <div className="flex items-center gap-2">
          {youtubeId && (
            <button aria-label="Show demo video" onClick={() => setVideoExpanded(!videoExpanded)} className="p-2 border border-border rounded-md hover:border-foreground/30 transition-colors">
              <Play className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          )}
          {exercise.alternative_name && (
            <button
              aria-label="Alternative exercise"
              onClick={() => setShowAlt(!showAlt)}
              className={`p-2 border rounded-md transition-colors ${showAlt ? 'border-accent bg-accent/10' : 'border-border hover:border-foreground/30'}`}
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {videoExpanded && youtubeId && (
        <div className="mt-4 aspect-video">
          <iframe
            title={`${active.name} demo`}
            src={`https://www.youtube.com/embed/${youtubeId}`}
            className="w-full h-full rounded-md"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}

      {range && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary px-4 py-2.5">
          <span className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground">Your range today</span>
          <span className="text-base font-semibold">{range.low === range.high ? `${range.low}` : `${range.low} – ${range.high}`} kg</span>
        </div>
      )}

      {sets && (
        <div className="mt-4">
          <div className="grid grid-cols-[32px_1fr_1fr_1fr] gap-2 px-1 text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
            <span>Set</span><span>kg</span><span>Reps</span><span>RIR</span>
          </div>
          <div className="mt-1.5 space-y-1.5">
            {sets.map((s, i) => (
              <div key={i} className="grid grid-cols-[32px_1fr_1fr_1fr] items-center gap-2">
                <span className="pl-1 text-sm text-muted-foreground">{i + 1}</span>
                <input
                  aria-label={`Set ${i + 1} weight in kg`}
                  inputMode="decimal"
                  value={s.weight}
                  onChange={(e) => onSetChange(i, { weight: e.target.value })}
                  placeholder={range ? String(range.low) : 'kg'}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground/40"
                />
                <input
                  aria-label={`Set ${i + 1} reps`}
                  inputMode="numeric"
                  value={s.reps}
                  onChange={(e) => onSetChange(i, { reps: e.target.value })}
                  placeholder="reps"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground/40"
                />
                <select
                  aria-label={`Set ${i + 1} reps in reserve`}
                  value={s.rir}
                  onChange={(e) => onSetChange(i, { rir: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-foreground/40"
                >
                  <option value="">–</option>
                  {RIR_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r === '5' ? '5+' : r}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Move;
