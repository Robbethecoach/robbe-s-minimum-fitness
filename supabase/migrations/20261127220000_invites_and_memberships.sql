-- Invite links (free first weeks, no card) and memberships (trial → paid via Stripe).

CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE DEFAULT translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/', '-_'),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 254),
  note TEXT CHECK (char_length(note) <= 200),
  free_days SMALLINT NOT NULL DEFAULT 28 CHECK (free_days BETWEEN 0 AND 365),
  max_uses SMALLINT NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 1000),
  uses SMALLINT NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days',
  revoked BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages invites" ON public.invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.memberships (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled')),
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  invite_id UUID REFERENCES public.invites(id) ON DELETE SET NULL,
  reminded_7_at TIMESTAMPTZ,
  reminded_1_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
-- Members read their own row; only edge functions (service role) write.
CREATE POLICY "Members read own membership" ON public.memberships FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin reads memberships" ON public.memberships FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Access rule in one place: admin, an active/past_due subscription, or a running trial.
CREATE OR REPLACE FUNCTION public.has_access(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = _user_id
      AND (m.status IN ('active', 'past_due')
           OR (m.status = 'trial' AND m.trial_ends_at > now())
           OR (m.status = 'canceled' AND m.current_period_end > now()))
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_access(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_access(UUID) TO authenticated, service_role;

-- Claim one use of an invite atomically (service role only, called by the redeem-invite function).
CREATE OR REPLACE FUNCTION public.claim_invite(_code TEXT, _email TEXT)
RETURNS public.invites LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.invites;
BEGIN
  SELECT * INTO inv FROM public.invites WHERE code = _code FOR UPDATE;
  IF NOT FOUND OR inv.revoked THEN RAISE EXCEPTION 'invite_invalid'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'invite_expired'; END IF;
  IF inv.uses >= inv.max_uses THEN RAISE EXCEPTION 'invite_used'; END IF;
  IF inv.email IS NOT NULL AND lower(inv.email) <> lower(_email) THEN RAISE EXCEPTION 'invite_email'; END IF;
  UPDATE public.invites SET uses = uses + 1 WHERE id = inv.id RETURNING * INTO inv;
  RETURN inv;
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_invite(TEXT, TEXT) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.claim_invite(TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.release_invite(_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.invites SET uses = greatest(uses - 1, 0) WHERE id = _id;
$$;
REVOKE EXECUTE ON FUNCTION public.release_invite(UUID) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.release_invite(UUID) TO service_role;
