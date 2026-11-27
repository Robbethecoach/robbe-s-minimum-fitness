-- decide_suggestion is for signed-in members only. has_role stays executable for anon
-- because RLS policies on public tables (recipes, fuel pages) call it for anon reads.
REVOKE EXECUTE ON FUNCTION public.decide_suggestion(UUID, TEXT) FROM anon;
