import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileUp } from 'lucide-react';
import { Dialog } from '../../ui/Dialog';
import { useCardData } from '../../contexts/CardDataContext';
import { useCollection } from '../../contexts/CollectionContext';
import { useToast } from '../../contexts/ToastContext';
import { importDreambornCollection } from '../../utils/dreambornImport';
import type { LorcanaCard } from '../../types';
import { Parsed, parseLorebookJSON, summarise } from './importFile';
import { Segmented, errorMessage } from './parts';

type Format = 'dreamborn' | 'json';

export function ImportDialog({ open, onClose, shared }: { open: boolean; onClose: () => void; shared: boolean }) {
  const { allCards, cardsById } = useCardData();
  const { importCollectionDirect, uniqueCards, totalCards } = useCollection();
  const toast = useToast();
  const [format, setFormat] = useState<Format>('dreamborn');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFileName('');
    setParsed(null);
    setError('');
    if (input.current) input.current.value = '';
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const read = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const text = await file.text();
      if (format === 'json') {
        setParsed(parseLorebookJSON(text, cardsById));
      } else {
        const r = importDreambornCollection(text, allCards);
        setParsed(summarise(
          r.importedCards.map(c => ({ cardId: c.card.id, quantityNormal: c.normalQuantity, quantityFoil: c.foilQuantity })),
          r.failedCards.map(f => `${f.name} (set ${f.set}, #${f.cardNumber})`),
        ));
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const apply = async () => {
    if (!parsed) return;
    setBusy(true);
    const ok = await importCollectionDirect(parsed.entries);
    setBusy(false);
    if (ok) {
      toast.success(`Imported ${parsed.entries.length.toLocaleString()} cards.`);
      reset();
      onClose();
    } else {
      toast.error('The import didn’t save. Your collection is unchanged; try again.');
    }
  };

  const accept = format === 'json' ? '.json,application/json' : '.csv,.tsv,.txt,text/csv';
  const preview = useMemo(() => parsed?.entries.slice(0, 8).map(e => cardsById.get(e.cardId)).filter(Boolean) as LorcanaCard[] | undefined, [parsed, cardsById]);

  return (
    <Dialog open={open} onClose={close} title="Import a collection" width="max-w-lg"
      description="Bring in cards from Dreamborn or from a Lorebook export."
      footer={<>
        <button type="button" className="btn-ghost" onClick={close} disabled={busy}>Cancel</button>
        <button type="button" className="btn-danger" disabled={!parsed || parsed.entries.length === 0 || busy} onClick={apply}>
          {busy ? 'Importing…' : parsed ? `Replace with ${parsed.entries.length.toLocaleString()} cards` : 'Replace collection'}
        </button>
      </>}>
      <div className="space-y-4">
        <Segmented<Format> label="File type" value={format} onChange={f => { setFormat(f); reset(); }} options={[
          { value: 'dreamborn', label: 'Dreamborn CSV' },
          { value: 'json', label: 'Lorebook JSON' },
        ]} />

        <div className="flex gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
          <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
          <p>
            <strong>Importing replaces your whole collection.</strong>{' '}
            The {uniqueCards.toLocaleString()} cards ({totalCards.toLocaleString()} copies) in it now are swapped for the cards in the file.
            {shared && ' This collection is shared, so it changes for everyone in your household.'}
            {' '}Export first if you want a backup.
          </p>
        </div>

        <label
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) read(f); }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer
            ${dragging ? 'border-accent-fill bg-accent-fill/10' : 'border-line hover:border-muted'}`}>
          <FileUp size={24} className="text-muted" />
          <span className="font-medium">{fileName || `Choose a ${format === 'json' ? '.json' : '.csv'} file`}</span>
          <span className="text-xs text-muted">
            {format === 'dreamborn' ? 'In Dreamborn: Collection, then Export to CSV.' : 'A file saved with Export, then JSON.'} Or drop it here.
          </span>
          <input ref={input} type="file" accept={accept} className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) read(f); }} />
        </label>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        {parsed && (
          <div className="space-y-3" aria-live="polite">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Cards', parsed.entries.length], ['Copies', parsed.copies], ['Foils', parsed.foils]].map(([label, n]) => (
                <div key={label} className="rounded-lg bg-surface-2 py-2">
                  <div className="text-lg font-semibold tabular-nums">{Number(n).toLocaleString()}</div>
                  <div className="text-xs text-muted">{label}</div>
                </div>
              ))}
            </div>
            {preview && preview.length > 0 && (
              <div className="flex -space-x-6 overflow-hidden" aria-hidden>
                {preview.map(c => (
                  <img key={c.id} src={c.images.thumbnail} alt="" className="w-14 aspect-card rounded-[4.6%/3.3%] object-cover shadow-card ring-1 ring-black/20" />
                ))}
              </div>
            )}
            {parsed.failed.length > 0 && (
              <details className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <summary className="cursor-pointer py-1">
                  <span className="text-danger font-medium">{parsed.failed.length} row{parsed.failed.length === 1 ? '' : 's'} not recognised</span>
                  <span className="text-muted"> and will be left out</span>
                </summary>
                <ul className="mt-1 mb-1 max-h-40 overflow-y-auto text-muted space-y-0.5">
                  {parsed.failed.slice(0, 100).map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
