// Which block a member trains, and which week of it.
//
// Decided 27 Nov 2026: a published block sets weeks 1–4 for everyone from its start date.
// A member who joins mid-block starts with the PREVIOUS block (week 1 = baseline) and stays on it
// until the next block starts, then joins everyone else. Joining in week 3 → 6 weeks
// (5–7 weeks depending on the join week). Joining in week 1, or when there is no previous block,
// → the current block from today. The deload is always the last week of the member's block.

import { addDays, differenceInCalendarDays, format } from 'date-fns';

export interface PublishedBlock {
  id: string;
  block_number: number;
  starts_on: string;
}

export interface MemberBlockPlan {
  training_block_id: string;
  block_start_date: string;
  block_weeks: number;
  deload_week: number;
}

export const BLOCK_DAYS = 28;

export const planForNewMember = (published: PublishedBlock[], today: Date): MemberBlockPlan | null => {
  const started = published
    .filter((b) => differenceInCalendarDays(today, new Date(b.starts_on)) >= 0)
    .sort((a, b) => (a.starts_on < b.starts_on ? 1 : -1));
  const current = started[0];
  if (!current) return null;

  const daysIn = differenceInCalendarDays(today, new Date(current.starts_on));
  const nextStart = addDays(new Date(current.starts_on), BLOCK_DAYS);
  const daysUntilNext = Math.max(1, differenceInCalendarDays(nextStart, today));
  const previous = started.find((b) => b.block_number === current.block_number - 1) ?? started[1];
  const start = format(today, 'yyyy-MM-dd');

  if (daysIn < 7 || !previous) {
    return { training_block_id: current.id, block_start_date: start, block_weeks: 4, deload_week: 4 };
  }
  const weeks = Math.min(8, Math.max(4, Math.ceil(daysUntilNext / 7) + 4));
  return { training_block_id: previous.id, block_start_date: start, block_weeks: weeks, deload_week: weeks };
};

/** Week of the member's block (1…blockWeeks), counted from its start; null once it has ended. */
export const weekOfPlan = (start: Date, today: Date, blockWeeks: number): number | null => {
  const days = differenceInCalendarDays(today, start);
  if (days < 0) return 1;
  const week = Math.floor(days / 7) + 1;
  return week > blockWeeks ? null : week;
};
