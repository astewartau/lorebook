import React from 'react';
import { Deck } from '../../types';
import { useCollection } from '../../contexts/CollectionContext';
import PieChart from '../shared/PieChart';

interface DeckStatisticsProps {
  deck: Deck;
  onTooltipShow: (x: number, y: number, content: string) => void;
  onTooltipHide: () => void;
}

const DeckStatistics: React.FC<DeckStatisticsProps> = ({ 
  deck, 
  onTooltipShow, 
  onTooltipHide 
}) => {
  const { getVariantQuantities } = useCollection();


  // Calculate statistics
  const inkDistribution = deck.cards.reduce((acc, card) => {
    const color = card.color || 'None';
    acc[color] = (acc[color] || 0) + card.quantity;
    return acc;
  }, {} as Record<string, number>);

  const costDistribution = deck.cards.reduce((acc, card) => {
    acc[card.cost] = (acc[card.cost] || 0) + card.quantity;
    return acc;
  }, {} as Record<number, number>);

  // Calculate color distribution by cost
  const costColorDistribution = deck.cards.reduce((acc, card) => {
    const cost = card.cost;
    const color = card.color || 'None';
    
    if (!acc[cost]) acc[cost] = {};
    acc[cost][color] = (acc[cost][color] || 0) + card.quantity;
    return acc;
  }, {} as Record<number, Record<string, number>>);


  // Additional statistics for pie charts
  const inkableDistribution = deck.cards.reduce((acc, card) => {
    const key = card.inkwell ? 'Inkable' : 'Uninkable';
    acc[key] = (acc[key] || 0) + card.quantity;
    return acc;
  }, {} as Record<string, number>);

  const typeDistribution = deck.cards.reduce((acc, card) => {
    const type = card.type || 'Unknown';
    acc[type] = (acc[type] || 0) + card.quantity;
    return acc;
  }, {} as Record<string, number>);

  const storyDistribution = deck.cards.reduce((acc, card) => {
    const story = card.story || 'Unknown';
    acc[story] = (acc[story] || 0) + card.quantity;
    return acc;
  }, {} as Record<string, number>);

  const setDistribution = deck.cards.reduce((acc, card) => {
    const setCode = card.setCode || 'Unknown';
    acc[setCode] = (acc[setCode] || 0) + card.quantity;
    return acc;
  }, {} as Record<string, number>);

  const rarityDistribution = deck.cards.reduce((acc, card) => {
    const rarity = card.rarity || 'Unknown';
    acc[rarity] = (acc[rarity] || 0) + card.quantity;
    return acc;
  }, {} as Record<string, number>);

  const collectionDistribution = deck.cards.reduce((acc, card) => {
    // Check if card is in collection
    const variantQuantities = getVariantQuantities(card.fullName);
    const totalInCollection = variantQuantities.regular + variantQuantities.foil + 
                             variantQuantities.enchanted + variantQuantities.special;
    
    const key = totalInCollection > 0 ? 'In Collection' : 'Not in Collection';
    acc[key] = (acc[key] || 0) + card.quantity;
    return acc;
  }, {} as Record<string, number>);

  const getInkColorHex = (color: string) => {
    switch (color) {
      case 'Amber': return '#fbbf24'; // yellow-400
      case 'Amethyst': return '#a855f7'; // purple-500
      case 'Emerald': return '#22c55e'; // green-500
      case 'Ruby': return '#ef4444'; // red-500
      case 'Sapphire': return '#3b82f6'; // blue-500
      case 'Steel': return '#6b7280'; // gray-500
      default: return '#d1d5db'; // gray-300
    }
  };

  return (
    <div className="p-4">
      {/* Cost Distribution */}
      <div className="mb-6">
        <div className="flex items-end space-x-1 h-24">
          {Array.from({ length: 8 }, (_, i) => i).map(cost => {
            const actualCost = cost === 7 ? '7+' : cost.toString();
            
            // Get color distribution for this cost
            let colorCounts: Record<string, number> = {};
            if (cost === 7) {
              // Aggregate all costs 7 and above
              Object.entries(costColorDistribution)
                .filter(([c]) => parseInt(c) >= 7)
                .forEach(([, colors]) => {
                  Object.entries(colors).forEach(([color, count]) => {
                    colorCounts[color] = (colorCounts[color] || 0) + count;
                  });
                });
            } else {
              colorCounts = costColorDistribution[cost] || {};
            }
            
            const totalCount = Object.values(colorCounts).reduce((sum, count) => sum + count, 0);
            
            // Calculate max count across all costs for scaling
            const maxCount = Math.max(
              ...Object.entries(costDistribution).map(([c, cnt]) => {
                if (parseInt(c) >= 7) return cnt;
                return cnt;
              }),
              Object.entries(costDistribution)
                .filter(([c]) => parseInt(c) >= 7)
                .reduce((sum, [, cnt]) => sum + cnt, 0)
            );
            
            const maxBarHeight = 64;
            const totalBarHeight = maxCount > 0 && totalCount > 0 
              ? Math.max((totalCount / maxCount) * maxBarHeight, 4)
              : totalCount > 0 ? 4 : 2;
            
            // Create stacked segments
            const colorEntries = Object.entries(colorCounts).sort(([a], [b]) => a.localeCompare(b));
            let currentHeight = 0;
            
            return (
              <div key={cost} className="flex-1 flex flex-col items-center">
                <div className="text-xs text-lorcana-navy font-medium mb-1 h-4">
                  {totalCount > 0 ? totalCount : ''}
                </div>
                <div className="w-full relative" style={{ height: `${totalBarHeight}px` }}>
                  {totalCount > 0 ? (
                    colorEntries.map(([color, count], index) => {
                      const segmentHeight = (count / totalCount) * totalBarHeight;
                      const segment = (
                        <div
                          key={`${cost}-${color}`}
                          className="w-full absolute transition-all"
                          style={{
                            height: `${segmentHeight}px`,
                            bottom: `${currentHeight}px`,
                            backgroundColor: getInkColorHex(color),
                            borderTopLeftRadius: index === colorEntries.length - 1 ? '4px' : '0',
                            borderTopRightRadius: index === colorEntries.length - 1 ? '4px' : '0'
                          }}
                          title={`${actualCost} cost ${color}: ${count} cards`}
                        />
                      );
                      currentHeight += segmentHeight;
                      return segment;
                    })
                  ) : (
                    <div
                      className="w-full absolute bg-gray-200 rounded-t"
                      style={{ height: `${totalBarHeight}px`, bottom: '0px' }}
                      title={`${actualCost} cost: 0 cards`}
                    />
                  )}
                </div>
                <div className="text-xs text-lorcana-purple mt-1">{actualCost}</div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Pie Charts */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <PieChart 
          data={inkableDistribution} 
          title="Inkwell"
          colors={['#10b981', '#ef4444']} // green for inkable, red for uninkable
          onTooltipShow={onTooltipShow}
          onTooltipHide={onTooltipHide}
        />
        
        <PieChart 
          data={typeDistribution} 
          title="Types"
          colors={['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316']} // blue, amber, purple, cyan, orange
          onTooltipShow={onTooltipShow}
          onTooltipHide={onTooltipHide}
        />
        
        <PieChart 
          data={collectionDistribution} 
          title="Collection"
          colors={['#10b981', '#ef4444']} // green for in collection, red for not in collection
          onTooltipShow={onTooltipShow}
          onTooltipHide={onTooltipHide}
        />
        
        <PieChart 
          data={rarityDistribution} 
          title="Rarity"
          colors={['#6b7280', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899']} // gray, green, blue, purple, amber, pink
          onTooltipShow={onTooltipShow}
          onTooltipHide={onTooltipHide}
        />
        
        <PieChart 
          data={storyDistribution} 
          title="Story"
          colors={['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']}
          onTooltipShow={onTooltipShow}
          onTooltipHide={onTooltipHide}
        />
        
        <PieChart 
          data={inkDistribution} 
          title="Ink"
          colors={Object.keys(inkDistribution).map(color => getInkColorHex(color))} // Use actual ink colors
          onTooltipShow={onTooltipShow}
          onTooltipHide={onTooltipHide}
        />
        
        <PieChart 
          data={setDistribution} 
          title="Set"
          colors={['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db']}
          onTooltipShow={onTooltipShow}
          onTooltipHide={onTooltipHide}
        />
      </div>
    </div>
  );
};

export default DeckStatistics;