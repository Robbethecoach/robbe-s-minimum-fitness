import { Link } from 'react-router-dom';
import { Dumbbell, Apple, Link2, Brain } from 'lucide-react';
import heroImage from '@/assets/hero.jpg';

const pillars = [
  { icon: Dumbbell, title: 'Move', desc: 'Training for life.' },
  { icon: Apple, title: 'Fuel', desc: 'Sustainable nutrition.' },
  { icon: Link2, title: 'The Chain', desc: 'Building momentum.' },
  { icon: Brain, title: 'Think', desc: "As you think, you'll become." },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero — full viewport with image */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background image */}
        <img
          src={heroImage}
          alt="Runner ascending through morning fog"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 30%' }}
        />
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1432] via-[#0a1432]/40 to-transparent" />

        {/* Hero content — bottom-left aligned like Cadence */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-16 md:pb-20">
          <div className="container mx-auto">
            <h1 className="font-serif italic text-4xl sm:text-5xl md:text-7xl leading-[1.1] max-w-2xl animate-fade-in">
              A generalist approach to fitness
            </h1>
            <p className="mt-5 text-[13px] tracking-[0.12em] uppercase font-light opacity-60 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              The minimum viable workout.
            </p>
            <Link
              to="/auth"
              className="mt-8 inline-block border border-foreground/70 bg-transparent px-8 py-[14px] text-[13px] font-light tracking-[0.1em] uppercase transition-colors hover:bg-foreground hover:text-primary-foreground rounded-[2px] opacity-0 animate-fade-in"
              style={{ animationDelay: '0.4s' }}
            >
              Join Robbethecoach
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-[rgba(242,237,228,0.08)]" />

      {/* Pillars */}
      <section className="px-6 py-24 md:py-32">
        <div className="container mx-auto grid grid-cols-1 gap-16 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className="flex flex-col items-center text-center opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.3 + i * 0.15}s` }}
            >
              <p.icon className="h-5 w-5 mb-5 opacity-40" strokeWidth={1} />
              <h3 className="text-[12px] tracking-[0.12em] uppercase font-light mb-3">{p.title}</h3>
              <p className="text-sm text-muted-foreground font-light">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-[rgba(242,237,228,0.08)]" />

      {/* Footer */}
      <footer className="px-6 py-12 text-center">
        <p className="text-[11px] text-muted-foreground tracking-[0.1em] uppercase font-light">
          ROBBETHECOACH — FOUNDER OF ZWEET CLUB
        </p>
      </footer>
    </div>
  );
};

export default Index;
