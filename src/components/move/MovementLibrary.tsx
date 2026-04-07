import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Play } from 'lucide-react';

const MovementLibrary = () => {
  return (
    <section>
      <div className="w-full h-px bg-border mb-12" />
      <h2 className="font-serif italic text-2xl md:text-3xl mb-10">Movement Library</h2>
      <MobilityFlows />
      <div className="mb-12" />
      <AccessoryDrills />
    </section>
  );
};

const MobilityFlows = () => {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const { data: flows } = useQuery({
    queryKey: ['mobility_flows'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mobility_flows').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
  });

  const tags = [...new Set(flows?.map((f) => f.tag) || [])];
  const filtered = activeTag ? flows?.filter((f) => f.tag === activeTag) : flows;

  return (
    <div>
      <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium mb-5">Mobility Flows</h3>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterPill active={!activeTag} onClick={() => setActiveTag(null)}>All</FilterPill>
          {tags.map((tag) => (
            <FilterPill key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>
              {tag}
            </FilterPill>
          ))}
        </div>
      )}
      {(!filtered || filtered.length === 0) && (
        <p className="text-sm text-muted-foreground">No mobility flows added yet.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered?.map((flow) => (
          <LibraryCard
            key={flow.id}
            title={flow.title}
            tag={flow.tag}
            meta={`${flow.duration_minutes} min`}
            description={flow.description}
            youtubeUrl={flow.youtube_url}
          />
        ))}
      </div>
    </div>
  );
};

const AccessoryDrills = () => {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const { data: drills } = useQuery({
    queryKey: ['accessory_library'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accessory_library').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
  });

  const tags = [...new Set(drills?.map((d) => d.target_area) || [])];
  const filtered = activeTag ? drills?.filter((d) => d.target_area === activeTag) : drills;

  return (
    <div>
      <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium mb-5">Accessory Drills</h3>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterPill active={!activeTag} onClick={() => setActiveTag(null)}>All</FilterPill>
          {tags.map((tag) => (
            <FilterPill key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>
              {tag}
            </FilterPill>
          ))}
        </div>
      )}
      {(!filtered || filtered.length === 0) && (
        <p className="text-sm text-muted-foreground">No accessory drills added yet.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered?.map((drill) => (
          <LibraryCard
            key={drill.id}
            title={drill.name}
            tag={drill.target_area}
            description={drill.coaching_note || ''}
            youtubeUrl={drill.youtube_url}
          />
        ))}
      </div>
    </div>
  );
};

const FilterPill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-[11px] tracking-[0.08em] uppercase font-medium border rounded-md transition-all ${
      active
        ? 'border-accent bg-accent/10 text-accent'
        : 'border-border text-muted-foreground hover:border-foreground/30'
    }`}
  >
    {children}
  </button>
);

const LibraryCard = ({
  title,
  tag,
  meta,
  description,
  youtubeUrl,
}: {
  title: string;
  tag: string;
  meta?: string;
  description: string;
  youtubeUrl: string | null;
}) => {
  const [videoOpen, setVideoOpen] = useState(false);
  const youtubeId = youtubeUrl?.match(/(?:youtu\.be\/|v=)([^&\s]+)/)?.[1];

  return (
    <div className="border border-border bg-card rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] tracking-[0.08em] uppercase font-medium text-accent-light">{tag}</span>
            {meta && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-[10px] text-muted-foreground">{meta}</span>
              </>
            )}
          </div>
          {description && (
            <p className="text-[12px] text-muted-foreground mt-2 italic">{description}</p>
          )}
        </div>
        {youtubeId && (
          <button
            onClick={() => setVideoOpen(!videoOpen)}
            className="p-1.5 border border-border rounded-md hover:border-foreground/30 transition-colors"
          >
            <Play className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
          </button>
        )}
      </div>
      {videoOpen && youtubeId && (
        <div className="mt-3 aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            className="w-full h-full rounded-md"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}
    </div>
  );
};

export default MovementLibrary;
