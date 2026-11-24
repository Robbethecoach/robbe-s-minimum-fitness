# RTC APP — The minimum viable workout

Membership app for the robbethecoach brand. Product brief lives in the claude.ai project "Minimum fitness" (RTC-APP-project-brief.md).

## Product rules
- No chat and no bot voice. The app gives short plan suggestions with a one-line reason; members accept or dismiss them.
- Everyone follows the same session variation (`workout_blocks` + `exercises` = template). Per member: focus (sets), deload timing (`member_plans.deload_week`) and overrides from accepted suggestions (`member_exercise_overrides`).
- Escalation is a hard rule: pain, injury, under-eating, cycle issues, pregnancy or medical flags → refer to GP / physio / dietitian, never a training tweak.
- Robbe never talks to members. He feeds the method via `robbe_questions` / `robbe_answers` and `method_rules`.

## Stack
React 18 + Vite + TypeScript, Tailwind + shadcn/ui, TanStack Query, Supabase. Package manager: bun (`bun install`, `bun run build`, `bunx vitest run`).

## Conventions
- Prescription logic lives in `src/lib/prescription.ts` (pure, tested). Numbers marked PLACEHOLDER are Robbe's to set.
- Schema changes: new file in `supabase/migrations/`, RLS on every table, admin checks through `public.has_role(auth.uid(), 'admin')`.
- Members change suggestion status only through `public.decide_suggestion()`.
- After a schema change, update `src/integrations/supabase/types.ts` (regenerate with `supabase gen types typescript` once the project is in Robbe's own Supabase org).
- Brand: Broken White #e7e6e4, Dark Blue #0a1432, dark mode default, serif italic headings, minimal UI, no gradients.
