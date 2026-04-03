import { Link } from 'react-router-dom';
import { Dumbbell, Apple, Link2, Brain } from 'lucide-react';

const pillars = [
  { icon: Dumbbell, title: 'Move', desc: 'Training for life.' },
  { icon: Apple, title: 'Fuel', desc: 'Sustainable nutrition.' },
  { icon: Link2, title: 'The Chain', desc: 'Building momentum.' },
  { icon: Brain, title: 'Think', desc: "As you think, you'll become." },
];

const Index = () => {
  return (
    <div className="min-h-screen pt-14">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <h1 className="font-serif text-5xl md:text-7xl leading-tight max-w-3xl animate-fade-in">
          A generalist approach to fitness
        </h1>
        <p className="mt-6 text-sm tracking-[0.1em] uppercase text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          The minimum viable workout.
        </p>
        <Link
          to="/auth"
          className="mt-12 inline-block border border-foreground px-8 py-3 text-xs tracking-[0.12em] uppercase transition-colors hover:bg-foreground hover:text-background opacity-0 animate-fade-in"
          style={{ animationDelay: '0.4s' }}
        >
          Join Robbethecoach
        </Link>
      </section>

      {/* Pillars */}
      <section className="border-t border-border px-6 py-24">
        <div className="container mx-auto grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className="flex flex-col items-center text-center opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.3 + i * 0.15}s` }}
            >
              <p.icon className="h-6 w-6 mb-4 opacity-70" strokeWidth={1.5} />
              <h3 className="font-serif text-xl mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="text-xs text-muted-foreground tracking-[0.08em] uppercase">
          Robbethecoach — Built on Zweet Club
        </p>
      </footer>
    </div>
  );
};

export default Index;
