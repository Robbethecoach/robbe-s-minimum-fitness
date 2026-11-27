import { describe, expect, it } from 'vitest';
import { planForNewMember, weekOfPlan } from './blocks';
import { weekTarget } from './strength';

const blocks = [
  { id: 'b1', block_number: 1, starts_on: '2026-11-02' },
  { id: 'b2', block_number: 2, starts_on: '2026-11-30' },
];

describe('planForNewMember', () => {
  it('joining in week 3: previous block for 6 weeks, deload in the last', () => {
    expect(planForNewMember(blocks, new Date('2026-12-15'))).toEqual({
      training_block_id: 'b1', block_start_date: '2026-12-15', block_weeks: 6, deload_week: 6,
    });
  });

  it('joining in week 2 or 4: 7 or 5 weeks, so the member lands on the next block start', () => {
    expect(planForNewMember(blocks, new Date('2026-12-08'))?.block_weeks).toBe(7);
    expect(planForNewMember(blocks, new Date('2026-12-23'))?.block_weeks).toBe(5);
  });

  it('joining in week 1: the current block from today', () => {
    expect(planForNewMember(blocks, new Date('2026-12-02'))).toMatchObject({ training_block_id: 'b2', block_weeks: 4 });
  });

  it('no previous block yet: the current block', () => {
    expect(planForNewMember([blocks[0]], new Date('2026-11-18'))).toMatchObject({ training_block_id: 'b1', block_weeks: 4 });
  });

  it('nothing published yet: no plan', () => {
    expect(planForNewMember([], new Date('2026-11-18'))).toBeNull();
  });
});

describe('long blocks', () => {
  it('counts weeks and ends after the last week', () => {
    expect(weekOfPlan(new Date('2026-12-15'), new Date('2026-12-15'), 6)).toBe(1);
    expect(weekOfPlan(new Date('2026-12-15'), new Date('2027-01-25'), 6)).toBe(6);
    expect(weekOfPlan(new Date('2026-12-15'), new Date('2027-01-26'), 6)).toBeNull();
  });

  it('alternates RIR 2 and RIR 1–2 after week 3, deload last', () => {
    expect([1, 2, 3, 4, 5, 6].map((w) => weekTarget(w, 6).label)).toEqual(['RIR 3', 'RIR 2', 'RIR 1–2', 'RIR 2', 'RIR 1–2', 'Deload · RIR 4']);
  });
});
