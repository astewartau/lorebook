import { ReactNode, useMemo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import type { LorcanaCard } from '../types';
import { useCardData } from '../contexts/CardDataContext';
import { findCardByName } from '../utils/deckImport';

const CARD_REF = /\[\[([^\]\n]{2,80})\]\]/g;

/** Turns [[Card Name]] into links the renderer below recognises. */
export function linkCardNames(markdown: string, cards: LorcanaCard[]): string {
  return markdown.replace(CARD_REF, (whole, name: string) => {
    const card = findCardByName(cards, name.trim());
    return card ? `[${name.trim()}](card:${card.id})` : whole;
  });
}

function CardLink({ card, href, children }: { card: LorcanaCard; href: string; children: ReactNode }) {
  return (
    <span className="relative inline-block group/card">
      <Link to={href} className="text-accent font-medium underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
        {children}
      </Link>
      <span role="presentation"
        className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-44 opacity-0 group-hover/card:opacity-100 transition-opacity z-20 hidden sm:block">
        <img src={card.images.thumbnail} alt="" loading="lazy" className="w-full aspect-card rounded-[4.6%/3.3%] shadow-pop" />
      </span>
    </span>
  );
}

interface Props {
  children: string;
  /** Where a [[Card Name]] link goes. */
  cardHref?: (card: LorcanaCard) => string;
}

/**
 * Markdown written by users: GitHub-style (tables, lists, strikethrough),
 * no raw HTML, game symbols drawn as icons, and [[Card Name]] links.
 */
export function Markdown({ children, cardHref }: Props) {
  const { allCards, getCard } = useCardData();
  const source = useMemo(() => linkCardNames(children, allCards), [children, allCards]);

  const components: Components = useMemo(() => ({
    h1: p => <h3 className="font-display text-2xl font-semibold mt-6 mb-2" {...p} />,
    h2: p => <h3 className="font-display text-xl font-semibold mt-6 mb-2" {...p} />,
    h3: p => <h4 className="font-semibold text-lg mt-5 mb-1.5" {...p} />,
    h4: p => <h5 className="font-semibold mt-4 mb-1" {...p} />,
    p: ({ children: c }) => <p className="my-3">{c}</p>,
    ul: p => <ul className="my-3 pl-6 list-disc space-y-1" {...p} />,
    ol: p => <ol className="my-3 pl-6 list-decimal space-y-1" {...p} />,
    blockquote: p => <blockquote className="my-4 border-l-2 border-accent-fill pl-4 text-muted" {...p} />,
    hr: () => <hr className="my-6 border-line" />,
    code: p => <code className="px-1.5 py-0.5 rounded bg-surface-2 text-[0.9em]" {...p} />,
    pre: p => <pre className="my-4 p-3 rounded-lg bg-surface-2 overflow-x-auto text-sm" {...p} />,
    table: p => <div className="my-4 overflow-x-auto"><table className="text-sm border-collapse" {...p} /></div>,
    th: p => <th className="border border-line px-3 py-1.5 text-left bg-surface-2 font-semibold" {...p} />,
    td: p => <td className="border border-line px-3 py-1.5" {...p} />,
    img: () => null,
    a: ({ href, children: c }) => {
      const id = href?.startsWith('card:') ? Number(href.slice(5)) : NaN;
      const card = Number.isFinite(id) ? getCard(id) : undefined;
      if (card) return cardHref ? <CardLink card={card} href={cardHref(card)}>{c}</CardLink> : <strong>{c}</strong>;
      const safe = href && /^(https?:|mailto:|\/|#)/i.test(href) ? href : undefined;
      return <a href={safe} target="_blank" rel="noreferrer nofollow" className="text-accent underline underline-offset-2">{c}</a>;
    },
  }) as Components, [getCard, cardHref]);

  return (
    <div className="text-[15px] leading-relaxed break-words [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}
        // The link renderer above allows only card:, http(s), mailto and site paths.
        urlTransform={url => url}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
