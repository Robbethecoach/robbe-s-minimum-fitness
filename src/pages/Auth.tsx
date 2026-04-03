import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/weekly');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setError(error.message);
      else setMessage('Check your email to confirm your account.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate('/weekly');
    }
    setLoading(false);
  };

  const inputClass =
    'w-full border border-[rgba(242,237,228,0.2)] bg-transparent px-4 py-3 text-sm font-light text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[rgba(242,237,228,0.6)] rounded-[2px]';

  return (
    <div className="flex min-h-screen items-center justify-center px-6 pt-14">
      <div className="w-full max-w-sm">
        <h1 className="font-serif italic text-3xl md:text-4xl mb-10 text-center">
          {isSignUp ? 'Create account' : 'Sign in'}
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
          {error && <p className="text-sm font-light text-destructive">{error}</p>}
          {message && <p className="text-sm font-light text-muted-foreground">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="border border-foreground/80 bg-transparent px-8 py-[14px] text-[13px] font-light tracking-[0.1em] uppercase transition-colors hover:bg-foreground hover:text-primary-foreground disabled:opacity-40 rounded-[2px]"
          >
            {loading ? '...' : isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>
        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
          className="mt-8 block w-full text-center text-[12px] font-light text-muted-foreground tracking-[0.1em] uppercase hover:text-foreground transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </div>
    </div>
  );
};

export default Auth;
