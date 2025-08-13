import React from 'react';
import { X } from 'lucide-react';

export interface SearchFieldBubble {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SearchFieldBubbleProps {
  bubble: SearchFieldBubble;
  onRemove: (bubbleId: string) => void;
  className?: string;
}

const SearchFieldBubbleComponent: React.FC<SearchFieldBubbleProps> = ({ 
  bubble, 
  onRemove, 
  className = '' 
}) => {
  const getFieldColor = (field: string) => {
    switch (field.toLowerCase()) {
      case 'name':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'type':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'story':
      case 'franchise':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'color':
      case 'ink':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'rarity':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'set':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'cost':
      case 'strength':
      case 'willpower':
      case 'lore':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'version':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'inkwell':
      case 'inkable':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'subtype':
      case 'subtypes':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatOperator = (op: string) => {
    switch (op) {
      case ':': return '';
      case '>': return '>';
      case '<': return '<';
      case '>=': return '≥';
      case '<=': return '≤';
      case '!=': return '≠';
      default: return op;
    }
  };

  const colorClasses = getFieldColor(bubble.field);

  return (
    <span 
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium
        ${colorClasses}
        ${className}
      `}
    >
      <span className="font-semibold">{bubble.field}</span>
      {bubble.operator !== ':' && (
        <span className="text-xs opacity-75">{formatOperator(bubble.operator)}</span>
      )}
      <span>{bubble.value}</span>
      <button
        onClick={() => onRemove(bubble.id)}
        className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
        title={`Remove ${bubble.field}${formatOperator(bubble.operator)}${bubble.value}`}
        type="button"
      >
        <X size={12} />
      </button>
    </span>
  );
};

export default SearchFieldBubbleComponent;