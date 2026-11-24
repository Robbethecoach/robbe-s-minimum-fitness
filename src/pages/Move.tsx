import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Play, RefreshCw } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import MovementLibrary from '@/components/move/MovementLibrary';
import {
  type ExerciseOverride,
  type FocusProfile,
  type SessionRating,
  orderOptionalSessions,
  orderRequiredSessions,
  prescribe,
  weekInBlock,
} from '@/lib/prescription';

const RATINGS: { value: SessionRating; label: string }[] = [
  { value: 'too_easy', label: 'Too easy' },
  { value: 'right', label: 'Right' },
  { value: 'too_hard', label: 'Too hard' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_TYPE_META: Record<string, { label: string; muted: boolean }> = {
  strength_a: { label: 'Strength', muted: false },
  strength_b: { label: 'Strength', muted: false },
  conditioning_a: { label: 'Conditioning', muted: false },
  conditioning_b: { label: 'Conditioning', muted: false },
  recovery_run: { label: 'Optional', muted: true },
  mobility_flow: { label: 'Optional', muted: true },
};

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
}

interface Override extends ExerciseOverride {
  exercise_id: string;
}

const Move = () => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();
  const [selectedWorkout, setSelectedWorkout] = useState<{ block: WorkoutBlock; dayLabel: string } | null>(null);

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

  // The active plan's block start drives the week; older profiles fall back to their start date.
  const blockStart = plan?.block_start_date ?? profile?.training_start_date;
  const deloadWeek = plan?.deload_week ?? 4;
  const currentWeekNumber = useMemo(
    () => (blockStart ? weekInBlock(new Date(blockStart), new Date()) : 1),
    [blockStart],
  );

  const { data: workoutBlocks } = useQuery({
    queryKey: ['workout_blocks', currentWeekNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_blocks')
        .select('*')
        .eq('week_number', currentWeekNumber)
        .order('day_type');
      if (error) throw error;
      return data as WorkoutBlock[];
    },
    enabled: !!user,
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const { data: completions } = useQuery({
    queryKey: ['completions', user?.id, weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_workout_completions')
        .select('*')
        .eq('user_id', user!.id)
        .gte('day_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('day_date', format(weekEnd, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const weekSchedule = useMemo(() => {
    if (!workoutBlocks || !profile?.preferred_days) return [];
    // Week order, whatever order the days were picked in.
    const preferredDays = [...(profile.preferred_days as string[])].sort(
      (a, b) => DAY_LABELS.indexOf(a) - DAY_LABELS.indexOf(b),
    );
    const byType = (types: string[]) =>
      types
        .map((type) => workoutBlocks.find((b) => b.day_type === type))
        .filter((b): b is WorkoutBlock => !!b);
    const required = byType(orderRequiredSessions(profile, preferredDays.length));
    const optional = byType(orderOptionalSessions(profile));
    const assigned: { day: string; dayIndex: number; date: string; workout: WorkoutBlock | null; isOptional: boolean }[] = [];
    DAY_LABELS.forEach((day, i) => {
      const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
      assigned.push({ day, dayIndex: i, date, workout: null, isOptional: false });
    });
    let reqIdx = 0;
    for (const day of preferredDays) {
      const slotIdx = DAY_LABELS.indexOf(day);
      if (slotIdx !== -1 && reqIdx < required.length) {
        assigned[slotIdx].workout = required[reqIdx];
        reqIdx++;
      }
    }
    let optIdx = 0;
    for (const day of preferredDays) {
      const slotIdx = DAY_LABELS.indexOf(day);
      if (slotIdx !== -1 && !assigned[slotIdx].workout && optIdx < optional.length) {
        assigned[slotIdx].workout = optional[optIdx];
        assigned[slotIdx].isOptional = true;
        optIdx++;
      }
    }
    return assigned;
  }, [workoutBlocks, profile, weekStart]);

  const isCompleted = (blockId: string, date: string) =>
    completions?.some((c) => c.workout_block_id === blockId && c.day_date === date);

  if (selectedWorkout) {
    return (
      <WorkoutDetail
        block={selectedWorkout.block}
        dayLabel={selectedWorkout.dayLabel}
        date={weekSchedule.find((s) => s.day === selectedWorkout.dayLabel)?.date || ''}
        completed={isCompleted(selectedWorkout.block.id, weekSchedule.find((s) => s.day === selectedWorkout.dayLabel)?.date || '')}
        onBack={() => setSelectedWorkout(null)}
        userId={user!.id}
        weekNumber={currentWeekNumber}
        deloadWeek={deloadWeek}
        profile={profile!}
        queryClient={queryClient}
      />
    );
  }

  return (
    <div className="min-h-screen pt-14">
      <div className="container mx-auto px-6 py-12 md:py-16">
        <div className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Back
          </Link>
          <h1 className="font-serif italic text-4xl md:text-5xl">Move</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Week {currentWeekNumber} of 4{currentWeekNumber === deloadWeek ? ' · Deload week' : ''}
          </p>
        </div>

        <section className="mb-20">
          <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium mb-6">
            Weekly Planner
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {weekSchedule.map((slot) => {
              const completed = slot.workout ? isCompleted(slot.workout.id, slot.date) : false;
              const meta = slot.workout ? DAY_TYPE_META[slot.workout.day_type] : null;
              const isToday = slot.date === format(new Date(), 'yyyy-MM-dd');

              return (
                <button
                  key={slot.day}
                  onClick={() => slot.workout && setSelectedWorkout({ block: slot.workout, dayLabel: slot.day })}
                  disabled={!slot.workout}
                  className={`relative flex flex-col items-center text-center p-3 md:p-4 rounded-lg border transition-all min-h-[120px] ${
                    isToday ? 'border-foreground/30 bg-card' : 'border-border'
                  } ${
                    slot.workout
                      ? 'cursor-pointer hover:border-foreground/25 hover:bg-card'
                      : 'opacity-40 cursor-default'
                  } ${
                    slot.isOptional ? 'opacity-50' : ''
                  } ${
                    completed ? 'bg-accent/10' : ''
                  }`}
                >
                  <span className={`text-[11px] tracking-[0.08em] uppercase font-medium mb-2 ${
                    isToday ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {slot.day}
                  </span>

                  {slot.workout && meta && (
                    <>
                      <span className={`text-[9px] tracking-[0.08em] uppercase mb-1 ${meta.muted ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {slot.workout.workout_name}
                      </span>
                      {completed && (
                        <Check className="absolute top-2 right-2 h-3 w-3 text-accent" strokeWidth={1.5} />
                      )}
                    </>
                  )}

                  {!slot.workout && (
                    <span className="text-[10px] text-muted-foreground mt-auto">Rest</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <MovementLibrary />
      </div>
    </div>
  );
};

// ── Workout Detail View ────────────────────────────────

interface WorkoutDetailProps {
  block: WorkoutBlock;
  dayLabel: string;
  date: string;
  completed?: boolean;
  onBack: () => void;
  userId: string;
  weekNumber: number;
  deloadWeek: number;
  profile: FocusProfile;
  queryClient: ReturnType<typeof useQueryClient>;
}

const WorkoutDetail = ({
  block, dayLabel, date, completed, onBack, userId, weekNumber, deloadWeek, profile, queryClient,
}: WorkoutDetailProps) => {
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [rating, setRating] = useState<SessionRating | null>(null);
  const [formError, setFormError] = useState('');

  const { data: exercises } = useQuery({
    queryKey: ['exercises', block.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('workout_block_id', block.id)
        .order('order_index');
      if (error) throw error;
      return data as Exercise[];
    },
  });

  const exerciseIds = exercises?.map((e) => e.id) ?? [];

  const { data: overrides } = useQuery({
    queryKey: ['exercise_overrides', userId, block.id],
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

  // Last logged weight per exercise, shown as a starting point.
  const { data: lastWeights } = useQuery({
    queryKey: ['last_weights', userId, block.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('exercise_id, weight_kg, logged_at')
        .eq('user_id', userId)
        .in('exercise_id', exerciseIds)
        .order('logged_at', { ascending: false });
      if (error) throw error;
      const latest: Record<string, number> = {};
      for (const row of data) if (!(row.exercise_id in latest)) latest[row.exercise_id] = Number(row.weight_kg);
      return latest;
    },
    enabled: exerciseIds.length > 0,
  });

  const prescriptionFor = (ex: Exercise) =>
    prescribe(ex, profile, {
      weekInBlock: weekNumber,
      deloadWeek,
      override: overrides?.find((o) => o.exercise_id === ex.id) ?? null,
    });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { data: completion, error } = await supabase
        .from('user_workout_completions')
        .insert({
          user_id: userId,
          workout_block_id: block.id,
          week_number: weekNumber,
          day_date: date,
          rating,
        })
        .select('id')
        .single();
      if (error) throw error;

      const logs = Object.entries(weights)
        .map(([exercise_id, value]) => ({ exercise_id, weight_kg: Number(value.replace(',', '.')) }))
        .filter((l) => l.weight_kg > 0)
        .map((l) => ({ ...l, user_id: userId, completion_id: completion.id }));
      if (logs.length > 0) {
        const { error: logError } = await supabase.from('exercise_logs').insert(logs);
        if (logError) throw logError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completions'] });
      queryClient.invalidateQueries({ queryKey: ['last_weights'] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const handleComplete = () => {
    if (!rating) {
      setFormError('How did this session feel?');
      return;
    }
    const invalid = Object.values(weights).some((v) => v.trim() !== '' && !(Number(v.replace(',', '.')) >= 0));
    if (invalid) {
      setFormError('Enter weights as numbers, e.g. 62.5');
      return;
    }
    setFormError('');
    completeMutation.mutate();
  };

  const mainLifts = exercises?.filter((e) => e.type === 'main_lift' && !prescriptionFor(e).paused) || [];
  const accessories = exercises?.filter((e) => e.type === 'accessory' && !prescriptionFor(e).paused) || [];
  const meta = DAY_TYPE_META[block.day_type];

  return (
    <div className="min-h-screen pt-14">
      <div className="container mx-auto px-6 py-12 md:py-16 max-w-2xl">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back to planner
        </button>

        <div className="mb-10">
          <span className={`text-[10px] tracking-[0.08em] uppercase ${meta?.muted ? 'text-muted-foreground' : 'text-foreground'} mb-2 block`}>
            {dayLabel} — {meta?.label}
          </span>
          <h1 className="font-serif italic text-3xl md:text-4xl">{block.workout_name}</h1>
          {weekNumber === deloadWeek && (
            <p className="mt-2 text-sm text-muted-foreground">Deload week: fewer sets, same quality.</p>
          )}
        </div>

        {mainLifts.length > 0 && (
          <section className="mb-12">
            <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium mb-5">Main Lifts</h3>
            <div className="space-y-4">
              {mainLifts.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  prescription={prescriptionFor(ex)}
                  showAlternative
                  weight={completed ? undefined : {
                    value: weights[ex.id] ?? '',
                    last: lastWeights?.[ex.id],
                    onChange: (value) => setWeights((prev) => ({ ...prev, [ex.id]: value })),
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {accessories.length > 0 && (
          <section className="mb-12">
            <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium mb-5">Accessory Drills</h3>
            <div className="space-y-3">
              {accessories.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} prescription={prescriptionFor(ex)} compact />
              ))}
            </div>
          </section>
        )}

        {!completed ? (
          <>
          <section className="mb-6">
            <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium mb-4">How did it feel?</h3>
            <div className="grid grid-cols-3 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRating(r.value)}
                  className={`border px-3 py-3 text-[12px] tracking-[0.08em] uppercase font-medium rounded-lg transition-all ${
                    rating === r.value
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </section>
          {formError && <p className="text-sm text-destructive mb-4">{formError}</p>}
          <button
            onClick={handleComplete}
            disabled={completeMutation.isPending}
            className="w-full bg-primary text-primary-foreground px-8 py-[14px] text-[13px] font-medium tracking-[0.08em] uppercase transition-colors hover:bg-foreground/90 disabled:opacity-40 rounded-lg"
          >
            {completeMutation.isPending ? '...' : 'Complete workout'}
          </button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 py-4 text-accent">
            <Check className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-[12px] tracking-[0.08em] uppercase font-medium">Workout completed</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Exercise Card ──────────────────────────────────────

interface ExerciseCardProps {
  exercise: Exercise;
  prescription: { sets: number; reps: string; targetLoadKg: number | null };
  showAlternative?: boolean;
  compact?: boolean;
  weight?: { value: string; last?: number; onChange: (value: string) => void };
}

const ExerciseCard = ({ exercise, prescription, showAlternative, compact, weight }: ExerciseCardProps) => {
  const [showAlt, setShowAlt] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);

  const active = showAlt && exercise.alternative_name
    ? {
        name: exercise.alternative_name,
        note: exercise.alternative_coaching_note,
        url: exercise.alternative_youtube_url,
      }
    : {
        name: exercise.name,
        note: exercise.coaching_note,
        url: exercise.youtube_url,
      };

  const youtubeId = active.url?.match(/(?:youtu\.be\/|v=)([^&\s]+)/)?.[1];

  return (
    <div className={`border border-border bg-card rounded-lg ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className={`${compact ? 'text-sm' : 'text-base'}`}>{active.name}</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            {prescription.sets} × {prescription.reps}
            {prescription.targetLoadKg != null && ` · target ${prescription.targetLoadKg} kg`}
          </p>
          {active.note && (
            <p className="text-[12px] text-muted-foreground/70 mt-1 italic">
              {active.note}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {youtubeId && (
            <button
              onClick={() => setVideoExpanded(!videoExpanded)}
              className="p-1.5 border border-border rounded-md hover:border-foreground/30 transition-colors"
            >
              <Play className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
            </button>
          )}
          {showAlternative && exercise.alternative_name && (
            <button
              onClick={() => setShowAlt(!showAlt)}
              className={`p-1.5 border rounded-md transition-colors ${
                showAlt ? 'border-accent bg-accent/10' : 'border-border hover:border-foreground/30'
              }`}
              title="Alternative exercise"
            >
              <RefreshCw className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {weight && (
        <div className="mt-4 flex items-center gap-3">
          <label className="text-[11px] tracking-[0.08em] uppercase text-muted-foreground" htmlFor={`w-${exercise.id}`}>
            Weight used
          </label>
          <input
            id={`w-${exercise.id}`}
            inputMode="decimal"
            value={weight.value}
            onChange={(e) => weight.onChange(e.target.value)}
            placeholder={weight.last != null ? String(weight.last) : 'kg'}
            className="w-24 bg-transparent border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-foreground/30"
          />
          <span className="text-[12px] text-muted-foreground">kg</span>
          {weight.last != null && (
            <span className="text-[11px] text-muted-foreground/70">last: {weight.last} kg</span>
          )}
        </div>
      )}

      {videoExpanded && youtubeId && (
        <div className="mt-4 aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            className="w-full h-full rounded-md"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}
    </div>
  );
};

export default Move;
