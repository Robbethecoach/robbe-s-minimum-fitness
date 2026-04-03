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

  const sliderClass = 'w-full h-px appearance-none bg-[rgba(242,237,228,0.2)] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-runnable-track]:bg-transparent';

  const labelClass = 'text-[12px] font-light tracking-[0.1em] uppercase text-muted-foreground mb-4 block';

  return (
    <div className="min-h-screen px-6 pt-28 pb-20">
      <div className="container mx-auto max-w-lg">
        <h1 className="font-serif italic text-4xl md:text-5xl mb-16">Weekly overview</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-12">
          {/* Workouts */}
          <div>
            <label className={labelClass}>
              Workouts completed this week
            </label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWorkouts(n)}
                  className={`h-10 w-10 border text-sm font-light transition-colors rounded-[2px] ${
                    workouts === n
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-[rgba(242,237,228,0.2)] hover:border-[rgba(242,237,228,0.6)]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition */}
          <div>
            <label className={labelClass}>
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
            <label className={labelClass}>
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
            <label className={labelClass}>
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
            <label className={labelClass}>
              What felt hard this week?
            </label>
            <textarea
              value={hardText}
              onChange={(e) => setHardText(e.target.value)}
              rows={4}
              className="w-full border border-[rgba(242,237,228,0.2)] bg-transparent px-4 py-3 text-sm font-light text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[rgba(242,237,228,0.6)] resize-none rounded-[2px]"
              placeholder="Be honest with yourself..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="border border-foreground/80 bg-transparent px-8 py-[14px] text-[13px] font-light tracking-[0.1em] uppercase transition-colors hover:bg-foreground hover:text-primary-foreground disabled:opacity-40 self-start rounded-[2px]"
          >
            {submitting ? 'Saving...' : 'Submit week'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WeeklyOverview;
