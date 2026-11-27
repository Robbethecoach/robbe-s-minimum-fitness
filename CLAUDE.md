# RTC APP — The minimum viable workout

Membership app for the robbethecoach brand. Product brief lives in the claude.ai project "Minimum fitness" (RTC-APP-project-brief.md).

## Product rules
- No chat and no bot voice. The app gives short plan suggestions with a one-line reason; members accept or dismiss them.
- Everyone follows the same session variation (`workout_blocks` + `exercises` = Robbe's 4-week upload; `day_type` is the session code A–F, optionally U1/U2/L). Per member: focus scores 1–5 and 3–6 days decide which sessions (`src/lib/allocation.ts`), sets scale with the scores (min 2), loads come from logged sets (`src/lib/strength.ts`), deload timing (`member_plans.deload_week`) and overrides from accepted suggestions (`member_exercise_overrides`).
- Every set is logged with weight, reps and RIR (`exercise_sets`). No intervals before a 30-minute test exists (`conditioning_tests`).
- Escalation is a hard rule: pain, injury, under-eating, cycle issues, pregnancy or medical flags → refer to GP / physio / dietitian, never a training tweak.
- Robbe never talks to members. He feeds the method via `robbe_questions` / `robbe_answers` and `method_rules`.

## Stack
React 18 + Vite + TypeScript, Tailwind + shadcn/ui, TanStack Query, Supabase. Package manager: bun (`bun install`, `bun run build`, `bunx vitest run`).

## Conventions
- Plan logic lives in `src/lib/` (allocation, prescription, strength, zones, nutrition, session, feed), pure and tested. Numbers marked PLACEHOLDER are Robbe's to set.
- Robbe's Feed (`/feed`, admin only): exercise library (`exercise_library`: role main/accessory/extra, quality strength/mobility/power, region, pattern, unit, cues, regression/progression, superset ok, EMOM) and 4-week blocks (`training_blocks` → sessions in `workout_blocks` → placements in `exercises.library_id`). `src/lib/session.ts` orders sessions, pairs supersets, drops extras by focus or the member's session length (default 60 min, member is asked) and estimates duration.
- Schema changes: new file in `supabase/migrations/`, RLS on every table, admin checks through `public.has_role(auth.uid(), 'admin')`.
- Members change suggestion status only through `public.decide_suggestion()`.
- Supabase project: `tmthanzdkvqutkajsyji` (rtc-minimum-fitness, Robbe's own org). After a schema change, regenerate `src/integrations/supabase/types.ts`.
- Installable web app (vite-plugin-pwa): Supabase calls are network-only, never cached.
- Brand: cream #F3EEE6, ink #1D1D1B, green #365142; Bodoni Moda (italic display) + Outfit; minimal UI, no gradients.
