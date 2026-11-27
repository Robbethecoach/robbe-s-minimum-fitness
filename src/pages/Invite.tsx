import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { callFunction } from '@/lib/functions';

type Check = { valid: boolean; email?: string | null; freeDays?: number; error?: string };

/** /invite/:code — the only way to create an account while Minimum Fitness is invite only. */
const Invite = () => {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [check, setCheck] = useState<Check | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    callFunction<Check>('redeem-invite', { code, action: 'check' })
      .then((c) => {
        setCheck(c);
        if (c.email) setEmail(c.email);
      })
      .catch((e: Error) => setCheck({ valid: false, error: e.message }));
  }, [code]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords are not the same.');
    setLoading(true);
    try {
      await callFunction('redeem-invite', { code, email, password });
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      await queryClient.invalidateQueries({ queryKey: ['membership'] });
      navigate('/onboarding');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const inputClass =
    'w-full border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 rounded-lg disabled:opacity-60';

  return (
    <div className="flex min-h-screen items-center justify-center px-6 pt-14">
      <div className="w-full max-w-sm">
        {!check ? (
          <p className="text-center text-xs tracking-[0.1em] uppercase text-muted-foreground">Checking your invite…</p>
        ) : !check.valid ? (
          <div className="text-center">
            <h1 className="font-serif italic text-3xl md:text-4xl mb-6">Invite</h1>
            <p className="text-sm text-muted-foreground">{check.error}</p>
            <Link to="/auth" className="mt-8 inline-block text-[13px] underline underline-offset-4">Already have an account? Sign in</Link>
          </div>
        ) : (
          <>
            <p className="text-center text-[12px] tracking-[0.1em] uppercase text-muted-foreground">You're invited</p>
            <h1 className="mt-3 text-center font-serif italic text-3xl md:text-4xl">Minimum Fitness</h1>
            <p className="mt-4 mb-10 text-center text-sm text-muted-foreground leading-relaxed">
              Your first <span className="text-foreground">{check.freeDays} days are free</span>. No card needed. Create your account to start.
            </p>
            <form onSubmit={submit} className="flex flex-col gap-5">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className={inputClass} required disabled={!!check.email} autoComplete="email" />
              <input type="password" placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)}
                className={inputClass} required minLength={8} autoComplete="new-password" />
              <input type="password" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className={inputClass} required minLength={8} autoComplete="new-password" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={loading}
                className="bg-primary text-primary-foreground px-8 py-[14px] text-[13px] font-medium tracking-[0.08em] uppercase transition-colors hover:bg-foreground/90 disabled:opacity-40 rounded-lg">
                {loading ? '...' : 'Start my free days'}
              </button>
            </form>
            <p className="mt-8 text-center text-[12px] leading-relaxed text-muted-foreground">
              Already have an account? <Link to="/auth" className="underline underline-offset-4">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Invite;
