import { describe, expect, it } from 'vitest';
import { defaultDose, formatEmom, parseEmom, parseSetsReps } from './feed';

describe('Feed input helpers', () => {
  it('reads sets × reps however it is typed', () => {
    expect(parseSetsReps('3 × 6–8')).toEqual({ sets: 3, reps: '6–8' });
    expect(parseSetsReps('3x6-8')).toEqual({ sets: 3, reps: '6–8' });
    expect(parseSetsReps('2 x 45s')).toEqual({ sets: 2, reps: '45s' });
    expect(parseSetsReps('three sets')).toBeNull();
  });

  it('reads EMOM intervals', () => {
    expect(parseEmom('every 2:30')).toBe(150);
    expect(parseEmom('2.5 min')).toBe(150);
    expect(parseEmom('90')).toBe(90);
    expect(parseEmom('')).toBeNull();
    expect(parseEmom('soon')).toBeNaN();
    expect(formatEmom(150)).toBe('every 2:30');
  });

  it('suggests a standard dose per role and quality', () => {
    expect(defaultDose('main', 'strength', 'reps')).toEqual({ sets: 3, reps: '6–8' });
    expect(defaultDose('accessory', 'power', 'reps')).toEqual({ sets: 3, reps: '3–5' });
    expect(defaultDose('accessory', 'mobility', 'seconds')).toEqual({ sets: 2, reps: '45' });
  });
});
