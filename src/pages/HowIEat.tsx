import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const HowIEat = () => (
  <div className="min-h-screen pt-24 md:pt-32">
    <div className="container mx-auto max-w-[760px] px-6">
      <Link
        to="/fuel"
        className="inline-flex items-center gap-2 text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors mb-12"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        Fuel
      </Link>

      <h1 className="font-serif italic text-4xl md:text-5xl leading-[1.15] mb-6">
        How I eat
      </h1>
      <p className="text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground mb-16">
        My philosophy on nutrition
      </p>

      <div className="w-full h-px bg-border mb-16" />

      <article className="space-y-8 text-[15px] leading-[1.9] text-muted-foreground">
        <p>
          I don't believe in diets. I believe in principles — a small set of
          non-negotiable guidelines that stay consistent whether I'm travelling,
          training heavy, or recovering.
        </p>

        <h2 className="font-serif italic text-2xl text-foreground mt-14 mb-4">
          The 80 / 20 rule
        </h2>
        <p>
          Eighty percent of what I eat is built around whole, minimally processed
          food — protein, vegetables, quality carbs, healthy fats. The other twenty
          percent is life: a dinner out, a glass of wine, something my grandmother
          made. Rigidity breaks. Consistency compounds.
        </p>

        <h2 className="font-serif italic text-2xl text-foreground mt-14 mb-4">
          Protein as the anchor
        </h2>
        <p>
          Every meal starts with protein. It drives satiety, preserves muscle, and
          simplifies decision-making. Once protein is covered, the rest fills in
          naturally — colour on the plate, a carb source that matches my energy
          needs, and fats for flavour and function.
        </p>

        <h2 className="font-serif italic text-2xl text-foreground mt-14 mb-4">
          Timing over tracking
        </h2>
        <p>
          I don't count calories obsessively. Instead I pay attention to when I eat
          and how I feel. A solid breakfast sets the tone. Eating enough around
          training matters. Late-night snacking is usually boredom, not hunger.
          Awareness beats arithmetic.
        </p>

        <h2 className="font-serif italic text-2xl text-foreground mt-14 mb-4">
          Hydration & the basics
        </h2>
        <p>
          Water, sleep, and sunlight are the unsexy foundations that make everything
          else work. Before optimising supplements or meal timing, I make sure these
          three are dialled in. They cost nothing and return everything.
        </p>

        <div className="pt-10">
          <div className="w-12 h-px bg-border" />
          <p className="mt-6 text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground">
            This page is a living document — updated as my thinking evolves.
          </p>
        </div>
      </article>
    </div>

    <div className="mt-24 md:mt-32 w-full h-px bg-border" />
    <footer className="px-6 py-12 text-center">
      <p className="text-[11px] text-muted-foreground tracking-[0.08em] uppercase font-medium">
        ROBBETHECOACH — FOUNDER OF ZWEET CLUB
      </p>
    </footer>
  </div>
);

export default HowIEat;
