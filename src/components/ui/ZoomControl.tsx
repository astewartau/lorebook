import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomControlProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  step?: number;
}

const ZoomControl: React.FC<ZoomControlProps> = ({
  value,
  min,
  max,
  onChange,
  step = 10
}) => {
  const handleDecrease = () => {
    onChange(Math.max(min, value - step));
  };

  const handleIncrease = () => {
    onChange(Math.min(max, value + step));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center space-x-2 bg-lorcana-cream border-2 border-lorcana-gold px-3 py-1.5">
      {/* Zoom Out Button */}
      <button
        onClick={handleDecrease}
        disabled={value <= min}
        className="w-6 h-6 bg-lorcana-gold border border-lorcana-gold hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        title="Zoom Out"
      >
        <ZoomOut size={12} className="text-lorcana-ink" />
      </button>

      {/* Simple Slider Track */}
      <div className="relative w-20 h-2 bg-white border border-lorcana-gold">
        {/* Progress fill */}
        <div 
          className="absolute left-0 top-0 h-full bg-lorcana-gold transition-all duration-200"
          style={{ width: `${percentage}%` }}
        ></div>
        
        {/* Hidden native slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          step={step}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {/* Simple thumb */}
        <div 
          className="absolute top-1/2 w-3 h-3 bg-lorcana-gold border border-lorcana-ink transform -translate-y-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: `${percentage}%` }}
        ></div>
      </div>

      {/* Zoom In Button */}
      <button
        onClick={handleIncrease}
        disabled={value >= max}
        className="w-6 h-6 bg-lorcana-gold border border-lorcana-gold hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        title="Zoom In"
      >
        <ZoomIn size={12} className="text-lorcana-ink" />
      </button>
      
    </div>
  );
};

export default ZoomControl;