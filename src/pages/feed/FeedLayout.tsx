import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/feed/library', label: 'Exercise library' },
  { to: '/feed/blocks', label: 'Blocks' },
  { to: '/feed/settings', label: 'Settings' },
];

/** Robbe's Feed: desktop first, sidebar that stacks on a phone. */
const FeedLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen pt-14">
    <div className="flex flex-wrap">
      <nav className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-border px-5 py-6 md:min-h-[calc(100vh-3.5rem)]">
        <p className="font-serif italic text-xl">robbethecoach</p>
        <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground mt-1 mb-5">Feed · only you</p>
        <div className="flex md:flex-col gap-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-card'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="flex-1 min-w-0 px-6 md:px-10 py-8">{children}</main>
    </div>
  </div>
);

export default FeedLayout;
