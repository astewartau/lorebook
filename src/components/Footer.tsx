import React from 'react';
import { Heart } from 'lucide-react';

interface FooterProps {
  onLegalClick: () => void;
  onDataAttributionClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ onLegalClick, onDataAttributionClick }) => {
  return (
    <footer className="sm:fixed bottom-0 left-0 right-0 bg-lorcana-navy/95 backdrop-blur-sm border-t border-lorcana-gold/30 z-40">
      <div className="px-4 py-2 relative flex items-center">
        {/* Left side - Made with love */}
        <div className="flex items-center gap-1 text-lorcana-cream/80 text-xs flex-1">
          <span className="hidden sm:inline">Made with</span>
          <span className="sm:hidden">Made with</span>
          <Heart size={12} className="text-red-400 fill-current" />
          <span className="hidden sm:inline">for the Lorcana community</span>
        </div>

        {/* Center - Links (absolutely positioned for true centering) */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-2 bg-lorcana-purple/30 backdrop-blur-sm border border-lorcana-gold/20 rounded-full px-3 py-1">
            <button
              onClick={onLegalClick}
              className="text-lorcana-cream/70 hover:text-lorcana-gold transition-colors cursor-pointer text-xs font-medium"
            >
              Legal
            </button>
            <span className="text-lorcana-gold/50 text-xs">•</span>
            <button
              onClick={onDataAttributionClick}
              className="text-lorcana-cream/70 hover:text-lorcana-gold transition-colors cursor-pointer text-xs font-medium"
            >
              Data
            </button>
            <span className="text-lorcana-gold/50 text-xs">•</span>
            <span className="text-lorcana-cream/60 text-xs font-light">© {new Date().getFullYear()}</span>
          </div>
        </div>

        {/* Right side - Buy me a coffee */}
        <div className="flex justify-end flex-1">
          <a
            href="https://buymeacoffee.com/lorebook"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity duration-200"
            title="Support Lorebook development"
          >
            <img 
              src="/imgs/bmc-logo-alt.svg" 
              alt="Buy Me A Coffee" 
              className="h-8 w-8 bg-yellow-400 rounded p-1 object-contain"
            />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;