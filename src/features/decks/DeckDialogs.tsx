import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardPaste, FileUp } from 'lucide-react';
import type { Deck } from '../../types';
import { useCardData } from '../../contexts/CardDataContext';
import { Dialog } from '../../ui/Dialog';
import { ParseResult, parseLorebookJSON, parseTTSDeck, parseTextDeck } from '../../utils/deckImport';
import { checkDeck, deckInks, deckLines, groupByKind, totalCards } from './deckLogic';
import { InkRow, Segmented, StatusBadge } from './DeckBits';
import { useDeckActions } from './useDecks';

export function DeleteDeckDialog({ deck, onClose, onDeleted }: { deck: Deck | null; onClose: () => void; onDeleted?: () => void }) {
  const { remove } = useDeckActions();
  return (
    <Dialog open={!!deck} onClose={onClose} title="Delete this deck?"
      description={deck ? <>“{deck.name}” will be gone for good{deck.isPublic ? ', including its public page' : ''}.</> : null}
      footer={<>
        <button type="button" className="btn-secondary" onClick={onClose} data-autofocus>Keep it</button>
        <button type="button" className="btn-danger" disabled={remove.isPending}
          onClick={() => deck && remove.mutate(deck, { onSuccess: () => { onClose(); onDeleted?.(); } })}>
          {remove.isPending ? 'Deleting…' : 'Delete deck'}
        </button>
      </>}>
      <span />
    </Dialog>
  );
}

const SAMPLE = '4 Elsa - Snow Queen\n3 Let It Go\n2 Maleficent - Monstrous Dragon';

/** Parses an uploaded file: Dreamborn / Tabletop Simulator JSON, Lorebook JSON, or a text list. */
function parseFile(text: string, allCards: Parameters<typeof parseTextDeck>[1]): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return parseTextDeck(text, allCards);
  }
  const tts = parseTTSDeck(json, allCards);
  if (tts.deck) return tts;
  const lb = parseLorebookJSON(json);
  if (lb.deck) return lb;
  return { deck: null, warnings: ['This file is not a deck list we recognise (Dreamborn / Tabletop Simulator JSON, Lorebook JSON or a text list).'] };
}

export function ImportDeckDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { allCards, cardsById } = useCardData();
  const { create } = useDeckActions();
  const navigate = useNavigate();
  const [source, setSource] = useState<'text' | 'file'>('text');
  const [text, setText] = useState('');
  const [fileResult, setFileResult] = useState<{ name: string; result: ParseResult } | null>(null);
  const [name, setName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(text);

  const textResult = useMemo(() => (deferred.trim() ? parseTextDeck(deferred, allCards) : null), [deferred, allCards]);
  const raw = source === 'text' ? textResult : fileResult?.result ?? null;

  // Lorebook JSON carries ids; drop any we don't know.
  const result = useMemo(() => {
    if (!raw?.deck) return raw;
    const unknown = raw.deck.cards.filter(c => !cardsById.has(c.cardId));
    if (!unknown.length) return raw;
    return {
      deck: { ...raw.deck, cards: raw.deck.cards.filter(c => cardsById.has(c.cardId)) },
      warnings: [...raw.warnings, `${unknown.length} card id${unknown.length === 1 ? '' : 's'} not in the card database`],
    };
  }, [raw, cardsById]);

  const parsedName = source === 'file' ? result?.deck?.name : undefined;
  const lines = useMemo(() => deckLines(result?.deck?.cards ?? [], cardsById), [result, cardsById]);
  const count = totalCards(result?.deck?.cards ?? []);

  const reset = () => {
    setText('');
    setFileResult(null);
    setName('');
    setSource('text');
  };
  const close = () => {
    reset();
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    const r = parseFile(content, allCards);
    setFileResult({ name: file.name, result: r });
  };

  const submit = () => {
    if (!result?.deck || !count) return;
    const finalName = (name.trim() || parsedName || 'Imported deck').slice(0, 100);
    // The text and Dreamborn parsers describe where a deck came from; that's not a description.
    const description = result.deck.description?.startsWith('Imported from') ? undefined : result.deck.description;
    create.mutate({ name: finalName, description, cards: result.deck.cards }, {
      onSuccess: deck => {
        close();
        navigate(`/decks/${deck.id}`);
      },
    });
  };

  const check = result?.deck ? checkDeck({ cards: result.deck.cards }, cardsById) : null;

  return (
    <Dialog open={open} onClose={close} title="Import a deck" width="max-w-2xl"
      description="Paste a list like “4 Elsa - Snow Queen”, or upload a Dreamborn, Tabletop Simulator or Lorebook file."
      footer={<>
        <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
        <button type="button" className="btn-primary" disabled={!count || create.isPending} onClick={submit}>
          {create.isPending ? 'Importing…' : count ? `Import ${count} cards` : 'Import'}
        </button>
      </>}>
      <div className="space-y-4">
        <Segmented label="Import from" value={source} onChange={setSource} options={[
          { value: 'text', label: <><ClipboardPaste size={15} />Paste a list</> },
          { value: 'file', label: <><FileUp size={15} />Upload a file</> },
        ]} />

        {source === 'text' ? (
          <label className="block">
            <span className="sr-only">Deck list</span>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={8} placeholder={SAMPLE}
              className="input h-auto py-2 font-mono text-[13px] leading-relaxed resize-y" />
          </label>
        ) : (
          <div>
            <input ref={fileInput} type="file" accept=".json,.txt,application/json,text/plain" className="sr-only" tabIndex={-1}
              onChange={e => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
            <button type="button" className="w-full rounded-xl border-2 border-dashed border-line hover:border-accent-fill bg-surface-2/50 px-4 py-8 flex flex-col items-center gap-2 text-sm"
              onClick={() => fileInput.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); void onFile(e.dataTransfer.files[0]); }}>
              <FileUp size={22} className="text-muted" />
              {fileResult ? <span className="font-medium">{fileResult.name}</span> : <span className="font-medium">Choose a file or drop it here</span>}
              <span className="text-muted">.json or .txt</span>
            </button>
          </div>
        )}

        {result && (
          <section aria-label="Preview" className="space-y-3">
            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-accent-fill/40 bg-accent-fill/10 p-3 text-sm space-y-1">
                <p className="font-medium inline-flex items-center gap-1.5"><AlertTriangle size={15} className="text-accent" />
                  {result.warnings.length} line{result.warnings.length === 1 ? '' : 's'} couldn't be read</p>
                <ul className="text-muted max-h-28 overflow-y-auto space-y-0.5">
                  {result.warnings.map((w, i) => <li key={i} className="break-words">{w}</li>)}
                </ul>
              </div>
            )}
            {count > 0 && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <InkRow inks={deckInks(result.deck!.cards, cardsById)} />
                  <span className="text-sm tabular-nums">{count} cards, {lines.length} different</span>
                  {check && <StatusBadge check={check} />}
                </div>
                <div className="rounded-lg border border-line max-h-56 overflow-y-auto p-3 sm:columns-2 gap-6 text-sm">
                  {groupByKind(lines).map(g => (
                    <div key={g.kind} className="break-inside-avoid mb-3">
                      <h4 className="label mb-1">{g.label} · {g.count}</h4>
                      {g.lines.map(l => (
                        <div key={l.card.id} className="flex gap-2 py-0.5">
                          <span className="w-5 text-right tabular-nums text-muted">{l.quantity}</span>
                          <span className="truncate">{l.card.fullName}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <label className="block space-y-1.5">
                  <span className="label">Deck name</span>
                  <input className="input" value={name} maxLength={100} placeholder={parsedName ?? 'Imported deck'} onChange={e => setName(e.target.value)} />
                </label>
              </>
            )}
          </section>
        )}
      </div>
    </Dialog>
  );
}
