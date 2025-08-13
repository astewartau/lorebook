import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useCollection } from '../contexts/CollectionContext';
import { importDreambornCollection, generateImportSummary, ImportedCard } from '../utils/dreambornImport';

interface DreambornImportProps {
  onClose: () => void;
}

const DreambornImport: React.FC<DreambornImportProps> = ({ onClose }) => {
  const { addCardToCollection } = useCollection();
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
      const importedCards = importDreambornCollection(csvContent);
      
      if (importedCards.length === 0) {
        setImportResult({
          success: false,
          message: 'No cards found to import. Make sure your CSV has cards with quantities > 0.'
        });
        setIsImporting(false);
        return;
      }

      // Import cards into collection using card ID system with foil support
      for (const importedCard of importedCards) {
        const { card, normalQuantity, foilQuantity } = importedCard;
        
        // Add both normal and foil quantities separately
        if (normalQuantity > 0 || foilQuantity > 0) {
          addCardToCollection(card.id, normalQuantity, foilQuantity);
        }
      }

      const summary = generateImportSummary(importedCards);
      setImportResult({
        success: true,
        message: summary,
        importedCards
      });

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
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Import Dreamborn Collection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="mb-2">Import your collection from a Dreamborn CSV export.</p>
            <p className="text-xs">Expected format: Normal, Foil, Name, Set, Card Number, Color, Rarity, Price, Foil Price</p>
          </div>

          {!importResult && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                {isImporting ? 'Importing...' : 'Drop your CSV file here or click to browse'}
              </p>
              <p className="text-xs text-gray-500">CSV files only</p>
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Importing cards...</span>
            </div>
          )}

          {importResult && (
            <div className={`p-4 rounded-lg ${
              importResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start">
                {importResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {importResult.success ? 'Import Successful!' : 'Import Failed'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    importResult.success ? 'text-green-700' : 'text-red-700'
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
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {importResult?.success ? 'Done' : 'Cancel'}
            </button>
            {!importResult?.success && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FileText size={16} className="inline mr-2" />
                Choose File
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DreambornImport;