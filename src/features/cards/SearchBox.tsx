import { useEffect, useRef, useState } from 'react';
import { HelpCircle, Search, X } from 'lucide-react';
import { Menu } from '../../ui/Menu';

const EXAMPLES: [string, string][] = [
  ['elsa', 'Words anywhere on the card'],
  ['cost>=5', 'Cost: = < > <= >='],
  ['ink:amethyst', 'Ink'],
  ['type:song', 'Type or classification'],
  ['ability:evasive', 'Ability text and keywords'],
  ['strength>3 lore:2', 'Strength, willpower, lore'],
  ['story:frozen', 'Franchise'],
  ['inkable:no', 'Inkable or not'],
  ['name!=mickey', 'Exclude with !='],
  ['"draw a card"', 'Exact phrase'],
];

interface Props {
  value: string;
  onChange: (q: string) => void;
}

/** Search box that sends its text after a short pause, with a syntax cheat sheet. */
export function SearchBox({ value, onChange }: Props) {
  const [text, setText] = useState(value);
  const input = useRef<HTMLInputElement>(null);
  const sent = useRef(value);

  // Back/forward or "clear filters" change the URL: follow it.
  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    if (text === sent.current) return;
    const t = setTimeout(() => {
      sent.current = text;
      onChange(text);
    }, 200);
    return () => clearTimeout(t);
  }, [text, onChange]);

  // "/" focuses the search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !target.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative flex-1 min-w-0">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input ref={input} type="search" value={text} onChange={e => setText(e.target.value)}
        placeholder="Search cards, or try cost<=2 ink:ruby" aria-label="Search cards"
        className="input h-11 pl-10 pr-20 text-[15px] [&::-webkit-search-cancel-button]:hidden" />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
        {text && (
          <button type="button" className="icon-btn h-8 w-8" aria-label="Clear search" onClick={() => { setText(''); input.current?.focus(); }}>
            <X size={16} />
          </button>
        )}
        <Menu label="Search help" triggerClassName="icon-btn h-8 w-8" trigger={<HelpCircle size={16} />}>
          {close => (
            <div className="p-2 w-80">
              <p className="text-sm text-muted px-1 pb-2">Combine any of these. Click one to try it.</p>
              {EXAMPLES.map(([ex, what]) => (
                <button key={ex} type="button" onClick={() => { setText(ex); close(); }}
                  className="w-full flex items-baseline gap-3 px-2 py-1.5 rounded-md hover:bg-surface-2 text-left">
                  <code className="text-sm text-accent font-mono shrink-0">{ex}</code>
                  <span className="text-xs text-muted">{what}</span>
                </button>
              ))}
            </div>
          )}
        </Menu>
      </div>
    </div>
  );
}
