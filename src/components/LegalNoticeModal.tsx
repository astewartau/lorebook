import React from 'react';
import { X, ExternalLink, Scale } from 'lucide-react';

interface LegalNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LegalNoticeModal: React.FC<LegalNoticeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-2xl border-2 border-lorcana-gold max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-lorcana-navy text-lorcana-gold border-b-2 border-lorcana-gold">
          <div className="flex items-center space-x-2">
            <Scale size={24} />
            <h2 className="text-xl font-bold">Legal Notice</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-lorcana-gold hover:text-lorcana-navy rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-lorcana-ink leading-relaxed space-y-4">
            <p>
              Lorebook uses trademarks and/or copyrights associated with Disney Lorcana TCG, 
              used under Ravensburger's Community Code Policy. We are expressly prohibited from charging 
              you to use or access this content.
            </p>
            <p>
              Lorebook is not published, endorsed, or specifically approved by Disney or Ravensburger.
            </p>
            <div className="pt-2">
              <a 
                href="https://www.disneylorcana.com/en-US/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-lorcana-navy hover:text-lorcana-purple transition-colors duration-200 font-medium"
              >
                Learn more about Disney Lorcana TCG
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
          
          {/* Close button */}
          <div className="pt-4 border-t border-lorcana-gold/30">
            <button
              onClick={onClose}
              className="btn-lorcana-navy w-full"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalNoticeModal;