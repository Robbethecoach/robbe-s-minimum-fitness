import { useEffect, useRef, useState } from 'react';

/**
 * EMOM: every `intervalSec` seconds the member does the reps; the rest of the round is rest.
 * One round per set. Optional: it standardises rest so progression isn't blurred by longer breaks.
 */
const EmomTimer = ({ intervalSec, rounds }: { intervalSec: number; rounds: number }) => {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedElapsed, setPausedElapsed] = useState(0);
  const [now, setNow] = useState(Date.now());
  const lastRound = useRef(0);
  const audio = useRef<AudioContext | null>(null);

  const running = startedAt !== null;
  const elapsed = (running ? (now - startedAt) / 1000 : 0) + pausedElapsed;
  const total = intervalSec * rounds;
  const finished = elapsed >= total;
  const round = Math.min(rounds, Math.floor(elapsed / intervalSec) + 1);
  const left = finished ? 0 : intervalSec - (elapsed % intervalSec);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  // Beep (and vibrate) at the start of every round.
  useEffect(() => {
    if (!running || finished) return;
    if (round !== lastRound.current) {
      lastRound.current = round;
      try {
        const ctx = audio.current ?? new AudioContext();
        audio.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.2;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch {
        // Sound isn't available everywhere; the timer still works.
      }
      navigator.vibrate?.(200);
    }
  }, [round, running, finished]);

  useEffect(() => {
    if (finished && running) {
      setPausedElapsed(total);
      setStartedAt(null);
    }
  }, [finished, running, total]);

  const start = () => {
    setNow(Date.now());
    setStartedAt(Date.now());
  };
  const pause = () => {
    setPausedElapsed(elapsed);
    setStartedAt(null);
  };
  const reset = () => {
    setStartedAt(null);
    setPausedElapsed(0);
    lastRound.current = 0;
  };

  const mm = Math.floor(left / 60);
  const ss = Math.floor(left % 60);

  return (
    <div className="mt-4 rounded-2xl bg-primary p-5 text-primary-foreground">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.14em] opacity-70">EMOM · every {Math.floor(intervalSec / 60)}:{String(intervalSec % 60).padStart(2, '0')}</span>
        <span className="text-[12px] opacity-70">{finished ? 'Done' : `Round ${round} of ${rounds}`}</span>
      </div>
      <p className="mt-2 text-center font-serif text-6xl tabular-nums" aria-live="polite">
        {finished ? '0:00' : `${mm}:${String(ss).padStart(2, '0')}`}
      </p>
      <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${rounds}, minmax(0, 1fr))` }}>
        {Array.from({ length: rounds }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-full ${i + 1 < round || finished ? 'bg-primary-foreground' : i + 1 === round && elapsed > 0 ? 'bg-accent' : 'bg-primary-foreground/20'}`} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {running ? (
          <button onClick={pause} className="h-11 rounded-xl bg-primary-foreground text-sm font-medium text-primary">Pause</button>
        ) : (
          <button onClick={start} disabled={finished} className="h-11 rounded-xl bg-primary-foreground text-sm font-medium text-primary disabled:opacity-40">{elapsed > 0 ? 'Resume' : 'Start'}</button>
        )}
        <button onClick={reset} className="h-11 rounded-xl border border-primary-foreground/30 text-sm">Reset</button>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed opacity-70">On the beep, do your reps. The rest of the round is rest. Same rest every week, so a heavier weight means you really got stronger.</p>
    </div>
  );
};

export default EmomTimer;
