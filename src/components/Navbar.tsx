import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  const linkClass = (path: string) =>
    `text-[13px] font-medium tracking-[0.08em] uppercase transition-colors ${
      location.pathname === path ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors ${
        isHome
          ? 'bg-transparent'
          : 'bg-background/95 backdrop-blur-sm border-b border-border'
      }`}
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link to="/" className="font-serif italic text-[20px] font-normal text-foreground">
          robbethecoach
        </Link>
        <div className="flex items-center gap-8">
          {user && (
            <>
              <Link to="/move" className={linkClass('/move')}>
                Move
              </Link>
              <Link to="/fuel" className={linkClass('/fuel')}>
                Fuel
              </Link>
              <Link to="/think" className={linkClass('/think')}>
                Think
              </Link>
              <Link to="/chain" className={linkClass('/chain')}>
                Chain
              </Link>
              <Link to="/weekly" className={linkClass('/weekly')}>
                Weekly
              </Link>
            </>
          )}
          {user ? (
            <button
              onClick={signOut}
              className="text-[13px] font-medium tracking-[0.08em] uppercase text-muted-foreground transition-colors hover:text-foreground"
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
