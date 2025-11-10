import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import SearchFieldBubbleComponent, { SearchFieldBubble as SearchFieldBubbleType } from './SearchFieldBubble';
import { 
  parseSearchToBubbles, 
  bubblesToSearchQuery, 
  shouldCreateBubble, 
  extractLastFieldValue 
} from '../utils/smartSearch';

// Field suggestions for autocomplete
const FIELD_SUGGESTIONS = [
  { field: 'name', description: 'Card name' },
  { field: 'type', description: 'Card type (Character, Action, etc.)' },
  { field: 'story', description: 'Story/franchise' },
  { field: 'color', description: 'Ink color' },
  { field: 'rarity', description: 'Card rarity' },
  { field: 'set', description: 'Card set' },
  { field: 'version', description: 'Card version' },
  { field: 'cost', description: 'Ink cost' },
  { field: 'strength', description: 'Strength value' },
  { field: 'willpower', description: 'Willpower value' },
  { field: 'lore', description: 'Lore value' },
  { field: 'inkwell', description: 'Inkable (true/false)' },
  { field: 'subtype', description: 'Card subtypes' },
  { field: 'ability', description: 'Ability names, text, or keywords' },
];

interface GitHubStyleSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const GitHubStyleSearch: React.FC<GitHubStyleSearchProps> = ({
  value,
  onChange,
  placeholder = "Search cards...",
  className = ""
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<typeof FIELD_SUGGESTIONS>([]);
  const [bubbles, setBubbles] = useState<SearchFieldBubbleType[]>([]);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize from parent value only on mount
  useEffect(() => {
    if (bubbles.length === 0 && inputText === '') {
      const parsed = parseSearchToBubbles(value);
      setBubbles(parsed.bubbles);
      setInputText(parsed.remainingText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally ignoring dependencies

  const updateParentValue = (newBubbles: SearchFieldBubbleType[], newInputText: string) => {
    const fullQuery = bubblesToSearchQuery(newBubbles, newInputText);
    onChange(fullQuery);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInputText = e.target.value;
    setInputText(newInputText);
    updateParentValue(bubbles, newInputText);
    
    // Check if user is typing a field name for autocomplete
    const words = newInputText.split(' ');
    const lastWord = words[words.length - 1];
    
    // Look for potential field matches
    if (lastWord && !lastWord.includes(':')) {
      const matchingFields = FIELD_SUGGESTIONS.filter(field =>
        field.field.toLowerCase().startsWith(lastWord.toLowerCase()) ||
        field.field.toLowerCase().includes(lastWord.toLowerCase())
      );
      
      if (matchingFields.length > 0) {
        setSuggestions(matchingFields);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const createBubbleFromInput = () => {
    const fieldValue = extractLastFieldValue(inputText);
    if (!fieldValue) return false;
    
    const newBubble: SearchFieldBubbleType = {
      id: `${fieldValue.field}-${fieldValue.value}-${Date.now()}`,
      field: fieldValue.field,
      operator: fieldValue.operator,
      value: fieldValue.value
    };
    
    const newBubbles = [...bubbles, newBubble];
    const newInputText = fieldValue.beforeText;
    
    setBubbles(newBubbles);
    setInputText(newInputText);
    updateParentValue(newBubbles, newInputText);
    
    return true;
  };

  const removeBubble = (bubbleId: string) => {
    const newBubbles = bubbles.filter(b => b.id !== bubbleId);
    setBubbles(newBubbles);
    updateParentValue(newBubbles, inputText);
  };

  const handleSuggestionClick = (field: string) => {
    const words = inputText.split(' ');
    words[words.length - 1] = `${field}:`;
    const newInputText = words.join(' ');
    setInputText(newInputText);
    updateParentValue(bubbles, newInputText);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle TAB, SPACE, or ENTER to create bubbles
    if ((e.key === 'Tab' || e.key === ' ' || e.key === 'Enter') && shouldCreateBubble(inputText)) {
      e.preventDefault();
      if (createBubbleFromInput()) {
        setShowSuggestions(false);
      }
      return;
    }
    
    // Handle Tab for autocomplete suggestions
    if (e.key === 'Tab' && suggestions.length > 0 && showSuggestions) {
      e.preventDefault();
      handleSuggestionClick(suggestions[0].field);
      return;
    }
    
    // Handle backspace when input is empty - remove last bubble
    if (e.key === 'Backspace' && inputText === '' && bubbles.length > 0) {
      e.preventDefault();
      const newBubbles = bubbles.slice(0, -1);
      setBubbles(newBubbles);
      updateParentValue(newBubbles, inputText);
      return;
    }
    
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
    >
      <div 
        className={`
          relative flex items-center border-2 rounded-sm transition-all h-full
          ${isFocused ? 'border-lorcana-navy shadow-md' : 'border-lorcana-gold hover:border-lorcana-navy/50'}
          bg-white
        `}
      >
        <Search className="absolute left-3 text-lorcana-navy/60 flex-shrink-0" size={18} />
        
        {/* Bubbles and Input Container */}
        <div className="flex items-center gap-1 flex-wrap flex-1 pl-10 pr-3 py-1.5">
          {bubbles.map(bubble => (
            <SearchFieldBubbleComponent
              key={bubble.id}
              bubble={bubble}
              onRemove={removeBubble}
              className="flex-shrink-0"
            />
          ))}
          
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={bubbles.length === 0 ? placeholder : "Continue typing..."}
            className="flex-1 min-w-[100px] max-w-full bg-transparent border-none outline-none focus:outline-none placeholder-gray-400 text-lorcana-ink"
            style={{ boxShadow: 'none', width: '100%' }}
          />
        </div>
      </div>

      {/* Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-lorcana-gold rounded-sm shadow-lg z-50 max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.field}
              type="button"
              onClick={() => handleSuggestionClick(suggestion.field)}
              className={`
                w-full text-left px-3 py-2 hover:bg-lorcana-cream transition-colors
                ${index === 0 ? 'border-b border-gray-200' : ''}
                ${index > 0 ? 'border-t border-gray-100' : ''}
              `}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-lorcana-navy">
                  {suggestion.field}:
                </span>
                <span className="text-xs text-gray-500">
                  {suggestion.description}
                </span>
              </div>
            </button>
          ))}
          <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
            Press Tab to select first suggestion, or click to choose
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubStyleSearch;