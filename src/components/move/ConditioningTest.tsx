import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addWeeks, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { RETEST_WEEKS, formatPace, fromThirtyMinuteTest, hrRange, paceRange } from '@/lib/zones';

interface TestRow {
  id: string;
  test_type: string;
  distance_km: number | null;
  avg_hr: number | null;
  duration_sec: number | null;
  finish_hr: number | null;
  hr_after_1min: number | null;
  tested_on: string;
}

const toNumber = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

/** The conditioning baseline: 30-minute test (or walk test), zones and the retest date. */
const ConditioningTest = ({ userId, tests }: { userId: string; tests: TestRow[] }) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'run_30' | 'walk_1600'>('run_30');
  const [distance, setDistance] = useState('');
  const [hr, setHr] = useState('');
  const [walkMin, setWalkMin] = useState('');
  const [walkSec, setWalkSec] = useState('');
  const [hrAfter, setHrAfter] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const latest = tests[0];
  const latestRun = tests.find((t) => t.test_type === 'run_30');
  const retestDue = latest ? addWeeks(new Date(latest.tested_on), RETEST_WEEKS) : null;

  const save = useMutation({
    mutationFn: async () => {
      const row =
        mode === 'run_30'
          ? { user_id: userId, test_type: 'run_30', distance_km: toNumber(distance), avg_hr: toNumber(hr), duration_sec: 1800 }
          : {
              user_id: userId,
              test_type: 'walk_1600',
              distance_km: 1.6,
              duration_sec: (toNumber(walkMin) ?? 0) * 60 + (toNumber(walkSec) ?? 0),
              finish_hr: toNumber(hr),
              hr_after_1min: toNumber(hrAfter),
            };
      const { error: dbError } = await supabase.from('conditioning_tests').insert(row);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['conditioning_tests'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const submit = () => {
    if (mode === 'run_30') {
      const d = toNumber(distance);
      const h = toNumber(hr);
      if (!d || d <= 0 || d >= 20 || !h || h < 60 || h > 230) {
        setError('Enter the distance in km (e.g. 6.4) and the average heart rate of the last 20 minutes.');
        return;
      }
    } else if (!toNumber(walkMin) || !toNumber(hr)) {
      setError('Enter your walking time and your heart rate at the finish.');
      return;
    }
    setError('');
    save.mutate();
  };

  const zones = latestRun?.distance_km && latestRun.avg_hr ? fromThirtyMinuteTest(Number(latestRun.distance_km), latestRun.avg_hr) : null;
  const z2Pace = zones ? paceRange(zones.thresholdSpeedKmh, 2) : null;
  const z2Hr = zones ? hrRange(zones.thresholdHr, 2) : null;

  const inputClass = 'h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground/40';

  return (
    <section className="mb-16 rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium">Your engine</h3>
        {retestDue && <span className="text-[12px] text-muted-foreground">Retest from {format(retestDue, 'd MMM')}</span>}
      </div>

      {zones && z2Pace && z2Hr ? (
        <div className="mt-3 space-y-1 text-sm">
          <p>Threshold: <b>{formatPace(zones.thresholdPaceSec)} /km</b> · <b>{zones.thresholdHr} bpm</b></p>
          <p>Zone 2: <b>{formatPace(z2Pace.fast!)}–{formatPace(z2Pace.slow!)} /km</b> · <b>{z2Hr.low}–{z2Hr.high} bpm</b></p>
        </div>
      ) : latest ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Walk test logged. Train easy by heart rate and the talk test; intervals start once you've done the 30-minute run.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          One honest test sets every pace and heart rate in your plan. Until then, conditioning stays easy: no intervals.
        </p>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-4 rounded-lg border border-foreground px-4 py-2.5 text-[12px] tracking-[0.08em] uppercase font-medium">
          {latest ? 'Log a retest' : 'Log your test'}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['run_30', 'walk_1600'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg border px-3 py-2.5 text-[12px] tracking-[0.06em] uppercase ${mode === m ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-muted-foreground'}`}
              >
                {m === 'run_30' ? '30-minute run' : '1.6 km walk'}
              </button>
            ))}
          </div>
          {mode === 'run_30' ? (
            <>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Rested, flat route, heart-rate watch. Warm up 10–15 min with 3–4 short pick-ups, then run 30 minutes as fast as you can hold evenly. Don't start too fast.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-muted-foreground">Distance in 30 min (km)
                  <input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} className={inputClass} />
                </label>
                <label className="text-[11px] text-muted-foreground">Avg HR, last 20 min
                  <input inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} className={inputClass} />
                </label>
              </div>
            </>
          ) : (
            <>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Can't run 30 minutes yet? Walk 1.6 km on a flat route as fast as you can without running.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-muted-foreground">Time (min)
                  <input inputMode="numeric" value={walkMin} onChange={(e) => setWalkMin(e.target.value)} className={inputClass} />
                </label>
                <label className="text-[11px] text-muted-foreground">Time (sec)
                  <input inputMode="numeric" value={walkSec} onChange={(e) => setWalkSec(e.target.value)} className={inputClass} />
                </label>
                <label className="text-[11px] text-muted-foreground">HR at the finish
                  <input inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} className={inputClass} />
                </label>
                <label className="text-[11px] text-muted-foreground">HR 1 min later
                  <input inputMode="numeric" value={hrAfter} onChange={(e) => setHrAfter(e.target.value)} className={inputClass} />
                </label>
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={save.isPending} className="flex-1 rounded-lg bg-primary px-4 py-3 text-[12px] tracking-[0.08em] uppercase font-medium text-primary-foreground disabled:opacity-40">
              {save.isPending ? '...' : 'Save test'}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-3 text-[12px] tracking-[0.08em] uppercase">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ConditioningTest;
