import { useState } from 'react';
import { Dumbbell, Apple, Heart, Brain, X } from 'lucide-react';

type Pillar = 'Move' | 'Fuel' | 'Recover' | 'Think';

interface ContentItem {
  id: string;
  title: string;
  pillar: Pillar;
  description: string;
  body: string;
}

const pillarIcons: Record<Pillar, typeof Dumbbell> = {
  Move: Dumbbell,
  Fuel: Apple,
  Recover: Heart,
  Think: Brain,
};

const seedContent: ContentItem[] = [
  {
    id: '1',
    title: 'The 30-Minute Rule',
    pillar: 'Move',
    description: 'Why 30 minutes of intentional movement beats 90 minutes of wandering.',
    body: `Most people spend too long in the gym doing too little. The 30-minute rule is simple: show up, work with purpose, leave. Every session should have a clear structure — warm up, work, cool down. No scrolling between sets, no aimless machine hopping.\n\nThe minimum viable workout isn't about doing less for the sake of it. It's about removing everything that doesn't serve you. Compound movements. Controlled tempo. Full range of motion. That's it.\n\nYour body doesn't care how long you were in the building. It cares about the quality of stimulus you gave it.`,
  },
  {
    id: '2',
    title: 'Eating for Energy, Not Aesthetics',
    pillar: 'Fuel',
    description: 'Shift your relationship with food from punishment to performance.',
    body: `When you eat for energy, everything changes. You stop counting and start noticing. How do you feel after that meal? Did it carry you through the afternoon or crash you at 3pm?\n\nSustainable nutrition isn't a meal plan. It's a set of principles: eat whole foods most of the time, stay hydrated, don't skip meals, and stop treating weekends as a free-for-all.\n\nThe goal isn't perfection. It's consistency. A 7/10 week every week beats a 10/10 week followed by three weeks off.`,
  },
  {
    id: '3',
    title: 'Identity Precedes Behaviour',
    pillar: 'Think',
    description: "You don't rise to your goals. You fall to your identity.",
    body: "Every action you take is a vote for the person you want to become. Skip a workout? That's a vote for \"someone who doesn't train.\" Show up even when you don't feel like it? That's a vote for discipline.\n\nThe mindset shift isn't about motivation — motivation is unreliable. It's about identity. When you see yourself as someone who moves, fuels well, and recovers intentionally, the behaviours follow.\n\nStart small. One rep. One good meal. One early night. Stack the votes.",
  },
];

const pillars: Pillar[] = ['Move', 'Fuel', 'Recover', 'Think'];

const ContentLibrary = () => {
  const [filter, setFilter] = useState<Pillar | null>(null);
  const [selected, setSelected] = useState<ContentItem | null>(null);

  const filtered = filter ? seedContent.filter((c) => c.pillar === filter) : seedContent;

  if (selected) {
    return (
      <div className="min-h-screen px-6 pt-28 pb-20">
        <div className="container mx-auto max-w-2xl">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-[12px] font-light tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            <X className="h-3 w-3" /> Back to library
          </button>
          <span className="text-[11px] font-light tracking-[0.12em] uppercase text-muted-foreground mb-5 block">
            {selected.pillar}
          </span>
          <h1 className="font-serif italic text-4xl md:text-5xl mb-10">{selected.title}</h1>
          <div className="text-sm font-light leading-[1.8] text-foreground/80 whitespace-pre-line">
            {selected.body}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pt-28 pb-20">
      <div className="container mx-auto max-w-4xl">
        <h1 className="font-serif italic text-4xl md:text-5xl mb-12">The Library</h1>

        {/* Filters */}
        <div className="flex gap-3 mb-14 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className={`text-[12px] font-light tracking-[0.1em] uppercase px-5 py-[10px] border transition-colors rounded-[2px] ${
              filter === null
                ? 'border-foreground bg-foreground text-primary-foreground'
                : 'border-[rgba(242,237,228,0.2)] hover:border-[rgba(242,237,228,0.6)]'
            }`}
          >
            All
          </button>
          {pillars.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`text-[12px] font-light tracking-[0.1em] uppercase px-5 py-[10px] border transition-colors rounded-[2px] ${
                filter === p
                  ? 'border-foreground bg-foreground text-primary-foreground'
                  : 'border-[rgba(242,237,228,0.2)] hover:border-[rgba(242,237,228,0.6)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => {
            const Icon = pillarIcons[item.pillar];
            return (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="bg-card border border-[rgba(242,237,228,0.08)] rounded-[4px] p-8 text-left transition-colors hover:border-[rgba(242,237,228,0.25)] group"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Icon className="h-4 w-4 opacity-40" strokeWidth={1} />
                  <span className="text-[10px] font-light tracking-[0.12em] uppercase text-muted-foreground">
                    {item.pillar}
                  </span>
                </div>
                <h2 className="font-serif italic text-lg mb-3 group-hover:opacity-80 transition-opacity">
                  {item.title}
                </h2>
                <p className="text-sm text-muted-foreground font-light leading-[1.7]">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ContentLibrary;
