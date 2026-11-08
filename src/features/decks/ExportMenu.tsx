import { ClipboardCopy, Download, ExternalLink, Link2, Share } from 'lucide-react';
import type { Deck } from '../../types';
import { useCardData } from '../../contexts/CardDataContext';
import { useToast } from '../../contexts/ToastContext';
import { Menu, MenuItem, MenuSeparator } from '../../ui/Menu';
import { generateInktableUrl } from '../../utils/inktableExport';
import { deckLines, deckToCsv, deckToJson, deckToText, fileSafe } from './deckLogic';

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportMenu({ deck, playerName, buttonClass = 'btn-secondary' }: { deck: Deck; playerName?: string; buttonClass?: string }) {
  const { allCards, cardsById } = useCardData();
  const toast = useToast();
  const empty = deck.cards.length === 0;

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${what}`);
    } catch {
      toast.error(`Couldn't copy ${what}`);
    }
  };

  return (
    <Menu label="Export" triggerClassName={buttonClass} trigger={<><Share size={17} /><span>Export</span></>}>
      {close => (
        <>
          <MenuItem onClick={() => { close(); void copy(deckToText(deckLines(deck.cards, cardsById)), 'the deck list'); }}>
            <ClipboardCopy size={16} /> Copy deck list
          </MenuItem>
          {deck.isPublic && (
            <MenuItem onClick={() => { close(); void copy(`${window.location.origin}/decks/${deck.id}`, 'the link'); }}>
              <Link2 size={16} /> Copy link to this deck
            </MenuItem>
          )}
          <MenuSeparator />
          <MenuItem onClick={() => { close(); download(`${fileSafe(deck.name)}.json`, 'application/json', JSON.stringify(deckToJson(deck, cardsById), null, 2)); }}>
            <Download size={16} /> Download JSON
          </MenuItem>
          <MenuItem onClick={() => { close(); download(`${fileSafe(deck.name)}.txt`, 'text/plain', deckToText(deckLines(deck.cards, cardsById))); }}>
            <Download size={16} /> Download text list
          </MenuItem>
          <MenuItem onClick={() => { close(); download(`${fileSafe(deck.name)}.csv`, 'text/csv', deckToCsv(deckLines(deck.cards, cardsById))); }}>
            <Download size={16} /> Download CSV
          </MenuItem>
          {!empty && (
            <>
              <MenuSeparator />
              <MenuItem onClick={() => { close(); window.open(generateInktableUrl(deck, allCards, playerName), '_blank', 'noopener'); }}>
                <ExternalLink size={16} /> Play on Inktable
              </MenuItem>
              <MenuItem onClick={() => { close(); void copy(generateInktableUrl(deck, allCards, playerName), 'the Inktable link'); }}>
                <Link2 size={16} /> Copy Inktable link
              </MenuItem>
            </>
          )}
        </>
      )}
    </Menu>
  );
}
