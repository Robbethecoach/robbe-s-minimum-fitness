import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Landing page for the link in the password reset email.
// Supabase signs the member in from the link; here they choose a new password.
const ResetPassword = () => {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords are not the same.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else navigate('/auth');
  };

  const inputClass =
    'w-full border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 rounded-lg';

  return (
    <div className="flex min-h-screen items-center justify-center px-6 pt-14">
      <div className="w-full max-w-sm">
        <h1 className="font-serif italic text-3xl md:text-4xl mb-10 text-center">New password</h1>
        {!ready ? (
          <p className="text-center text-sm text-muted-foreground">
            Open this page from the link in your reset email. Links expire after an hour.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <input type="password" placeholder="New password" value={password}
              onChange={(e) => setPassword(e.target.value)} className={inputClass} required minLength={8} />
            <input type="password" placeholder="Repeat new password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} className={inputClass} required minLength={8} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading}
              className="bg-primary text-primary-foreground px-8 py-[14px] text-[13px] font-medium tracking-[0.08em] uppercase transition-colors hover:bg-foreground/90 disabled:opacity-40 rounded-lg">
              {loading ? '...' : 'Save password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
