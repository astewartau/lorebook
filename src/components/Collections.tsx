import React, { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Collection from './Collection';
import AuthRequired from './AuthRequired';

const Collections: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'sets' | 'custom'>('sets');

  // Show auth required if not signed in
  if (!user) {
    return (
      <AuthRequired 
        feature="collections" 
        onSignIn={() => {
          // Open login modal - need to pass this from App.tsx
          const signInButton = document.querySelector('[data-sign-in-button]') as HTMLButtonElement;
          if (signInButton) signInButton.click();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-lorcana-navy border-2 border-lorcana-gold rounded-sm shadow-xl p-6 art-deco-corner">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-lorcana-gold mb-2 tracking-wider">My Collections</h2>
            <p className="text-lorcana-cream text-sm">
              Organize your cards in set binders or create custom collections
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('sets')}
            className={`px-4 py-2 rounded-sm font-medium transition-colors border-2 ${
              activeTab === 'sets'
                ? 'bg-lorcana-gold text-lorcana-ink border-lorcana-gold'
                : 'bg-transparent text-lorcana-cream border-lorcana-cream hover:bg-lorcana-cream/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package size={16} />
              <span>Sets</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-sm font-medium transition-colors border-2 ${
              activeTab === 'custom'
                ? 'bg-lorcana-gold text-lorcana-ink border-lorcana-gold'
                : 'bg-transparent text-lorcana-cream border-lorcana-cream hover:bg-lorcana-cream/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Plus size={16} />
              <span>Custom</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'sets' && <Collection />}
      {activeTab === 'custom' && <CustomCollections />}
    </div>
  );
};

const CustomCollections: React.FC = () => {
  return (
    <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-lg p-12 text-center art-deco-corner">
      <Plus size={48} className="mx-auto text-lorcana-navy mb-4" />
      <h3 className="text-xl font-semibold text-lorcana-ink mb-2">Custom Binders</h3>
      <p className="text-lorcana-navy mb-6">
        Create custom binders to organize your cards by theme, deck ideas, or any other criteria you choose.
      </p>
      <button className="btn-lorcana flex items-center gap-2 mx-auto">
        <Plus size={16} />
        <span>Create Custom Binder</span>
      </button>
    </div>
  );
};

export default Collections;