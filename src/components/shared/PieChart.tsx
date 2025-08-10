import React from 'react';

interface PieChartProps {
  data: Record<string, number>;
  title: string;
  colors: string[];
  onTooltipShow?: (x: number, y: number, content: string) => void;
  onTooltipHide?: () => void;
}

const PieChart: React.FC<PieChartProps> = ({ 
  data, 
  title, 
  colors, 
  onTooltipShow, 
  onTooltipHide 
}) => {
  const total = Object.values(data).reduce((sum, value) => sum + value, 0);
  if (total === 0) return null;

  const dataEntries = Object.entries(data).filter(([, value]) => value > 0);
  
  // Special case: if only one category, show as full circle
  if (dataEntries.length === 1) {
    const [key, value] = dataEntries[0];
    const color = colors[0];
    const radius = 20;
    const centerX = 25;
    const centerY = 25;
    
    return (
      <div className="flex flex-col items-center">
        <div className="text-xs font-medium text-lorcana-navy mb-1">{title}</div>
        <svg width="50" height="50" viewBox="0 0 50 50" className="cursor-pointer">
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill={color}
            stroke="white"
            strokeWidth="1"
            className="hover:opacity-80 transition-opacity"
            onMouseEnter={(e) => {
              if (onTooltipShow) {
                const rect = e.currentTarget.getBoundingClientRect();
                onTooltipShow(
                  rect.left + rect.width / 2,
                  rect.top - 10,
                  `${key}: ${value} cards (100.0%)`
                );
              }
            }}
            onMouseLeave={() => onTooltipHide?.()}
          />
        </svg>
      </div>
    );
  }

  let cumulativePercentage = 0;
  const segments = dataEntries.map(([key, value], index) => {
    const percentage = (value / total) * 100;
    const startAngle = cumulativePercentage * 3.6; // Convert to degrees
    const endAngle = (cumulativePercentage + percentage) * 3.6;
    
    cumulativePercentage += percentage;
    
    const color = colors[index % colors.length];
    
    // Create SVG arc path
    const radius = 20;
    const centerX = 25;
    const centerY = 25;
    
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArc = percentage > 50 ? 1 : 0;
    
    const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    
    return {
      key,
      value,
      percentage: percentage.toFixed(1),
      pathData,
      color
    };
  });

  const handleMouseEnter = (e: React.MouseEvent, segment: typeof segments[0]) => {
    if (onTooltipShow) {
      const rect = e.currentTarget.getBoundingClientRect();
      onTooltipShow(
        rect.left + rect.width / 2,
        rect.top - 10,
        `${segment.key}: ${segment.value} cards (${segment.percentage}%)`
      );
    }
  };

  const handleMouseLeave = () => {
    onTooltipHide?.();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-medium text-lorcana-navy mb-1">{title}</div>
      <svg width="50" height="50" viewBox="0 0 50 50" className="cursor-pointer">
        {segments.map(segment => (
          <path
            key={segment.key}
            d={segment.pathData}
            fill={segment.color}
            stroke="white"
            strokeWidth="1"
            className="hover:opacity-80 transition-opacity"
            onMouseEnter={(e) => handleMouseEnter(e, segment)}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </svg>
    </div>
  );
};

export default PieChart;