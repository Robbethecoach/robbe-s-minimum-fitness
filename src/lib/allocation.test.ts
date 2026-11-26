import { describe, expect, it } from 'vitest';
import { allocateSessions, distributeExtraDays, planWeek, scheduleWeek, weekPenalty, type SessionCode } from './allocation';

const balanced = { strength: 3, mobility: 3, conditioning: 3 };
const sorted = (s: SessionCode[]) => [...s].sort();

describe('allocateSessions', () => {
  it('balanced on 4 days: A, B, zone 2 and intervals; on 5 days a mobility day joins', () => {
    expect(sorted(allocateSessions({ scores: balanced, days: 4 }))).toEqual(['A', 'B', 'E', 'F']);
    expect(sorted(allocateSessions({ scores: balanced, days: 5 }))).toEqual(['A', 'B', 'C', 'E', 'F']);
  });

  it('3 days: A, B and zone 2', () => {
    expect(sorted(allocateSessions({ scores: balanced, days: 3 }))).toEqual(['A', 'B', 'F']);
  });

  it('3 days: zone 2 becomes an intensive session once per block', () => {
    expect(sorted(allocateSessions({ scores: balanced, days: 3, weekInBlock: 2 }))).toEqual(['A', 'B', 'E']);
  });

  it('no intervals before the 30-minute test is done', () => {
    expect(allocateSessions({ scores: balanced, days: 3, weekInBlock: 2, canDoIntervals: false })).not.toContain('E');
    expect(allocateSessions({ scores: { strength: 1, mobility: 1, conditioning: 5 }, days: 6, canDoIntervals: false })).not.toContain('E');
  });

  it('conditioning focus on 4 days: 2× running, 2× strength (Robbe’s example)', () => {
    expect(sorted(allocateSessions({ scores: { strength: 2, mobility: 2, conditioning: 5 }, days: 4 }))).toEqual(['A', 'B', 'E', 'F']);
  });

  it('mobility focus gets standalone mobility days', () => {
    expect(sorted(allocateSessions({ scores: { strength: 2, mobility: 5, conditioning: 2 }, days: 4 }))).toEqual(['A', 'B', 'C', 'F']);
    expect(sorted(allocateSessions({ scores: { strength: 2, mobility: 5, conditioning: 2 }, days: 5 }))).toEqual(['A', 'B', 'C', 'D', 'F']);
  });

  it('three strength sessions switch to the U1 · U2 · L split', () => {
    expect(sorted(allocateSessions({ scores: { strength: 5, mobility: 2, conditioning: 2 }, days: 4 }))).toEqual(['F', 'L', 'U1', 'U2']);
  });

  it('always keeps strength twice and zone 2 once', () => {
    for (let days = 3; days <= 6; days++) {
      const s = allocateSessions({ scores: { strength: 1, mobility: 5, conditioning: 5 }, days });
      expect(s).toHaveLength(days);
      expect(s.filter((x) => ['A', 'B', 'U1', 'U2', 'L'].includes(x)).length).toBeGreaterThanOrEqual(2);
      expect(s).toContain('F');
    }
  });

  it('a running goal fills the conditioning days with running-plan sessions', () => {
    expect(sorted(allocateSessions({ scores: balanced, days: 5, runningGoal: true }))).toEqual(['A', 'B', 'RUN', 'RUN', 'RUN']);
  });

  it('distributes extra days in proportion to the scores', () => {
    expect(distributeExtraDays({ strength: 5, mobility: 2, conditioning: 2 }, 1)).toEqual({ strength: 1, mobility: 0, conditioning: 0 });
    expect(distributeExtraDays({ strength: 3, mobility: 3, conditioning: 3 }, 2)).toEqual({ strength: 0, mobility: 1, conditioning: 1 });
  });
});

describe('scheduleWeek', () => {
  it('uses only the preferred days', () => {
    const week = scheduleWeek(['A', 'B', 'F'], ['Mon', 'Wed', 'Fri']);
    expect(week.filter((d) => d.session).map((d) => d.day)).toEqual(['Mon', 'Wed', 'Fri']);
  });

  it('never puts intervals the day before a leg session when it can be avoided', () => {
    const week = scheduleWeek(['A', 'B', 'E', 'F'], ['Mon', 'Tue', 'Thu', 'Fri']);
    const sessions = week.map((d) => d.session);
    for (let i = 0; i < 7; i++) {
      if (sessions[i] === 'E') expect(['A', 'B', 'L']).not.toContain(sessions[(i + 1) % 7]);
    }
  });

  it('spreads hard days on consecutive preferred days', () => {
    const week = planWeek({ scores: { strength: 2, mobility: 2, conditioning: 5 }, days: 4 }, ['Mon', 'Tue', 'Wed', 'Thu']);
    expect(weekPenalty(week.map((d) => d.session))).toBeLessThan(100);
  });
});
