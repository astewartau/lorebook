import React from 'react';
import { ExternalLink, Database } from 'lucide-react';
import { Modal } from './ui/Modal';

interface DataAttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DataAttributionModal: React.FC<DataAttributionModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Attribution"
      titleIcon={<Database size={24} />}
      size="xl"
    >
      <div className="p-6 space-y-4">
        <div className="text-lorcana-ink leading-relaxed space-y-4">
          <p>
            Card data is provided by the community-driven LorcanaJSON project.
          </p>
          <div className="pt-2">
            <a
              href="https://github.com/LorcanaJSON/LorcanaJSON"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-lorcana-navy hover:text-lorcana-purple transition-colors duration-200 font-medium"
            >
              Visit LorcanaJSON on GitHub
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

export default DataAttributionModal;
