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

        {/* Right side - Discord and Buy me a coffee */}
        <div className="flex justify-end flex-1 gap-2">
          <a
            href="https://discord.gg/P8Rt3PFX"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity duration-200"
            title="Join our Discord community"
          >
            <div className="h-8 w-8 bg-[#5865F2] rounded p-1 flex items-center justify-center">
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="white"
                className="object-contain"
              >
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
              </svg>
            </div>
          </a>
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