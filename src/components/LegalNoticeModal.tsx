import React from 'react';
import { ExternalLink, Scale } from 'lucide-react';
import { Modal } from './ui/Modal';

interface LegalNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LegalNoticeModal: React.FC<LegalNoticeModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Legal Notice"
      titleIcon={<Scale size={24} />}
      size="xl"
    >
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
    </Modal>
  );
};

export default LegalNoticeModal;
