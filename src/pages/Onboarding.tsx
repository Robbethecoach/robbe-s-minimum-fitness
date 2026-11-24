import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MAX_DAYS, MIN_DAYS } from '@/lib/prescription';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EXPERIENCE = ['Beginner', 'Intermediate', 'Advanced'];
const EQUIPMENT = [
  { value: 'gym', label: 'Yes — full gym' },
  { value: 'home', label: 'Home setup' },
  { value: 'minimal', label: 'Minimal equipment' },
];
const FOCUS_AREAS = [
  { key: 'focus_strength', label: 'Strength' },
  { key: 'focus_conditioning', label: 'Conditioning' },
  { key: 'focus_mobility', label: 'Mobility' },
] as const;
const FOCUS_LEVELS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
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
  const [experience, setExperience] = useState('');
  const [equipment, setEquipment] = useState('');
  const [focus, setFocus] = useState<Record<FocusKey, number>>({
    focus_strength: 2,
    focus_conditioning: 2,
    focus_mobility: 2,
  });
  const [goal, setGoal] = useState('');
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [noRedFlags, setNoRedFlags] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (!experience || !equipment || (!noRedFlags && redFlags.length === 0)) {
      setError('Please answer all questions.');
      return;
    }
    setError('');
    setLoading(true);

    const { error: dbError } = await supabase.from('user_profiles').upsert({
      user_id: user!.id,
      // Stored in week order, so sessions are planned Monday → Sunday.
      preferred_days: [...selectedDays].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)),
      experience_level: experience.toLowerCase(),
      equipment_access: equipment,
      ...focus,
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
      const { error: planError } = await supabase.from('member_plans').insert({ user_id: user!.id });
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

    navigate('/move');
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

        {/* Experience */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.08em] uppercase font-medium mb-4">
            What is your training experience?
          </p>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE.map((level) => (
              <button
                key={level}
                onClick={() => setExperience(level)}
                className={pillClass(experience === level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.08em] uppercase font-medium mb-4">
            Do you have access to a gym with barbells?
          </p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEquipment(opt.value)}
                className={pillClass(equipment === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Focus */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.08em] uppercase font-medium mb-4">
            How much focus on each?
          </p>
          <div className="space-y-3">
            {FOCUS_AREAS.map((area) => (
              <div key={area.key} className="flex items-center justify-between gap-4">
                <span className="text-sm">{area.label}</span>
                <div className="flex gap-2">
                  {FOCUS_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setFocus((prev) => ({ ...prev, [area.key]: level.value }))}
                      className={pillClass(focus[area.key] === level.value)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
