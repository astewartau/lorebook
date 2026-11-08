import { useState } from 'react';
import LegalNoticeModal from '../components/LegalNoticeModal';
import DataAttributionModal from '../components/DataAttributionModal';

export function SiteFooter() {
  const [open, setOpen] = useState<'legal' | 'data' | null>(null);
  const link = 'hover:text-fg transition-colors';
  return (
    <footer className="border-t border-line mt-16">
      <div className="mx-auto max-w-[1600px] px-4 py-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
        <span>Lorebook is a fan project, not affiliated with Disney or Ravensburger.</span>
        <div className="flex gap-4 sm:ml-auto">
          <button type="button" className={link} onClick={() => setOpen('data')}>Card data</button>
          <button type="button" className={link} onClick={() => setOpen('legal')}>Legal</button>
        </div>
      </div>
      <LegalNoticeModal isOpen={open === 'legal'} onClose={() => setOpen(null)} />
      <DataAttributionModal isOpen={open === 'data'} onClose={() => setOpen(null)} />
    </footer>
  );
}
