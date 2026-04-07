import { Link } from 'react-router-dom';
import { BookOpen, UtensilsCrossed } from 'lucide-react';

const directions = [
  {
    to: '/fuel/how-i-eat',
    icon: BookOpen,
    title: 'How I Eat',
    subtitle: 'My philosophy on nutrition — no fads, no shortcuts.',
  },
  {
    to: '/fuel/what-i-eat',
    icon: UtensilsCrossed,
    title: 'What I Eat',
    subtitle: 'A growing archive of weekly recipes.',
  },
];

const Fuel = () => (
  <div className="min-h-screen pt-24 md:pt-32">
    <div className="container mx-auto max-w-[1100px] px-6">
      <div className="mb-20 max-w-2xl">
        <p className="text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground mb-4">
          Fuel
        </p>
        <h1 className="font-serif italic text-4xl md:text-5xl leading-[1.15] mb-6">
          Sustainable nutrition
        </h1>
        <p className="text-sm text-muted-foreground leading-[1.8] max-w-lg">
          Food is fuel — but it's also culture, ritual, and pleasure. Here's how I
          think about it and what actually ends up on my plate.
        </p>
      </div>

      <div className="w-full h-px bg-border mb-16" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {directions.map((d) => (
          <Link
            key={d.to}
            to={d.to}
            className="group block border border-border rounded-lg bg-card p-10 md:p-14 transition-colors hover:border-foreground/25"
          >
            <d.icon
              className="h-5 w-5 mb-8 text-muted-foreground group-hover:text-foreground transition-colors"
              strokeWidth={1}
            />
            <h2 className="font-serif italic text-2xl md:text-3xl mb-3">
              {d.title}
            </h2>
            <p className="text-[13px] text-muted-foreground leading-[1.8]">
              {d.subtitle}
            </p>
          </Link>
        ))}
      </div>
    </div>

    <div className="mt-24 md:mt-32 w-full h-px bg-border" />
    <footer className="px-6 py-12 text-center">
      <p className="text-[11px] text-muted-foreground tracking-[0.08em] uppercase font-medium">
        ROBBETHECOACH — FOUNDER OF ZWEET CLUB
      </p>
    </footer>
  </div>
);

export default Fuel;
