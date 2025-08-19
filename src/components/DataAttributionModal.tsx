import React from 'react';
import { X, ExternalLink, Database } from 'lucide-react';

interface DataAttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DataAttributionModal: React.FC<DataAttributionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-2xl border-2 border-lorcana-gold max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-lorcana-navy text-lorcana-gold border-b-2 border-lorcana-gold">
          <div className="flex items-center space-x-2">
            <Database size={24} />
            <h2 className="text-xl font-bold">Data Attribution</h2>
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
      </div>
    </div>
  );
};

export default DataAttributionModal;