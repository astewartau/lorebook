import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../ui/Dialog';
import { useAuth } from '../../contexts/AuthContext';
import { useCollection } from '../../contexts/CollectionContext';
import { useToast } from '../../contexts/ToastContext';
import * as api from '../../lib/api';
import { keys } from '../../app/queryClient';
import { errorMessage } from './parts';

const CONFIRM_WORD = 'clear';

export function ClearDialog({ open, onClose, shared }: { open: boolean; onClose: () => void; shared: boolean }) {
  const { clearCollection, uniqueCards } = useCollection();
  const toast = useToast();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => {
    if (busy) return;
    setTyped('');
    onClose();
  };
  const run = async () => {
    setBusy(true);
    await clearCollection();
    setBusy(false);
    setTyped('');
    toast.success('Collection cleared.');
    onClose();
  };
  return (
    <Dialog open={open} onClose={close} title="Clear your collection?"
      description={`All ${uniqueCards.toLocaleString()} cards will be removed. This can't be undone.`}
      footer={<>
        <button type="button" className="btn-ghost" onClick={close} disabled={busy}>Cancel</button>
        <button type="button" className="btn-danger" disabled={typed.trim().toLowerCase() !== CONFIRM_WORD || busy} onClick={run}>
          {busy ? 'Clearing…' : 'Clear collection'}
        </button>
      </>}>
      {shared && <p className="text-sm mb-3">This collection is shared: it is cleared for everyone in your household.</p>}
      <label className="block space-y-1.5">
        <span className="text-sm">Type <strong className="font-mono">{CONFIRM_WORD}</strong> to confirm</span>
        <input className="input" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false}
          onKeyDown={e => { if (e.key === 'Enter' && typed.trim().toLowerCase() === CONFIRM_WORD) run(); }} />
      </label>
    </Dialog>
  );
}

export function NewBinderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => {
    if (busy) return;
    setName('');
    setDescription('');
    onClose();
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      const b = await api.createBinder(user.id, { kind: 'custom', name: name.trim(), description: description.trim() || undefined });
      await qc.invalidateQueries({ queryKey: keys.binders(user.id) });
      setBusy(false);
      close();
      navigate(`/collection/binders/${b.id}?edit=1`);
    } catch (err) {
      setBusy(false);
      toast.error(`Couldn't create the binder: ${errorMessage(err)}`);
    }
  };
  return (
    <Dialog open={open} onClose={close} title="New binder"
      description="Collect any cards you like in your own order: trade binders, favourite art, cards you want.">
      <form id="new-binder" onSubmit={create} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Name</span>
          <input className="input" required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Trade binder" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Description <span className="text-muted font-normal">(optional)</span></span>
          <textarea className="input h-24 py-2 resize-none" maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!name.trim() || busy}>{busy ? 'Creating…' : 'Create and add cards'}</button>
        </div>
      </form>
    </Dialog>
  );
}
