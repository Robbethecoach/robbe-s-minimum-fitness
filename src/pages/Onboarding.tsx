import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MAX_DAYS, MIN_DAYS, SESSION_NAMES, planWeek } from '@/lib/allocation';
import { planForNewMember } from '@/lib/blocks';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Level is measured from the weights logged in week 1, so there's no experience question.
const FOCUS_AREAS = [
  { key: 'focus_strength', label: 'Strength', hint: 'lifting, getting stronger' },
  { key: 'focus_mobility', label: 'Mobility', hint: 'range, joints, moving well' },
  { key: 'focus_conditioning', label: 'Conditioning', hint: 'running, engine, endurance' },
] as const;
const FOCUS_SCORES = [1, 2, 3, 4, 5];
const RUNNING_GOALS = [
  { value: '', label: 'No goal' },
  { value: '5k', label: '5 km' },
  { value: '10k', label: '10 km' },
  { value: 'half_marathon', label: 'Half marathon' },
  { value: 'marathon', label: 'Marathon' },
  { value: 'fitter', label: 'Fitter' },
];
type FocusKey = (typeof FOCUS_AREAS)[number]['key'];

// READ step: anything here means "check with a professional first", never a training tweak.
const RED_FLAGS = [
  { value: 'pain', label: 'Pain when moving', refer: 'physio' },
  { value: 'injury', label: 'Recent or ongoing injury', refer: 'physio' },
  { value: 'pregnancy', label: 'Pregnant or postpartum', refer: 'gp' },
  { value: 'medical', label: 'Medical condition or medication', refer: 'gp' },
] as const;

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [hasGym, setHasGym] = useState(false);
  const [runningGoal, setRunningGoal] = useState('');
  const [focus, setFocus] = useState<Record<FocusKey, number>>({
    focus_strength: 3,
    focus_conditioning: 3,
    focus_mobility: 3,
  });
  const [goal, setGoal] = useState('');
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [noRedFlags, setNoRedFlags] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const weekPreview = useMemo(() => {
    if (selectedDays.length < MIN_DAYS || selectedDays.length > MAX_DAYS) return [];
    return planWeek(
      {
        scores: { strength: focus.focus_strength, mobility: focus.focus_mobility, conditioning: focus.focus_conditioning },
        days: selectedDays.length,
        // The running plan only starts after the 30-minute test, so the preview shows the standard week.
        canDoIntervals: false,
      },
      selectedDays,
    );
  }, [selectedDays, focus]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleRedFlag = (flag: string) => {
    setNoRedFlags(false);
    setRedFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  };

  const handleSubmit = async () => {
    if (selectedDays.length < MIN_DAYS || selectedDays.length > MAX_DAYS) {
      setError(`Select ${MIN_DAYS} to ${MAX_DAYS} training days.`);
      return;
    }
    if (!hasGym || (!noRedFlags && redFlags.length === 0)) {
      setError('Please answer all questions.');
      return;
    }
    setError('');
    setLoading(true);

    const { error: dbError } = await supabase.from('user_profiles').upsert({
      user_id: user!.id,
      // Stored in week order, so sessions are planned Monday → Sunday.
      preferred_days: [...selectedDays].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)),
      equipment_access: 'gym',
      ...focus,
      conditioning_goal: runningGoal || null,
      goal: goal.trim() || null,
      onboarding_completed: true,
      training_start_date: new Date().toISOString().split('T')[0],
    }, { onConflict: 'user_id' });

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    // One active plan per member; keep an existing one if onboarding is redone.
    const { data: activePlan } = await supabase
      .from('member_plans')
      .select('id')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!activePlan) {
      // Joining mid-block: start with the previous block until the next one begins (src/lib/blocks.ts).
      const { data: published } = await supabase.from('training_blocks').select('id, block_number, starts_on').eq('status', 'published');
      const blockPlan = planForNewMember(published ?? [], new Date());
      const { error: planError } = await supabase.from('member_plans').insert({ user_id: user!.id, ...(blockPlan ?? {}) });
      if (planError) {
        setError(planError.message);
        setLoading(false);
        return;
      }
    }

    if (redFlags.length > 0) {
      const { error: flagError } = await supabase.from('escalation_flags').insert(
        redFlags.map((flag) => ({
          user_id: user!.id,
          source: 'onboarding',
          category: flag,
          refer_to: RED_FLAGS.find((f) => f.value === flag)?.refer,
        })),
      );
      if (flagError) {
        setError(flagError.message);
        setLoading(false);
        return;
      }
    }

    navigate('/move/overview');
  };

  const pillClass = (active: boolean) =>
    `border px-4 py-2 text-[12px] tracking-[0.08em] uppercase font-medium transition-all rounded-lg cursor-pointer ${
      active
        ? 'border-accent bg-accent text-accent-foreground'
        : 'border-border text-muted-foreground hover:border-foreground/30'
    }`;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 pt-14">
      <div className="w-full max-w-lg">
        <h1 className="font-serif italic text-3xl md:text-4xl mb-3 text-center">
          Let's set you up
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-12">
          A few quick questions to personalise your training plan.
        </p>

        {/* Training days */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.08em] uppercase font-medium mb-4">
            Which days do you prefer to train?
          </p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={pillClass(selectedDays.includes(day))}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Pick {MIN_DAYS}–{MAX_DAYS} days</p>
        </div>

        {/* Equipment */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.08em] uppercase font-medium mb-4">
            Where do you train?
          </p>
          <button onClick={() => setHasGym((v) => !v)} className={pillClass(hasGym)}>
            I have a gym with free weights
          </button>
          <p className="text-[11px] text-muted-foreground mt-2">The plan needs a functional gym; free weights are enough.</p>
        </div>

        {/* Focus */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.08em] uppercase font-medium mb-2">
            How important is each one to you right now?
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Everyone does the same sessions. How much time goes to each part depends on you.
          </p>
          <div className="space-y-4">
            {FOCUS_AREAS.map((area) => (
              <div key={area.key}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm">{area.label}</span>
                  <span className="text-[11px] text-muted-foreground">{area.hint}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {FOCUS_SCORES.map((score) => (
                    <button
                      key={score}
                      aria-label={`${area.label} ${score} of 5`}
                      onClick={() => setFocus((prev) => ({ ...prev, [area.key]: score }))}
                      className={pillClass(focus[area.key] === score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {weekPreview.length > 0 && (
            <div className="mt-6 rounded-xl bg-primary text-primary-foreground p-5">
              <p className="text-[11px] tracking-[0.12em] uppercase opacity-70 mb-3">Your week</p>
              <div className="grid grid-cols-7 gap-1.5">
                {weekPreview.map((d) => (
                  <div key={d.day} className={`rounded-lg px-1 py-2 text-center ${d.session ? 'bg-accent' : 'opacity-40'}`}>
                    <div className="text-[10px] uppercase tracking-[0.08em] opacity-80">{d.day}</div>
                    <div className="font-serif text-lg leading-tight">{d.session ?? '·'}</div>
                    <div className="text-[9px] opacity-80 leading-tight">{d.session ? SESSION_NAMES[d.session] : 'rest'}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] opacity-70 mt-3">
                A and B are always in. Mobility also runs as a block inside A and B. Intervals are added once you've done the 30-minute test.
              </p>
            </div>
          )}
        </div>

        {/* Running goal */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.08em] uppercase font-medium mb-4">
            Training for a run?
          </p>
          <div className="flex flex-wrap gap-2">
            {RUNNING_GOALS.map((g) => (
              <button key={g.value || 'none'} onClick={() => setRunningGoal(g.value)} className={pillClass(runningGoal === g.value)}>
                {g.label}
              </button>
            ))}
          </div>
          {runningGoal && runningGoal !== 'fitter' && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Your running plan is built after your 30-minute test. Until then you get the standard conditioning sessions.
            </p>
          )}
        </div>

        {/* Goal */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.08em] uppercase font-medium mb-4">
            What do you want from the next 12 weeks? <span className="text-muted-foreground normal-case tracking-normal">(optional)</span>
          </p>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={280}
            rows={2}
            className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-foreground/30"
          />
        </div>

        {/* Red flags */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.08em] uppercase font-medium mb-4">
            Does any of this apply to you?
          </p>
          <div className="flex flex-wrap gap-2">
            {RED_FLAGS.map((flag) => (
              <button
                key={flag.value}
                onClick={() => toggleRedFlag(flag.value)}
                className={pillClass(redFlags.includes(flag.value))}
              >
                {flag.label}
              </button>
            ))}
            <button
              onClick={() => {
                setRedFlags([]);
                setNoRedFlags(true);
              }}
              className={pillClass(noRedFlags)}
            >
              None of these
            </button>
          </div>
          {redFlags.length > 0 && (
            <p className="text-[12px] text-muted-foreground mt-3">
              Please check with your GP or physio before you start training.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground px-8 py-[14px] text-[13px] font-medium tracking-[0.08em] uppercase transition-colors hover:bg-foreground/90 disabled:opacity-40 rounded-lg"
        >
          {loading ? '...' : 'Start training'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
