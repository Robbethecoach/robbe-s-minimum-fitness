import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WeeklyOverview = () => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState(0);
  const [nutrition, setNutrition] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [hardText, setHardText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase.from('weekly_checkins').insert({
      user_id: user.id,
      workouts_completed: workouts,
      nutrition_adherence: nutrition,
      sleep_quality: sleep,
      energy_levels: energy,
      hard_this_week: hardText,
    });

    if (error) {
      toast.error('Failed to save. Try again.');
    } else {
      toast.success('Week logged.');
      setWorkouts(0);
      setNutrition(5);
      setSleep(5);
      setEnergy(5);
      setHardText('');
    }
    setSubmitting(false);
  };

  const sliderClass = 'w-full h-1 appearance-none bg-border rounded-none cursor-pointer accent-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground';

  return (
    <div className="min-h-screen px-6 pt-24 pb-16">
      <div className="container mx-auto max-w-lg">
        <h1 className="font-serif text-4xl mb-12">Weekly overview</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-10">
          {/* Workouts */}
          <div>
            <label className="text-xs tracking-[0.1em] uppercase text-muted-foreground mb-3 block">
              Workouts completed this week
            </label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWorkouts(n)}
                  className={`h-10 w-10 border text-sm transition-colors ${
                    workouts === n
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:border-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition */}
          <div>
            <label className="text-xs tracking-[0.1em] uppercase text-muted-foreground mb-3 block">
              Nutrition adherence — {nutrition}/10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={nutrition}
              onChange={(e) => setNutrition(Number(e.target.value))}
              className={sliderClass}
            />
          </div>

          {/* Sleep */}
          <div>
            <label className="text-xs tracking-[0.1em] uppercase text-muted-foreground mb-3 block">
              Sleep quality — {sleep}/10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              className={sliderClass}
            />
          </div>

          {/* Energy */}
          <div>
            <label className="text-xs tracking-[0.1em] uppercase text-muted-foreground mb-3 block">
              Energy levels — {energy}/10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className={sliderClass}
            />
          </div>

          {/* Hard this week */}
          <div>
            <label className="text-xs tracking-[0.1em] uppercase text-muted-foreground mb-3 block">
              What felt hard this week?
            </label>
            <textarea
              value={hardText}
              onChange={(e) => setHardText(e.target.value)}
              rows={4}
              className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
              placeholder="Be honest with yourself..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="border border-foreground px-8 py-3 text-xs tracking-[0.12em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-40 self-start"
          >
            {submitting ? 'Saving...' : 'Submit week'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WeeklyOverview;
