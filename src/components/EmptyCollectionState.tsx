import React from 'react';
import { Package } from 'lucide-react';

export const EmptyCollectionState: React.FC = () => {
  return (
    <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-lg p-12 text-center art-deco-corner">
      <Package size={48} className="mx-auto text-lorcana-navy mb-4" />
      <h3 className="text-xl font-semibold text-lorcana-ink mb-2">Your collection is empty</h3>
      <p className="text-lorcana-navy mb-6">
        Start building your collection by browsing cards and adding them from the Browse Cards tab.
      </p>
    </div>
  );
};