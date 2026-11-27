import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const MEMBER_LINKS = [
  { to: '/move', label: 'Move' },
  { to: '/fuel', label: 'Fuel' },
  { to: '/think', label: 'Think' },
  { to: '/chain', label: 'Chain' },
  { to: '/weekly', label: 'Weekly' },
];

/**
 * Top bar. Desktop: logo left, sections in the middle, account on the right, all on one baseline.
 * Phone: logo + menu button; the sections open in a full-width panel.
 */
const Navbar = () => {
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isHome = location.pathname === '/';
  const onAuthPage = location.pathname === '/auth' || location.pathname === '/reset-password';

  useEffect(() => setOpen(false), [location.pathname]);

  const links = user ? [...MEMBER_LINKS, ...(isAdmin ? [{ to: '/feed', label: 'Feed' }] : [])] : [];
  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);
  const solid = !isHome || open;

  const item = 'text-[12px] font-medium tracking-[0.1em] uppercase leading-none transition-colors';
  const desktopLink = (to: string) =>
    `${item} relative py-2 ${isActive(to) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'} ` +
    `after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-foreground after:transition-opacity ${isActive(to) ? 'after:opacity-100' : 'after:opacity-0'}`;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors ${
        solid ? 'bg-background/95 backdrop-blur-sm border-b border-border' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto grid h-14 grid-cols-[auto_1fr_auto] items-center gap-6 px-6">
        <Link to="/" className="font-serif italic text-[20px] leading-none text-foreground">
          robbethecoach
        </Link>

        {/* Sections — desktop */}
        <div className="hidden items-center justify-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={desktopLink(l.to)}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Account — desktop */}
        <div className="hidden items-center justify-end md:flex">
          {user ? (
            <div className="flex items-center gap-6">
              <Link to="/membership" className={desktopLink('/membership')}>Membership</Link>
              <button onClick={signOut} className={`${item} text-muted-foreground hover:text-foreground`}>
                Sign out
              </button>
            </div>
          ) : onAuthPage ? null : (
            <Link to="/auth" className={`${item} rounded-lg border border-foreground/60 px-4 py-2.5 text-foreground hover:bg-foreground hover:text-background`}>
              Sign in
            </Link>
          )}
        </div>

        {/* Phone */}
        <div className="col-start-3 flex items-center justify-end md:hidden">
          {user ? (
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="-mr-2 flex h-10 w-10 items-center justify-center text-foreground"
            >
              {open ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
            </button>
          ) : onAuthPage ? null : (
            <Link to="/auth" className={`${item} text-foreground`}>
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Phone panel */}
      {open && user && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container mx-auto flex flex-col px-6 py-2">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`${item} flex items-center justify-between border-b border-border py-4 last:border-b-0 ${isActive(l.to) ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {l.label}
                {isActive(l.to) && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              </Link>
            ))}
            <Link to="/membership" className={`${item} border-b border-border py-4 ${isActive('/membership') ? 'text-foreground' : 'text-muted-foreground'}`}>
              Membership
            </Link>
            <button onClick={signOut} className={`${item} py-4 text-left text-muted-foreground`}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
