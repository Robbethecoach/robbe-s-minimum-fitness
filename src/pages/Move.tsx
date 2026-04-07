import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Play, RefreshCw } from 'lucide-react';
import { format, startOfWeek, addDays, differenceInWeeks } from 'date-fns';
import MovementLibrary from '@/components/move/MovementLibrary';

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
}

const Move = () => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();
  const [selectedWorkout, setSelectedWorkout] = useState<{ block: WorkoutBlock; dayLabel: string } | null>(null);

  const currentWeekNumber = useMemo(() => {
    if (!profile?.training_start_date) return 1;
    const start = new Date(profile.training_start_date);
    const weeksSinceStart = differenceInWeeks(new Date(), start);
    return ((weeksSinceStart % 4) + 1);
  }, [profile?.training_start_date]);

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
    const preferredDays = profile.preferred_days as string[];
    const required = workoutBlocks.filter((b) => !['recovery_run', 'mobility_flow'].includes(b.day_type));
    const optional = workoutBlocks.filter((b) => ['recovery_run', 'mobility_flow'].includes(b.day_type));
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
  }, [workoutBlocks, profile?.preferred_days, weekStart]);

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
            Week {currentWeekNumber} of 4
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
  queryClient: ReturnType<typeof useQueryClient>;
}

const WorkoutDetail = ({ block, dayLabel, date, completed, onBack, userId, weekNumber, queryClient }: WorkoutDetailProps) => {
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

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('user_workout_completions').insert({
        user_id: userId,
        workout_block_id: block.id,
        week_number: weekNumber,
        day_date: date,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['completions'] }),
  });

  const mainLifts = exercises?.filter((e) => e.type === 'main_lift') || [];
  const accessories = exercises?.filter((e) => e.type === 'accessory') || [];
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
        </div>

        {mainLifts.length > 0 && (
          <section className="mb-12">
            <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium mb-5">Main Lifts</h3>
            <div className="space-y-4">
              {mainLifts.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} showAlternative />
              ))}
            </div>
          </section>
        )}

        {accessories.length > 0 && (
          <section className="mb-12">
            <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium mb-5">Accessory Drills</h3>
            <div className="space-y-3">
              {accessories.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} compact />
              ))}
            </div>
          </section>
        )}

        {!completed ? (
          <button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="w-full bg-primary text-primary-foreground px-8 py-[14px] text-[13px] font-medium tracking-[0.08em] uppercase transition-colors hover:bg-foreground/90 disabled:opacity-40 rounded-lg"
          >
            {completeMutation.isPending ? '...' : 'Complete workout'}
          </button>
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
  showAlternative?: boolean;
  compact?: boolean;
}

const ExerciseCard = ({ exercise, showAlternative, compact }: ExerciseCardProps) => {
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
            {exercise.sets} × {exercise.reps}
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
