import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from './ui/Modal';

interface DeleteDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deckName: string;
  loading?: boolean;
}

const DeleteDeckModal: React.FC<DeleteDeckModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deckName,
  loading = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Deck"
      titleIcon={<AlertTriangle size={24} />}
      size="md"
      headerVariant="danger"
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
    >
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Trash2 size={32} className="text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-lorcana-ink mb-2">
            Are you sure?
          </h3>
          <p className="text-lorcana-navy text-sm mb-2">
            This will permanently delete the deck:
          </p>
          <p className="text-lorcana-ink font-medium mb-2">"{deckName}"</p>
          <p className="text-sm text-red-600">
            This action cannot be undone.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-sm hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete Deck
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteDeckModal;
