import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface DailyThought {
  id: string;
  publish_date: string;
  content_type: string;
  content: string | null;
  attribution: string | null;
  image_url: string | null;
  caption: string | null;
  layout_order: string | null;
  created_at: string;
}

const Think = () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: thought, isLoading } = useQuery({
    queryKey: ['daily_thought', today],
    queryFn: async () => {
      const { data: todayEntry } = await supabase
        .from('daily_thoughts')
        .select('*')
        .eq('publish_date', today)
        .maybeSingle();

      if (todayEntry) return todayEntry as DailyThought;

      const { data: pastEntry } = await supabase
        .from('daily_thoughts')
        .select('*')
        .lt('publish_date', today)
        .order('publish_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      return (pastEntry as DailyThought) || null;
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, 'EEEE, MMMM d');
  };

  return (
    <div className="min-h-screen pt-14">
      <div className="container mx-auto px-6 py-12 md:py-16 max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[12px] tracking-[0.08em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back
        </Link>
        <h1 className="font-serif italic text-4xl md:text-5xl mb-12">Think</h1>

        <section>
          <h3 className="text-[12px] tracking-[0.08em] uppercase font-medium mb-6">
            Daily Thought
          </h3>

          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}

          {!isLoading && !thought && (
            <p className="text-sm text-muted-foreground">
              No thoughts published yet.
            </p>
          )}

          {thought && (
            <div className="border border-border bg-card rounded-lg overflow-hidden">
              <div className="px-6 pt-6 pb-0">
                <p className="text-[11px] tracking-[0.08em] uppercase text-muted-foreground font-medium">
                  {formatDate(thought.publish_date)}
                </p>
              </div>

              <div className="p-6">
                {thought.content_type === 'text' && (
                  <TextBlock content={thought.content} attribution={thought.attribution} />
                )}
                {thought.content_type === 'image' && (
                  <ImageBlock imageUrl={thought.image_url} caption={thought.caption} />
                )}
                {thought.content_type === 'mixed' && (
                  <MixedBlock
                    content={thought.content}
                    attribution={thought.attribution}
                    imageUrl={thought.image_url}
                    caption={thought.caption}
                    layoutOrder={thought.layout_order || 'text_first'}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const TextBlock = ({ content, attribution }: { content: string | null; attribution: string | null }) => (
  <div>
    {content && (
      <p className="text-sm leading-relaxed whitespace-pre-line">{content}</p>
    )}
    {attribution && (
      <p className="text-[12px] text-muted-foreground mt-4 italic">
        {attribution}
      </p>
    )}
  </div>
);

const ImageBlock = ({ imageUrl, caption }: { imageUrl: string | null; caption: string | null }) => (
  <div>
    {imageUrl && (
      <img
        src={imageUrl}
        alt="Daily thought"
        className="w-full rounded-md"
        loading="lazy"
      />
    )}
    {caption && (
      <p className="text-[12px] text-muted-foreground mt-3 italic">{caption}</p>
    )}
  </div>
);

const MixedBlock = ({
  content,
  attribution,
  imageUrl,
  caption,
  layoutOrder,
}: {
  content: string | null;
  attribution: string | null;
  imageUrl: string | null;
  caption: string | null;
  layoutOrder: string;
}) => {
  const textPart = <TextBlock content={content} attribution={attribution} />;
  const imagePart = <ImageBlock imageUrl={imageUrl} caption={caption} />;
  const divider = <div className="w-full h-px bg-border my-5" />;

  return layoutOrder === 'image_first' ? (
    <div>{imagePart}{divider}{textPart}</div>
  ) : (
    <div>{textPart}{divider}{imagePart}</div>
  );
};

export default Think;
