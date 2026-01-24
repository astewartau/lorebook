import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useCollection } from '../contexts/CollectionContext';
import { useCardData } from '../contexts/CardDataContext';
import { importDreambornCollection, generateImportSummary, ImportedCard, ImportResult } from '../utils/dreambornImport';

interface DreambornImportProps {
  onClose: () => void;
}

const DreambornImport: React.FC<DreambornImportProps> = ({ onClose }) => {
  const { importCollectionDirect } = useCollection();
  const { allCards } = useCardData();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    importedCards?: ImportedCard[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportResult({
        success: false,
        message: 'Please select a CSV file'
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const csvContent = await file.text();
      const result: ImportResult = importDreambornCollection(csvContent, allCards);
      const { importedCards, failedCards } = result;
      
      if (importedCards.length === 0) {
        setImportResult({
          success: false,
          message: 'No cards found to import. Make sure your CSV has cards with quantities > 0.'
        });
        setIsImporting(false);
        return;
      }

      // Convert to collection format
      const collectionCards = importedCards
        .filter(({ normalQuantity, foilQuantity }) => normalQuantity > 0 || foilQuantity > 0)
        .map(({ card, normalQuantity, foilQuantity }) => ({
          cardId: card.id,
          quantityNormal: normalQuantity,
          quantityFoil: foilQuantity
        }));

      // Debug: Log what we're about to import
      const totalFoil = collectionCards.reduce((sum, c) => sum + c.quantityFoil, 0);
      const cardsWithFoil = collectionCards.filter(c => c.quantityFoil > 0);
      console.log(`=== IMPORTING TO COLLECTION ===`);
      console.log(`Total cards to import: ${collectionCards.length}`);
      console.log(`Cards with foil quantities: ${cardsWithFoil.length}`);
      console.log(`Total foil quantity: ${totalFoil}`);
      if (cardsWithFoil.length > 0) {
        console.log(`First 5 cards with foils:`, cardsWithFoil.slice(0, 5));
      }

      // Use direct import - simple and fast!
      const success = await importCollectionDirect(collectionCards);
      
      if (success) {
        const summary = generateImportSummary(importedCards, failedCards);
        setImportResult({
          success: true,
          message: summary,
          importedCards
        });
      } else {
        setImportResult({
          success: false,
          message: 'Failed to save collection to database'
        });
      }

    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import CSV file'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFile && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(csvFile);
      fileInputRef.current.files = dt.files;
      handleFileSelect({ target: fileInputRef.current } as any);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-2xl w-full max-w-lg mx-4 art-deco-corner">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-lorcana-navy text-lorcana-gold border-b-2 border-lorcana-gold">
          <div className="flex items-center space-x-3">
            <div className="bg-lorcana-gold/20 border border-lorcana-gold p-3 rounded-sm">
              <Upload size={24} className="text-lorcana-gold" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-lorcana-cream">Import Collection</h2>
              <p className="text-sm text-lorcana-cream/80">Import from Dreamborn CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className={`transition-colors ${
              isImporting
                ? 'text-lorcana-cream/30 cursor-not-allowed'
                : 'text-lorcana-cream/60 hover:text-lorcana-cream'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">

          <div className="space-y-4">
            <div className="text-sm text-lorcana-ink">
              <p className="mb-2">Import your collection from a Dreamborn CSV export.</p>
              <p className="text-xs text-lorcana-navy">Expected format: Set Number, Card Number, Variant, Count, Name, Color, Rarity</p>
            </div>

            {!importResult && (
              <div
                className="border-2 border-dashed border-lorcana-gold/60 rounded-sm p-8 text-center hover:border-lorcana-gold transition-colors cursor-pointer bg-lorcana-cream/30"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-lorcana-navy/60 mb-4" />
                <p className="text-sm text-lorcana-ink mb-2">
                  {isImporting ? 'Importing...' : 'Drop your CSV file here or click to browse'}
                </p>
                <p className="text-xs text-lorcana-navy">CSV files only</p>
              </div>
            )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

            {isImporting && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lorcana-gold"></div>
                <span className="ml-2 text-sm text-lorcana-ink">
                  Processing and importing...
                </span>
              </div>
            )}

            {importResult && (
              <div className={`p-4 rounded-sm border-2 ${
                importResult.success 
                  ? 'bg-lorcana-purple/10 border-lorcana-gold' 
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-start">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-lorcana-purple mr-2 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      importResult.success ? 'text-lorcana-ink' : 'text-red-800'
                    }`}>
                      {importResult.success ? 'Import Successful!' : 'Import Failed'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      importResult.success ? 'text-lorcana-navy' : 'text-red-700'
                    }`}>
                      {importResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3 mt-6">
              <button
                onClick={onClose}
                disabled={isImporting}
                className={`flex-1 px-4 py-2 text-sm font-medium border-2 rounded-sm transition-colors ${
                  isImporting
                    ? 'text-lorcana-navy/40 bg-lorcana-cream border-lorcana-gold/40 cursor-not-allowed'
                    : 'text-lorcana-navy bg-lorcana-cream border-lorcana-gold hover:bg-lorcana-gold/20'
                }`}
              >
                {importResult?.success ? 'Done' : 'Cancel'}
              </button>
              {!importResult?.success && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-lorcana-cream bg-lorcana-navy border-2 border-lorcana-navy rounded-sm hover:bg-lorcana-purple disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FileText size={16} className="inline mr-2" />
                  Choose File
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DreambornImport;