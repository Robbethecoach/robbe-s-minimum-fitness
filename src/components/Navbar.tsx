import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const linkClass = (path: string) =>
    `text-xs tracking-[0.1em] uppercase transition-opacity hover:opacity-100 ${
      location.pathname === path ? 'opacity-100' : 'opacity-60'
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link to="/" className="text-sm font-medium tracking-[0.08em] uppercase">
          Robbethecoach
        </Link>
        <div className="flex items-center gap-8">
          {user && (
            <>
              <Link to="/weekly" className={linkClass('/weekly')}>
                Weekly
              </Link>
              <Link to="/library" className={linkClass('/library')}>
                Library
              </Link>
            </>
          )}
          {user ? (
            <button
              onClick={signOut}
              className="text-xs tracking-[0.1em] uppercase opacity-60 transition-opacity hover:opacity-100"
            >
              Sign out
            </button>
          ) : (
            <Link to="/auth" className={linkClass('/auth')}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
