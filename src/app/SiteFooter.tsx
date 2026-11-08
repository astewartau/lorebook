import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Dialog } from '../ui/Dialog';

const link = 'inline-flex items-center gap-1.5 text-accent hover:underline';

export function SiteFooter() {
  const [open, setOpen] = useState<'legal' | 'data' | null>(null);
  const close = () => setOpen(null);
  const item = 'hover:text-fg transition-colors';
  return (
    <footer className="border-t border-line mt-16">
      <div className="mx-auto max-w-[1600px] px-4 py-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
        <span>Lorebook is a fan project, not affiliated with Disney or Ravensburger.</span>
        <div className="flex gap-4 sm:ml-auto">
          <a className={item} href="https://discord.gg/P8Rt3PFX" target="_blank" rel="noreferrer">Discord</a>
          <a className={item} href="https://buymeacoffee.com/lorebook" target="_blank" rel="noreferrer">Support Lorebook</a>
          <button type="button" className={item} onClick={() => setOpen('data')}>Card data</button>
          <button type="button" className={item} onClick={() => setOpen('legal')}>Legal</button>
        </div>
      </div>

      <Dialog open={open === 'legal'} onClose={close} title="Legal notice">
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            Lorebook uses trademarks and copyrights associated with Disney Lorcana TCG, under Ravensburger's
            Community Code Policy. We are expressly prohibited from charging you to use or access this content.
          </p>
          <p>Lorebook is not published, endorsed, or specifically approved by Disney or Ravensburger.</p>
          <a className={link} href="https://www.disneylorcana.com/en-US/" target="_blank" rel="noreferrer">
            About Disney Lorcana TCG <ExternalLink size={14} />
          </a>
        </div>
      </Dialog>

      <Dialog open={open === 'data'} onClose={close} title="Card data">
        <div className="space-y-3 text-sm leading-relaxed">
          <p>Card data and images come from LorcanaJSON, a community project.</p>
          <a className={link} href="https://lorcanajson.org" target="_blank" rel="noreferrer">
            LorcanaJSON <ExternalLink size={14} />
          </a>
        </div>
      </Dialog>
    </footer>
  );
}
