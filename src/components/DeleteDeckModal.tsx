import React from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-sm shadow-2xl border-2 border-lorcana-gold max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-red-600 text-white border-b-2 border-lorcana-gold">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={24} />
            <h2 className="text-xl font-bold">Delete Deck</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-700 hover:text-white rounded transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
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
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-sm hover:bg-gray-300 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
};

export default DeleteDeckModal;