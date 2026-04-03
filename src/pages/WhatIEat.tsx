import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const WhatIEat = () => {
  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen pt-24 md:pt-32">
      <div className="container mx-auto max-w-[1100px] px-6">
        {/* Back link */}
        <Link
          to="/fuel"
          className="inline-flex items-center gap-2 text-[12px] tracking-[0.1em] uppercase font-light opacity-40 hover:opacity-70 transition-opacity mb-12"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Fuel
        </Link>

        {/* Title */}
        <div className="mb-16 max-w-2xl">
          <h1 className="font-serif italic text-4xl md:text-5xl leading-[1.15] mb-6">
            What I eat
          </h1>
          <p className="text-sm text-muted-foreground font-light leading-[1.8]">
            A growing archive of weekly recipes — simple, high-protein, built for
            real life.
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[rgba(242,237,228,0.08)] mb-16" />

        {/* Recipes grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border border-[rgba(242,237,228,0.08)] rounded-[4px] bg-card p-8 animate-pulse h-56"
              />
            ))}
          </div>
        ) : recipes && recipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-light text-sm">
              First recipes dropping soon.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-24 md:mt-32 w-full h-px bg-[rgba(242,237,228,0.08)]" />
      <footer className="px-6 py-12 text-center">
        <p className="text-[11px] text-muted-foreground tracking-[0.1em] uppercase font-light">
          ROBBETHECOACH — FOUNDER OF ZWEET CLUB
        </p>
      </footer>
    </div>
  );
};

interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  image_url: string | null;
  week_label: string | null;
  created_at: string;
}

const RecipeCard = ({ recipe }: { recipe: Recipe }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[rgba(242,237,228,0.08)] rounded-[4px] bg-card overflow-hidden">
      {recipe.image_url && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-8">
        {recipe.week_label && (
          <p className="text-[11px] tracking-[0.12em] uppercase font-light opacity-40 mb-3">
            {recipe.week_label}
          </p>
        )}
        <h3 className="font-serif italic text-xl mb-2">{recipe.title}</h3>
        {recipe.description && (
          <p className="text-[13px] text-muted-foreground font-light leading-[1.8] mb-4">
            {recipe.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-5 text-[11px] text-muted-foreground tracking-[0.1em] uppercase font-light mb-4">
          {recipe.prep_time && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" strokeWidth={1.5} />
              {recipe.prep_time + (recipe.cook_time ?? 0)} min
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1.5">
              <Users className="h-3 w-3" strokeWidth={1.5} />
              {recipe.servings} servings
            </span>
          )}
        </div>

        {/* Expand / collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[12px] tracking-[0.1em] uppercase font-light opacity-50 hover:opacity-80 transition-opacity"
        >
          {expanded ? 'Collapse' : 'View recipe'}
        </button>

        {expanded && (
          <div className="mt-6 pt-6 border-t border-[rgba(242,237,228,0.08)] space-y-6">
            {recipe.ingredients && (
              <div>
                <h4 className="text-[12px] tracking-[0.12em] uppercase font-light opacity-50 mb-3">
                  Ingredients
                </h4>
                <p className="text-[13px] font-light leading-[1.9] text-muted-foreground whitespace-pre-line">
                  {recipe.ingredients}
                </p>
              </div>
            )}
            {recipe.instructions && (
              <div>
                <h4 className="text-[12px] tracking-[0.12em] uppercase font-light opacity-50 mb-3">
                  Instructions
                </h4>
                <p className="text-[13px] font-light leading-[1.9] text-muted-foreground whitespace-pre-line">
                  {recipe.instructions}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import { useState } from 'react';

export default WhatIEat;
