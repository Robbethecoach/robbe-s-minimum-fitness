import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  const linkClass = (path: string) =>
    `text-[13px] font-light tracking-[0.1em] uppercase transition-opacity hover:opacity-100 ${
      location.pathname === path ? 'opacity-100' : 'opacity-50'
    }`;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors ${
        isHome
          ? 'bg-transparent'
          : 'bg-[#0c0c0b] border-b border-[rgba(242,237,228,0.08)]'
      }`}
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link to="/" className="font-serif italic text-[20px] font-normal">
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
              className="text-[13px] font-light tracking-[0.1em] uppercase opacity-50 transition-opacity hover:opacity-100"
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
