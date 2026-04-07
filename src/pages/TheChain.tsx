import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ArrowRight, Flame } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, subDays } from 'date-fns';

interface ChainTask {
  id: string;
  title: string;
  day_date: string;
  sort_order: number;
}

interface UserProgress {
  id: string;
  user_id: string;
  task_id: string;
  day_date: string;
  status: string;
}

const TheChain = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const { data: tasks = [] } = useQuery({
    queryKey: ['chain-tasks', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chain_tasks')
        .select('*')
        .eq('day_date', selectedDate)
        .order('sort_order');
      if (error) throw error;
      return data as ChainTask[];
    },
  });

  const previousDate = format(subDays(new Date(selectedDate + 'T00:00:00'), 1), 'yyyy-MM-dd');
  const { data: pushedProgress = [] } = useQuery({
    queryKey: ['chain-pushed-to', selectedDate, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('chain_user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('day_date', previousDate)
        .eq('status', 'pushed');
      if (error) throw error;
      return data as UserProgress[];
    },
    enabled: !!user,
  });

  const pushedTaskIds = pushedProgress.map((p) => p.task_id);
  const { data: pushedTasks = [] } = useQuery({
    queryKey: ['chain-pushed-tasks', pushedTaskIds],
    queryFn: async () => {
      if (pushedTaskIds.length === 0) return [];
      const { data, error } = await supabase
        .from('chain_tasks')
        .select('*')
        .in('id', pushedTaskIds);
      if (error) throw error;
      return data as ChainTask[];
    },
    enabled: pushedTaskIds.length > 0,
  });

  const allTasks = useMemo(() => {
    const combined = [...tasks];
    pushedTasks.forEach((pt) => {
      if (!combined.find((t) => t.id === pt.id)) {
        combined.push({ ...pt, sort_order: 99 });
      }
    });
    return combined;
  }, [tasks, pushedTasks]);

  const { data: progress = [] } = useQuery({
    queryKey: ['chain-progress', selectedDate, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('chain_user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('day_date', selectedDate);
      if (error) throw error;
      return data as UserProgress[];
    },
    enabled: !!user,
  });

  const getTaskStatus = (taskId: string) => {
    return progress.find((p) => p.task_id === taskId)?.status;
  };

  const completedCount = progress.filter((p) => p.status === 'completed').length;
  const pushedCount = progress.filter((p) => p.status === 'pushed').length;
  const totalTasks = allTasks.length;
  const dayComplete = totalTasks > 0 && completedCount === totalTasks - pushedCount && pushedCount <= 1;
  const canPush = pushedCount === 0;

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) return;
      const existing = getTaskStatus(taskId);
      if (existing === 'completed') {
        await supabase.from('chain_user_progress').delete()
          .eq('user_id', user.id).eq('task_id', taskId).eq('day_date', selectedDate).eq('status', 'completed');
      } else {
        if (existing === 'pushed') {
          await supabase.from('chain_user_progress').delete()
            .eq('user_id', user.id).eq('task_id', taskId).eq('day_date', selectedDate);
        }
        await supabase.from('chain_user_progress').insert({
          user_id: user.id, task_id: taskId, day_date: selectedDate, status: 'completed',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chain-progress'] });
      queryClient.invalidateQueries({ queryKey: ['chain-streak'] });
    },
  });

  const pushMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) return;
      const existing = getTaskStatus(taskId);
      if (existing === 'pushed') {
        await supabase.from('chain_user_progress').delete()
          .eq('user_id', user.id).eq('task_id', taskId).eq('day_date', selectedDate);
      } else {
        if (existing === 'completed') {
          await supabase.from('chain_user_progress').delete()
            .eq('user_id', user.id).eq('task_id', taskId).eq('day_date', selectedDate);
        }
        await supabase.from('chain_user_progress').insert({
          user_id: user.id, task_id: taskId, day_date: selectedDate, status: 'pushed',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chain-progress'] });
      queryClient.invalidateQueries({ queryKey: ['chain-pushed'] });
      queryClient.invalidateQueries({ queryKey: ['chain-streak'] });
    },
  });

  const goToDay = (offset: number) => {
    const d = addDays(new Date(selectedDate + 'T00:00:00'), offset);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  return (
    <div className="min-h-screen pt-24 md:pt-32">
      <div className="container mx-auto max-w-[700px] px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Home
        </Link>

        <div className="mb-12">
          <p className="text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground mb-4">
            The Chain
          </p>
          <h1 className="font-serif italic text-4xl md:text-5xl leading-[1.15] mb-4">
            Don't break the chain
          </h1>
          <p className="text-sm text-muted-foreground leading-[1.8] max-w-lg">
            Five tasks a day. Complete them all — or push one to tomorrow. Keep the chain alive.
          </p>
        </div>

        {/* Day selector */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => goToDay(-1)} className="text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors">
            ← Prev
          </button>
          <div className="text-center">
            <p className="text-[13px] tracking-[0.05em]">
              {format(new Date(selectedDate + 'T00:00:00'), 'EEEE')}
            </p>
            <p className="text-[11px] tracking-[0.08em] uppercase text-muted-foreground mt-1">
              {format(new Date(selectedDate + 'T00:00:00'), 'MMMM d, yyyy')}
            </p>
          </div>
          <button onClick={() => goToDay(1)} className="text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors">
            Next →
          </button>
        </div>

        <div className="w-full h-px bg-border mb-8" />

        {/* Progress bar */}
        {totalTasks > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Progress</p>
              <p className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">
                {completedCount} / {totalTasks - pushedCount}
              </p>
            </div>
            <div className="w-full h-[2px] bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${totalTasks - pushedCount > 0 ? (completedCount / (totalTasks - pushedCount)) * 100 : 0}%` }}
              />
            </div>
            {dayComplete && (
              <div className="mt-4 flex items-center gap-2">
                <Flame className="h-4 w-4 text-accent" strokeWidth={1.5} />
                <p className="text-[12px] tracking-[0.08em] uppercase font-medium text-accent">
                  Day complete — chain holds
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tasks */}
        <div className="space-y-3">
          {allTasks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                No tasks scheduled for this day.
              </p>
            </div>
          ) : (
            allTasks.map((task) => {
              const status = getTaskStatus(task.id);
              const isCompleted = status === 'completed';
              const isPushed = status === 'pushed';
              const isPushedFromYesterday = pushedTaskIds.includes(task.id) && task.day_date !== selectedDate;

              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 border rounded-lg p-5 transition-all ${
                    isCompleted
                      ? 'border-accent/30 bg-accent/5'
                      : isPushed
                      ? 'border-border opacity-40'
                      : 'border-border bg-card'
                  }`}
                >
                  <button
                    onClick={() => !isPushed && completeMutation.mutate(task.id)}
                    disabled={isPushed}
                    className={`flex-shrink-0 w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                      isCompleted
                        ? 'border-accent bg-accent/20'
                        : 'border-border hover:border-foreground/30'
                    } ${isPushed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isCompleted && <Check className="h-3 w-3 text-accent" strokeWidth={2} />}
                  </button>

                  <span className={`flex-1 text-[14px] ${
                    isCompleted ? 'line-through opacity-50' : ''
                  } ${isPushed ? 'line-through' : ''}`}>
                    {task.title}
                    {isPushedFromYesterday && (
                      <span className="ml-2 text-[10px] tracking-[0.08em] uppercase text-muted-foreground">
                        (pushed)
                      </span>
                    )}
                  </span>

                  {!isCompleted && canPush && !isPushed && (
                    <button
                      onClick={() => pushMutation.mutate(task.id)}
                      className="flex-shrink-0 text-[10px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      title="Push to tomorrow"
                    >
                      <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  )}
                  {isPushed && (
                    <button
                      onClick={() => pushMutation.mutate(task.id)}
                      className="flex-shrink-0 text-[10px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Undo
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {canPush && allTasks.length > 0 && (
          <p className="mt-6 text-[11px] text-muted-foreground text-center">
            You can push 1 task to tomorrow →
          </p>
        )}
      </div>

      <div className="mt-24 md:mt-32 w-full h-px bg-border" />
      <footer className="px-6 py-12 text-center">
        <p className="text-[11px] text-muted-foreground tracking-[0.08em] uppercase font-medium">
          ROBBETHECOACH — FOUNDER OF ZWEET CLUB
        </p>
      </footer>
    </div>
  );
};

export default TheChain;
