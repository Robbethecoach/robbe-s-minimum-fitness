import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EXPERIENCE = ['Beginner', 'Intermediate', 'Advanced'];
const EQUIPMENT = [
  { value: 'gym', label: 'Yes — full gym' },
  { value: 'home', label: 'Home setup' },
  { value: 'minimal', label: 'Minimal equipment' },
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [equipment, setEquipment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (selectedDays.length < 4) {
      setError('Select at least 4 training days.');
      return;
    }
    if (!experience || !equipment) {
      setError('Please answer all questions.');
      return;
    }
    setError('');
    setLoading(true);

    const { error: dbError } = await supabase.from('user_profiles').upsert({
      user_id: user!.id,
      preferred_days: selectedDays,
      experience_level: experience.toLowerCase(),
      equipment_access: equipment,
      onboarding_completed: true,
      training_start_date: new Date().toISOString().split('T')[0],
    }, { onConflict: 'user_id' });

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    navigate('/move');
  };

  const pillClass = (active: boolean) =>
    `border px-4 py-2 text-[12px] tracking-[0.1em] uppercase font-light transition-all rounded-[2px] cursor-pointer ${
      active
        ? 'border-foreground/80 bg-foreground/10 text-foreground'
        : 'border-foreground/20 text-muted-foreground hover:border-foreground/40'
    }`;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 pt-14">
      <div className="w-full max-w-lg">
        <h1 className="font-serif italic text-3xl md:text-4xl mb-3 text-center">
          Let's set you up
        </h1>
        <p className="text-center text-sm text-muted-foreground font-light mb-12">
          A few quick questions to personalise your training plan.
        </p>

        {/* Training days */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.12em] uppercase font-light mb-4">
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
          <p className="text-[11px] text-muted-foreground mt-2 font-light">Pick 4–6 days</p>
        </div>

        {/* Experience */}
        <div className="mb-10">
          <p className="text-[12px] tracking-[0.12em] uppercase font-light mb-4">
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
          <p className="text-[12px] tracking-[0.12em] uppercase font-light mb-4">
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

        {error && <p className="text-sm font-light text-destructive mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full border border-foreground/80 bg-transparent px-8 py-[14px] text-[13px] font-light tracking-[0.1em] uppercase transition-colors hover:bg-foreground hover:text-primary-foreground disabled:opacity-40 rounded-[2px]"
        >
          {loading ? '...' : 'Start training'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
