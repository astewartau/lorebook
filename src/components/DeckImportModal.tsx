import React, { useState } from 'react';
import { X, Upload, FileJson, FileText, AlertCircle } from 'lucide-react';
import { useCardData } from '../contexts/CardDataContext';
import { ParsedDeck, parseLorebookJSON, parseTTSDeck, parseTextDeck } from '../utils/deckImport';


interface ImportPreview {
  deck: ParsedDeck;
  warnings: string[];
  cardCount: number;
}

interface DeckImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (deckData: string) => Promise<boolean>;
}

const DeckImportModal: React.FC<DeckImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const { allCards } = useCardData();
  const [activeTab, setActiveTab] = useState<'json' | 'text'>('json');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewDeckName, setPreviewDeckName] = useState('');
  const [previewDeckDescription, setPreviewDeckDescription] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const parseTextFormat = (text: string) => parseTextDeck(text, allCards);
  const parseDreambornJSON = (json: any) => parseTTSDeck(json, allCards);
  const parseStandardJSON = (json: any) => parseLorebookJSON(json);

  const handleTextPreview = () => {
    if (!textInput.trim()) {
      setError('Please enter deck data in text format');
      return;
    }
    
    setError(null);
    
    const result = parseTextFormat(textInput);
    
    if (!result.deck) {
      setError(result.warnings.join(', ') || 'Unable to parse the text format.');
      return;
    }
    
    const totalCards = result.deck.cards.reduce((sum, c) => sum + c.quantity, 0);
    setPreview({
      deck: result.deck,
      warnings: result.warnings,
      cardCount: totalCards
    });
    setPreviewDeckName(result.deck.name);
    setPreviewDeckDescription(result.deck.description || '');
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    
    setIsImporting(true);
    setError(null);
    
    try {
      // Create updated deck with user-provided name and description
      const updatedDeck = {
        ...preview.deck,
        name: previewDeckName.trim() || preview.deck.name,
        description: previewDeckDescription.trim() || preview.deck.description
      };
      
      const importData = JSON.stringify(updatedDeck);
      const success = await onImport(importData);
      
      if (success) {
        onClose();
        setJsonFile(null);
        setTextInput('');
        setPreview(null);
        setPreviewDeckName('');
        setPreviewDeckDescription('');
      } else {
        setError('Failed to import deck. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import deck');
    } finally {
      setIsImporting(false);
    }
  };

  const processJsonFile = async (file: File) => {
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      setError('Please select a valid JSON file');
      return;
    }
    
    setJsonFile(file);
    setError(null);
    
    // Auto-preview the file
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      // Try Dreamborn format first, then standard format
      let result = parseDreambornJSON(jsonData);
      if (!result.deck) {
        result = parseStandardJSON(jsonData);
      }
      
      if (!result.deck) {
        setError(result.warnings.join(', ') || 'Unable to parse the JSON file.');
        return;
      }
      
      const totalCards = result.deck.cards.reduce((sum, c) => sum + c.quantity, 0);
      setPreview({
        deck: result.deck,
        warnings: result.warnings,
        cardCount: totalCards
      });
      setPreviewDeckName(result.deck.name);
      setPreviewDeckDescription(result.deck.description || '');
    } catch (err: any) {
      setError(err.message || 'Failed to parse JSON file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processJsonFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processJsonFile(files[0]);
    }
  };

  const handleClose = () => {
    setJsonFile(null);
    setTextInput('');
    setError(null);
    setPreview(null);
    setPreviewDeckName('');
    setPreviewDeckDescription('');
    setIsDragOver(false);
    setActiveTab('json');
    onClose();
  };

  const handleBackToInput = () => {
    setPreview(null);
    setError(null);
    setPreviewDeckName('');
    setPreviewDeckDescription('');
    setJsonFile(null);
    setIsDragOver(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black bg-opacity-50 z-[60] backdrop-blur-sm transition-opacity !mt-0"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen flex items-center justify-center z-[61] p-4">
        <div className="bg-lorcana-cream rounded-sm shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-2 border-lorcana-gold">
          {/* Header */}
          <div className="bg-gradient-to-r from-lorcana-navy to-lorcana-purple p-6 text-lorcana-cream">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Import Deck</h2>
              <button
                onClick={handleClose}
                className="hover:bg-lorcana-purple/50 p-2 rounded-sm transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          {/* Tab Buttons - Hidden when in preview mode */}
          {!preview && (
            <div className="flex border-b border-lorcana-gold/20">
              <button
                onClick={() => setActiveTab('json')}
                className={`flex-1 px-6 py-3 flex items-center justify-center space-x-2 transition-colors ${
                  activeTab === 'json'
                    ? 'bg-lorcana-gold/10 border-b-2 border-lorcana-gold text-lorcana-navy font-medium'
                    : 'text-lorcana-purple hover:bg-lorcana-gold/5'
                }`}
              >
                <FileJson size={20} />
                <span>JSON Import</span>
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`flex-1 px-6 py-3 flex items-center justify-center space-x-2 transition-colors ${
                  activeTab === 'text'
                    ? 'bg-lorcana-gold/10 border-b-2 border-lorcana-gold text-lorcana-navy font-medium'
                    : 'text-lorcana-purple hover:bg-lorcana-gold/5'
                }`}
              >
                <FileText size={20} />
                <span>Text Import</span>
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-sm flex items-start space-x-2 text-red-800">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            {/* Preview Mode */}
            {preview && (
              <div className="space-y-4">
                <div className="bg-lorcana-gold/10 p-4 rounded-sm">
                  <h3 className="font-bold text-lorcana-navy mb-4">Import Preview</h3>
                  
                  {/* Deck Name Input */}
                  <div className="mb-4">
                    <label htmlFor="deck-name" className="block text-sm font-medium text-lorcana-navy mb-2">
                      Deck Name
                    </label>
                    <input
                      id="deck-name"
                      type="text"
                      value={previewDeckName}
                      onChange={(e) => setPreviewDeckName(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-white text-lorcana-navy"
                      placeholder="Enter deck name..."
                    />
                  </div>
                  
                  {/* Deck Description Input */}
                  <div className="mb-4">
                    <label htmlFor="deck-description" className="block text-sm font-medium text-lorcana-navy mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      id="deck-description"
                      value={previewDeckDescription}
                      onChange={(e) => setPreviewDeckDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-white text-lorcana-navy"
                      placeholder="Enter deck description..."
                    />
                  </div>
                  
                  <div className="text-sm text-lorcana-purple">
                    <p><strong>Total Cards:</strong> {preview.cardCount}</p>
                  </div>
                </div>
                
                {preview.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-sm">
                    <div className="flex items-start space-x-2">
                      <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-amber-800 mb-2">Import Warnings</p>
                        <ul className="text-sm text-amber-700 space-y-1">
                          {preview.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm text-sm text-blue-800">
                  <p className="font-medium mb-1">Ready to Import</p>
                  <p>Click "Confirm Import" to add this deck to your collection.</p>
                </div>
              </div>
            )}
            
            {!preview && activeTab === 'json' && (
              <div className="space-y-4">
                <div>
                  <p className="text-lorcana-navy mb-4">
                    Import a deck from TTS/Dreamborn JSON format.
                  </p>
                  <div 
                    className={`border-2 border-dashed rounded-sm p-8 text-center transition-all duration-200 ${
                      isDragOver 
                        ? 'border-lorcana-gold bg-lorcana-gold/10 scale-105' 
                        : 'border-lorcana-gold/50 hover:border-lorcana-gold/80'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                      id="json-file-input"
                    />
                    <label
                      htmlFor="json-file-input"
                      className="cursor-pointer block"
                    >
                      <Upload size={48} className={`mx-auto mb-4 transition-colors ${
                        isDragOver ? 'text-lorcana-gold' : 'text-lorcana-purple'
                      }`} />
                      {isDragOver ? (
                        <div>
                          <p className="text-lorcana-navy font-bold text-lg">Drop JSON file here</p>
                          <p className="text-sm text-lorcana-purple mt-2">Release to import</p>
                        </div>
                      ) : jsonFile ? (
                        <div>
                          <p className="text-lorcana-navy font-medium">{jsonFile.name}</p>
                          <p className="text-sm text-lorcana-purple mt-2">Click to select a different file</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lorcana-navy font-medium">Click to select or drag & drop a JSON file</p>
                          <p className="text-sm text-lorcana-purple mt-2">Supports TTS/Dreamborn format</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
                
                <div className="bg-lorcana-gold/10 p-4 rounded-sm">
                  <p className="text-sm text-lorcana-navy">
                    <strong>Supported format:</strong>
                  </p>
                  <p className="text-sm text-lorcana-purple mt-2">
                    • TTS/Dreamborn JSON (exported from Dreamborn for Tabletop Simulator)
                  </p>
                </div>
              </div>
            )}
            
            {!preview && activeTab === 'text' && (
              <div className="space-y-4">
                <div>
                  <p className="text-lorcana-navy mb-4">
                    Paste your deck list in text format. Use the format: "3 Card Name" (one per line)
                  </p>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="3 Friends on the Other Side&#10;1 Kristoff - Reindeer Keeper&#10;2 Mirabel Madrigal - Family Gatherer&#10;..."
                    className="w-full h-64 p-4 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-white font-mono text-sm"
                  />
                </div>
                
                <div className="bg-lorcana-gold/10 p-4 rounded-sm">
                  <p className="text-sm text-lorcana-navy">
                    <strong>Format example:</strong>
                  </p>
                  <pre className="text-xs text-lorcana-purple mt-2 font-mono">
{`3 Friends on the Other Side
2 Mirabel Madrigal - Family Gatherer
4 Bruno Madrigal - Single-Minded`}
                  </pre>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-6 bg-lorcana-cream border-t border-lorcana-gold/20 flex justify-end space-x-3">
            {preview ? (
              <>
                <button
                  onClick={handleBackToInput}
                  className="px-6 py-2 border-2 border-lorcana-purple text-lorcana-purple rounded-sm hover:bg-lorcana-purple/10 transition-colors"
                  disabled={isImporting}
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-6 py-2 bg-lorcana-gold text-lorcana-navy rounded-sm hover:bg-lorcana-gold/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isImporting || !previewDeckName.trim()}
                >
                  {isImporting ? 'Importing...' : 'Confirm Import'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 border-2 border-lorcana-purple text-lorcana-purple rounded-sm hover:bg-lorcana-purple/10 transition-colors"
                  disabled={isImporting}
                >
                  Cancel
                </button>
                {activeTab === 'text' && (
                  <button
                    onClick={handleTextPreview}
                    className="px-6 py-2 bg-lorcana-gold text-lorcana-navy rounded-sm hover:bg-lorcana-gold/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!textInput.trim()}
                  >
                    Preview Import
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DeckImportModal;