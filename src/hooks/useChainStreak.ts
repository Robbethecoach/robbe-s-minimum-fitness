import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';

export const useChainStreak = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chain-streak', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      // Get all tasks grouped by date and all user progress
      const { data: allTasks } = await supabase
        .from('chain_tasks')
        .select('id, day_date')
        .order('day_date', { ascending: false });

      const { data: allProgress } = await supabase
        .from('chain_user_progress')
        .select('task_id, day_date, status')
        .eq('user_id', user.id);

      if (!allTasks || !allProgress) return 0;

      // Group tasks by date
      const tasksByDate: Record<string, string[]> = {};
      allTasks.forEach((t) => {
        if (!tasksByDate[t.day_date]) tasksByDate[t.day_date] = [];
        tasksByDate[t.day_date].push(t.id);
      });

      // Group progress by date
      const progressByDate: Record<string, { completed: string[]; pushed: string[] }> = {};
      allProgress.forEach((p) => {
        if (!progressByDate[p.day_date]) progressByDate[p.day_date] = { completed: [], pushed: [] };
        if (p.status === 'completed') progressByDate[p.day_date].completed.push(p.task_id);
        if (p.status === 'pushed') progressByDate[p.day_date].pushed.push(p.task_id);
      });

      // Count streak going backwards from today
      let streak = 0;
      let checkDate = new Date();

      for (let i = 0; i < 365; i++) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const dayTasks = tasksByDate[dateStr];

        // If no tasks scheduled for this day, skip it (doesn't break chain)
        if (!dayTasks || dayTasks.length === 0) {
          checkDate = subDays(checkDate, 1);
          continue;
        }

        const dayProgress = progressByDate[dateStr] || { completed: [], pushed: [] };
        const pushedCount = dayProgress.pushed.length;
        const requiredCompletions = dayTasks.length - pushedCount;

        if (pushedCount > 1) break; // More than 1 push = broken
        if (dayProgress.completed.length >= requiredCompletions && requiredCompletions > 0) {
          streak++;
        } else {
          break;
        }

        checkDate = subDays(checkDate, 1);
      }

      return streak;
    },
    enabled: !!user,
  });
};
