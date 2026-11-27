import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addWeeks, differenceInWeeks, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { RETEST_WEEKS, THRESHOLD_TESTS, formatPace, hrRange, paceRange, parseMinSec, thresholdFromTest } from '@/lib/zones';

interface TestRow {
  id: string;
  test_type: string;
  distance_km: number | null;
  avg_hr: number | null;
  duration_sec: number | null;
  finish_hr: number | null;
  hr_after_1min: number | null;
  threshold_hr?: number | null;
  threshold_pace_sec?: number | null;
  report_path?: string | null;
  tested_on: string;
}

type Mode = 'run_30' | 'race_5k' | 'lactate' | 'walk_1600';

const MODES: { id: Mode; label: string }[] = [
  { id: 'run_30', label: '30-minute run' },
  { id: 'race_5k', label: '5 km best' },
  { id: 'lactate', label: 'Lactate test' },
  { id: 'walk_1600', label: '1.6 km walk' },
];

const SOURCE: Record<string, string> = {
  run_30: '30-minute run',
  race_5k: '5 km best',
  lactate: 'lactate test',
};

/** How old a 5 km best or lactate test may be before we ask for a fresh one. */
const MAX_AGE_WEEKS = 12;

const toNumber = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const validHr = (h: number | null) => !!h && h >= 60 && h <= 230;
const today = () => format(new Date(), 'yyyy-MM-dd');

/** The conditioning baseline: a threshold test (30-min run, 5 km best or lactate test) or the walk test. */
const ConditioningTest = ({ userId, tests }: { userId: string; tests: TestRow[] }) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('run_30');
  const [distance, setDistance] = useState('');
  const [hr, setHr] = useState('');
  const [time, setTime] = useState('');
  const [pace, setPace] = useState('');
  const [lt1Hr, setLt1Hr] = useState('');
  const [lt1Pace, setLt1Pace] = useState('');
  const [testedOn, setTestedOn] = useState(today());
  const [file, setFile] = useState<File | null>(null);
  const [walkMin, setWalkMin] = useState('');
  const [walkSec, setWalkSec] = useState('');
  const [hrAfter, setHrAfter] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const latest = tests[0];
  const latestThreshold = tests.find((t) => THRESHOLD_TESTS.includes(t.test_type) && thresholdFromTest(t));
  const retestDue = latest ? addWeeks(new Date(latest.tested_on), RETEST_WEEKS) : null;

  const save = useMutation({
    mutationFn: async () => {
      let row: Record<string, unknown>;
      if (mode === 'run_30') {
        row = { test_type: 'run_30', distance_km: toNumber(distance), avg_hr: toNumber(hr), duration_sec: 1800 };
      } else if (mode === 'race_5k') {
        row = { test_type: 'race_5k', distance_km: 5, duration_sec: parseMinSec(time), avg_hr: toNumber(hr), tested_on: testedOn };
      } else if (mode === 'lactate') {
        let report_path: string | null = null;
        if (file) {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
          const path = `${userId}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('test-reports').upload(path, file, { contentType: file.type });
          if (upErr) throw upErr;
          report_path = path;
        }
        row = {
          test_type: 'lactate',
          threshold_pace_sec: parseMinSec(pace),
          threshold_hr: toNumber(hr),
          lt1_hr: toNumber(lt1Hr),
          lt1_pace_sec: lt1Pace ? parseMinSec(lt1Pace) : null,
          report_path,
          tested_on: testedOn,
        };
      } else {
        row = {
          test_type: 'walk_1600',
          distance_km: 1.6,
          duration_sec: (toNumber(walkMin) ?? 0) * 60 + (toNumber(walkSec) ?? 0),
          finish_hr: toNumber(hr),
          hr_after_1min: toNumber(hrAfter),
        };
      }
      const { error: dbError } = await supabase.from('conditioning_tests').insert({ user_id: userId, ...row } as never);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      setOpen(false);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['conditioning_tests'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const tooOld = (mode === 'race_5k' || mode === 'lactate') && differenceInWeeks(new Date(), new Date(testedOn)) > MAX_AGE_WEEKS;

  const submit = () => {
    const h = toNumber(hr);
    if (mode === 'run_30') {
      const d = toNumber(distance);
      if (!d || d <= 0 || d >= 20 || !validHr(h)) {
        return setError('Enter the distance in km (e.g. 6.4) and the average heart rate of the last 20 minutes.');
      }
    } else if (mode === 'race_5k') {
      const t = parseMinSec(time);
      if (!t || t < 12 * 60 || t > 59 * 60 || !validHr(h)) {
        return setError('Enter your 5 km time as minutes:seconds (e.g. 24:30) and your average heart rate.');
      }
      if (tooOld) return setError(`That's more than ${MAX_AGE_WEEKS} weeks ago. Do a fresh 5 km or the 30-minute run instead.`);
    } else if (mode === 'lactate') {
      const p = parseMinSec(pace);
      if (!p || p < 120 || p > 900 || !validHr(h)) {
        return setError('Enter the pace (e.g. 4:45 /km) and heart rate at your second threshold (LT2) from the report.');
      }
      if (lt1Pace && !parseMinSec(lt1Pace)) return setError('Write the LT1 pace as minutes:seconds, or leave it empty.');
      if (file && file.size > 10 * 1024 * 1024) return setError('The report can be 10 MB at most.');
      if (tooOld) return setError(`That's more than ${MAX_AGE_WEEKS} weeks ago. A fresh test or the 30-minute run gives better zones.`);
    } else if (!toNumber(walkMin) || !validHr(h)) {
      return setError('Enter your walking time and your heart rate at the finish.');
    }
    setError('');
    save.mutate();
  };

  const zones = latestThreshold ? thresholdFromTest(latestThreshold) : null;
  const z2Pace = zones ? paceRange(zones.thresholdSpeedKmh, 2) : null;
  const z2Hr = zones ? hrRange(zones.thresholdHr, 2) : null;

  const inputClass = 'mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground/40';
  const labelClass = 'text-[11px] text-muted-foreground';
  const hint = 'text-[12px] text-muted-foreground leading-relaxed';

  return (
    <section className="mb-16 rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium">Your engine</h3>
        {retestDue && <span className="text-[12px] text-muted-foreground">Retest from {format(retestDue, 'd MMM')}</span>}
      </div>

      {zones && z2Pace && z2Hr && latestThreshold ? (
        <div className="mt-3 space-y-1 text-sm">
          <p>Threshold: <b>{formatPace(zones.thresholdPaceSec)} /km</b> · <b>{zones.thresholdHr} bpm</b></p>
          <p>Zone 2: <b>{formatPace(z2Pace.fast!)}–{formatPace(z2Pace.slow!)} /km</b> · <b>{z2Hr.low}–{z2Hr.high} bpm</b></p>
          <p className="text-[12px] text-muted-foreground">From your {SOURCE[latestThreshold.test_type]} of {format(new Date(latestThreshold.tested_on), 'd MMM')}.</p>
        </div>
      ) : latest ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Walk test logged. Train easy by heart rate and the talk test; intervals start once you've logged a running test.
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
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setError(''); }}
                className={`rounded-lg border px-3 py-2.5 text-[12px] tracking-[0.06em] uppercase ${mode === m.id ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-muted-foreground'}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'run_30' && (
            <>
              <p className={hint}>
                Rested, flat route, heart-rate watch. Warm up 10–15 min with 3–4 short pick-ups, then run 30 minutes as fast as you can hold evenly. Don't start too fast.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>Distance in 30 min (km)
                  <input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Avg HR, last 20 min
                  <input inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} className={inputClass} />
                </label>
              </div>
            </>
          )}

          {mode === 'race_5k' && (
            <>
              <p className={hint}>
                A 5 km race or all-out solo 5 km from the last {MAX_AGE_WEEKS} weeks, run with a heart-rate watch. We convert it to your threshold.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>5 km time (min:sec)
                  <input placeholder="24:30" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Average HR
                  <input inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} className={inputClass} />
                </label>
                <label className={`${labelClass} col-span-2`}>Date of the run
                  <input type="date" max={today()} value={testedOn} onChange={(e) => setTestedOn(e.target.value)} className={inputClass} />
                </label>
              </div>
            </>
          )}

          {mode === 'lactate' && (
            <>
              <p className={hint}>
                Did a lactate test on a treadmill or track in the last {MAX_AGE_WEEKS} weeks? Copy the values at your thresholds from the report and add the report itself.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>LT2 pace (min:sec /km)
                  <input placeholder="4:45" value={pace} onChange={(e) => setPace(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>LT2 heart rate
                  <input inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>LT1 pace (optional)
                  <input placeholder="5:40" value={lt1Pace} onChange={(e) => setLt1Pace(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>LT1 heart rate (optional)
                  <input inputMode="numeric" value={lt1Hr} onChange={(e) => setLt1Hr(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Test date
                  <input type="date" max={today()} value={testedOn} onChange={(e) => setTestedOn(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Report (PDF or photo)
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-[12px] file:mr-2 file:rounded-md file:border file:border-border file:bg-background file:px-2 file:py-2 file:text-[11px] file:uppercase"
                  />
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">LT2 is the second threshold (often around 4 mmol/L). LT1 is the first, where lactate starts to rise.</p>
            </>
          )}

          {mode === 'walk_1600' && (
            <>
              <p className={hint}>
                Can't run 30 minutes yet? Walk 1.6 km on a flat route as fast as you can without running.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>Time (min)
                  <input inputMode="numeric" value={walkMin} onChange={(e) => setWalkMin(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Time (sec)
                  <input inputMode="numeric" value={walkSec} onChange={(e) => setWalkSec(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>HR at the finish
                  <input inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>HR 1 min later
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
