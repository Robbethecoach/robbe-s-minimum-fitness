import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || !data.onboarding_completed) {
          navigate('/onboarding');
        } else {
          navigate('/move');
        }
      });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    // Invite only for now: accounts are created by Robbe, so there is no sign-up here.
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleForgot = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Fill in your email first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setMessage('If this email has an account, a reset link is on its way.');
  };

  const inputClass =
    'w-full border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 rounded-lg';

  return (
    <div className="flex min-h-screen items-center justify-center px-6 pt-14">
      <div className="w-full max-w-sm">
        <h1 className="font-serif italic text-3xl md:text-4xl mb-10 text-center">
          Sign in
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
            minLength={6}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground px-8 py-[14px] text-[13px] font-medium tracking-[0.08em] uppercase transition-colors hover:bg-foreground/90 disabled:opacity-40 rounded-lg"
          >
            {loading ? '...' : 'Sign in'}
          </button>
        </form>
        <button
          type="button"
          onClick={handleForgot}
          disabled={loading}
          className="mt-4 w-full text-center text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Forgot password?
        </button>
        <p className="mt-8 text-center text-[13px] leading-relaxed text-muted-foreground">
          Minimum Fitness is invite only for now.
        </p>
      </div>
    </div>
  );
};

export default Auth;
