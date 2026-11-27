import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import FeedLayout from './FeedLayout';
import { defaultDose, formatEmom, formatSetsReps, parseEmom, parseSetsReps } from '@/lib/feed';
import { focusLabel, roleLabel, type Quality, type Region, type Role, type Unit } from '@/lib/session';

type LibraryExercise = {
  id: string;
  name: string;
  video_url: string | null;
  cues: string[];
  role: Role;
  quality: Quality;
  region: Region;
  pattern: string | null;
  unit: Unit;
  default_sets: number;
  default_reps: string;
  emom_interval_sec: number | null;
  superset_ok: boolean;
  regression_id: string | null;
  progression_id: string | null;
};

const ROLES: { value: Role; label: string }[] = [
  { value: 'main', label: 'Main' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'extra', label: 'Extra' },
];
const QUALITIES: { value: Quality; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'power', label: 'Power' },
];
const REGIONS: { value: Region; label: string }[] = [
  { value: 'upper', label: 'Upper' },
  { value: 'lower', label: 'Lower' },
  { value: 'full_body', label: 'Full body' },
  { value: 'core', label: 'Core' },
];
const PATTERNS = ['squat', 'hinge', 'push', 'pull'];
const UNITS: { value: Unit; label: string }[] = [
  { value: 'reps', label: 'Reps' },
  { value: 'seconds', label: 'Seconds' },
  { value: 'per_side', label: 'Per side' },
];

interface Draft {
  id?: string;
  name: string;
  video_url: string;
  cues: [string, string, string];
  role: Role;
  quality: Quality;
  region: Region;
  pattern: string | null;
  unit: Unit;
  dose: string;
  doseTouched: boolean;
  emom: string;
  superset_ok: boolean;
  regression_id: string;
  progression_id: string;
}

const emptyDraft = (): Draft => ({
  name: '',
  video_url: '',
  cues: ['', '', ''],
  role: 'main',
  quality: 'strength',
  region: 'lower',
  pattern: null,
  unit: 'reps',
  dose: formatSetsReps(3, '6–8'),
  doseTouched: false,
  emom: '',
  superset_ok: false,
  regression_id: '',
  progression_id: '',
});

const fromRow = (r: LibraryExercise): Draft => ({
  id: r.id,
  name: r.name,
  video_url: r.video_url ?? '',
  cues: [r.cues[0] ?? '', r.cues[1] ?? '', r.cues[2] ?? ''],
  role: r.role,
  quality: r.quality,
  region: r.region,
  pattern: r.pattern,
  unit: r.unit,
  dose: formatSetsReps(r.default_sets, r.default_reps),
  doseTouched: true,
  emom: formatEmom(r.emom_interval_sec),
  superset_ok: r.superset_ok,
  regression_id: r.regression_id ?? '',
  progression_id: r.progression_id ?? '',
});

const pill = (active: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] transition-colors ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-foreground/40'}`;

const inputClass = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground/40';

const youtubeId = (url: string) => url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([^&\s?/]+)/)?.[1];

const FeedLibrary = () => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data: library = [] } = useQuery({
    queryKey: ['exercise_library'],
    queryFn: async () => {
      const { data, error: e } = await supabase.from('exercise_library').select('*').order('name');
      if (e) throw e;
      return data as LibraryExercise[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? library.filter((x) => x.name.toLowerCase().includes(q)) : library;
  }, [library, search]);

  const update = (patch: Partial<Draft>) =>
    setDraft((d) => {
      const next = { ...d, ...patch };
      // Pattern only exists for main strength lifts.
      if (!(next.role === 'main' && next.quality === 'strength')) next.pattern = null;
      // Keep the standard dose in step with the tags until Robbe types his own.
      if (!next.doseTouched && (patch.role || patch.quality || patch.unit)) {
        const d0 = defaultDose(next.role, next.quality, next.unit);
        next.dose = formatSetsReps(d0.sets, d0.reps);
      }
      return next;
    });

  const save = useMutation({
    mutationFn: async (andAnother: boolean) => {
      const dose = parseSetsReps(draft.dose);
      const emom = parseEmom(draft.emom);
      if (!draft.name.trim()) throw new Error('Give the exercise a name.');
      if (!dose) throw new Error('Write the dose as sets × reps, e.g. 3 × 6–8.');
      if (Number.isNaN(emom) || (emom != null && (emom < 30 || emom > 600))) throw new Error('EMOM: write it as 2:30 or leave it empty.');
      if (draft.video_url && !youtubeId(draft.video_url)) throw new Error('Paste a YouTube link, or leave the video empty for now.');
      const row = {
        name: draft.name.trim(),
        video_url: draft.video_url.trim() || null,
        cues: draft.cues.map((c) => c.trim()).filter(Boolean),
        role: draft.role,
        quality: draft.quality,
        region: draft.region,
        pattern: draft.pattern,
        unit: draft.unit,
        default_sets: dose.sets,
        default_reps: dose.reps,
        emom_interval_sec: emom,
        superset_ok: draft.superset_ok,
        regression_id: draft.regression_id || null,
        progression_id: draft.progression_id || null,
      };
      const { error: e } = draft.id
        ? await supabase.from('exercise_library').update(row).eq('id', draft.id)
        : await supabase.from('exercise_library').insert(row);
      if (e) throw e;
      return andAnother;
    },
    onSuccess: (andAnother) => {
      toast.success(draft.id ? 'Exercise updated' : 'Saved to the library');
      queryClient.invalidateQueries({ queryKey: ['exercise_library'] });
      setError('');
      // "Save and add another" keeps the tags, so a series of similar exercises goes fast.
      setDraft(andAnother ? { ...emptyDraft(), role: draft.role, quality: draft.quality, region: draft.region, unit: draft.unit } : emptyDraft());
    },
    onError: (e: Error) => setError(e.message),
  });

  const others = library.filter((x) => x.id !== draft.id);
  const vid = youtubeId(draft.video_url);

  return (
    <FeedLayout>
      <div className="flex flex-wrap gap-10 items-start">
        <section className="flex-[3_1_520px] min-w-0 space-y-6">
          <div>
            <p className="text-[12px] tracking-[0.12em] uppercase text-muted-foreground">Exercise library · about a minute per exercise</p>
            <h1 className="font-serif italic text-4xl mt-1">{draft.id ? 'Edit exercise' : 'Add an exercise'}</h1>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-[13px] font-medium space-y-1.5 block">Name
              <input value={draft.name} onChange={(e) => update({ name: e.target.value })} className={inputClass} />
            </label>
            <label className="text-[13px] font-medium space-y-1.5 block">Video (YouTube, unlisted)
              <input value={draft.video_url} onChange={(e) => update({ video_url: e.target.value })} placeholder="https://youtu.be/…" className={inputClass} />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-medium">Cues <span className="font-normal text-muted-foreground">· max 3, short</span></p>
            {draft.cues.map((c, i) => (
              <input
                key={i}
                aria-label={`Cue ${i + 1}`}
                value={c}
                maxLength={80}
                onChange={(e) => {
                  const cues = [...draft.cues] as Draft['cues'];
                  cues[i] = e.target.value;
                  update({ cues });
                }}
                className={inputClass}
              />
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <fieldset className="space-y-2"><legend className="text-[13px] font-medium mb-2">Role</legend>
              <div className="flex flex-wrap gap-1.5">{ROLES.map((r) => <button key={r.value} type="button" onClick={() => update({ role: r.value })} className={pill(draft.role === r.value)}>{r.label}</button>)}</div>
            </fieldset>
            <fieldset className="space-y-2"><legend className="text-[13px] font-medium mb-2">Quality</legend>
              <div className="flex flex-wrap gap-1.5">{QUALITIES.map((q) => <button key={q.value} type="button" onClick={() => update({ quality: q.value })} className={pill(draft.quality === q.value)}>{q.label}</button>)}</div>
            </fieldset>
            <fieldset className="space-y-2"><legend className="text-[13px] font-medium mb-2">Region</legend>
              <div className="flex flex-wrap gap-1.5">{REGIONS.map((r) => <button key={r.value} type="button" onClick={() => update({ region: r.value })} className={pill(draft.region === r.value)}>{r.label}</button>)}</div>
            </fieldset>
            {draft.role === 'main' && draft.quality === 'strength' && (
              <fieldset className="space-y-2"><legend className="text-[13px] font-medium mb-2">Pattern <span className="font-normal text-muted-foreground">· for the weight estimate</span></legend>
                <div className="flex flex-wrap gap-1.5">{PATTERNS.map((p) => <button key={p} type="button" onClick={() => update({ pattern: p })} className={pill(draft.pattern === p)}>{p[0].toUpperCase() + p.slice(1)}</button>)}</div>
              </fieldset>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <fieldset className="space-y-2"><legend className="text-[13px] font-medium mb-2">Counted in</legend>
              <div className="flex flex-wrap gap-1.5">{UNITS.map((u) => <button key={u.value} type="button" onClick={() => update({ unit: u.value })} className={pill(draft.unit === u.value)}>{u.label}</button>)}</div>
            </fieldset>
            <label className="text-[13px] font-medium space-y-1.5 block">Default
              <input value={draft.dose} onChange={(e) => update({ dose: e.target.value, doseTouched: true })} className={inputClass} />
            </label>
            <label className="text-[13px] font-medium space-y-1.5 block">EMOM <span className="font-normal text-muted-foreground">optional</span>
              <input value={draft.emom} onChange={(e) => update({ emom: e.target.value })} placeholder="every 2:30" className={inputClass} />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-[13px] font-medium space-y-1.5 block">Easier (regression)
              <select value={draft.regression_id} onChange={(e) => update({ regression_id: e.target.value })} className={inputClass}>
                <option value="">—</option>
                {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <label className="text-[13px] font-medium space-y-1.5 block">Harder (progression)
              <select value={draft.progression_id} onChange={(e) => update({ progression_id: e.target.value })} className={inputClass}>
                <option value="">—</option>
                {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
          </div>

          {draft.quality !== 'strength' && (
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" checked={draft.superset_ok} onChange={(e) => update({ superset_ok: e.target.checked })} className="h-5 w-5 accent-[hsl(var(--accent))]" />
              Good in a superset with strength of the other region
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => save.mutate(false)} disabled={save.isPending} className="h-12 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-40">
              {draft.id ? 'Save changes' : 'Save to library'}
            </button>
            {!draft.id && (
              <button onClick={() => save.mutate(true)} disabled={save.isPending} className="h-12 rounded-xl border border-border px-6 text-sm disabled:opacity-40">Save and add another</button>
            )}
            {draft.id && <button onClick={() => setDraft(emptyDraft())} className="h-12 rounded-xl border border-border px-6 text-sm">Cancel</button>}
          </div>
        </section>

        <aside className="flex-[2_1_320px] min-w-0 space-y-4">
          <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">How members see it</p>
          <div className="max-w-sm overflow-hidden rounded-2xl border border-border bg-card">
            {vid ? (
              <div className="aspect-video"><iframe title="Preview" src={`https://www.youtube-nocookie.com/embed/${vid}`} className="h-full w-full" allowFullScreen /></div>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-foreground/90 text-[13px] text-background/70">No video yet</div>
            )}
            <div className="space-y-1.5 p-4">
              <p className="text-[11px] tracking-[0.12em] uppercase text-accent font-medium">{focusLabel(draft)} · {roleLabel(draft.role).toLowerCase()}</p>
              <p className="text-base font-semibold">{draft.name || 'Exercise name'}</p>
              {draft.cues.filter(Boolean).map((c, i) => <p key={i} className="text-[13px] text-muted-foreground">· {c}</p>)}
              {(draft.regression_id || draft.progression_id) && (
                <p className="text-[12px] text-muted-foreground pt-1">
                  {draft.regression_id && <>Too hard? {library.find((x) => x.id === draft.regression_id)?.name}</>}
                  {draft.regression_id && draft.progression_id && ' · '}
                  {draft.progression_id && <>Ready for more? {library.find((x) => x.id === draft.progression_id)?.name}</>}
                </p>
              )}
            </div>
          </div>

          <p className="pt-4 text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Library · {library.length} exercises</p>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search the library" className={inputClass} />
          <div className="divide-y divide-border">
            {filtered.map((x) => (
              <button key={x.id} onClick={() => setDraft(fromRow(x))} className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left text-sm hover:text-accent">
                <span>{x.name}</span>
                <span className="text-[12px] text-muted-foreground">{roleLabel(x.role)} · {x.quality} · {x.region.replace('_', ' ')}</span>
              </button>
            ))}
            {library.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nothing yet. Your first exercise starts the library.</p>}
          </div>
        </aside>
      </div>
    </FeedLayout>
  );
};

export default FeedLibrary;
