import React from 'react';
import { ExternalLink, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-lorcana-navy border-t-2 border-lorcana-gold">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            {/* Left Column - Legal Disclaimer */}
            <div className="space-y-4">
              <h3 className="text-lorcana-gold font-semibold text-lg">Legal Notice</h3>
              <div className="text-lorcana-cream/90 text-sm leading-relaxed space-y-2">
                <p>
                  Lorebook uses trademarks and/or copyrights associated with Disney Lorcana TCG, 
                  used under Ravensburger's Community Code Policy. We are expressly prohibited from charging 
                  you to use or access this content.
                </p>
                <p>
                  Lorebook is not published, endorsed, or specifically approved by Disney or Ravensburger.
                </p>
                <a 
                  href="https://www.disneylorcana.com/en-US/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-lorcana-gold hover:text-lorcana-cream transition-colors duration-200"
                >
                  Learn more about Disney Lorcana TCG
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Right Column - Data Attribution */}
            <div className="space-y-4">
              <h3 className="text-lorcana-gold font-semibold text-lg">Data Attribution</h3>
              <div className="text-lorcana-cream/90 text-sm leading-relaxed space-y-2">
                <p>
                  Card data is provided by the community-driven LorcanaJSON project.
                </p>
                <a 
                  href="https://github.com/LorcanaJSON/LorcanaJSON" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-lorcana-gold hover:text-lorcana-cream transition-colors duration-200"
                >
                  Visit LorcanaJSON on GitHub
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Section - Made with Love */}
          <div className="border-t border-lorcana-gold/30 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-lorcana-cream/80 text-sm">
                <span>Made with</span>
                <Heart size={16} className="text-red-400 fill-current" />
                <span>for the Lorcana community</span>
              </div>
              
              <div className="text-lorcana-cream/60 text-xs">
                © {new Date().getFullYear()} Lorebook
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;