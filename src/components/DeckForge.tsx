import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Sparkles, Palette, Star, 
  CreditCard, CheckCircle, Info, 
  Brain, Swords, Gem, ChevronRight, Target
} from 'lucide-react';
import { COLOR_ICONS } from '../constants/icons';

type StartingPath = 'colors' | 'theme' | 'card' | 'strategy' | null;
type InkColor = 'amber' | 'amethyst' | 'emerald' | 'ruby' | 'sapphire' | 'steel';
type DeckArchetype = 'aggro' | 'combo' | 'midrange' | 'control' | null;
type StrategicEngine = 'tempo' | 'removal' | 'ramp' | 'rush' | 'bounce' | 'items' | 'evasive' | 'discard' | 'steelsong' | 'locations' | null;

interface EngineViability {
  rating: number; // 1-5 stars
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  category: 'natural' | 'unconventional' | 'experimental';
}

interface InkColorInfo {
  name: string;
  color: string;
  bgColor: string;
  tagline: string;
  strengths: string[];
  playstyle: string;
}

const inkColors: Record<InkColor, InkColorInfo> = {
  amber: {
    name: 'Amber',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    tagline: "The Sustainer's Shield",
    strengths: ['Healing', 'Bodyguard', 'Defensive support'],
    playstyle: 'Sustain characters and protect high-value pieces with healing and defense'
  },
  amethyst: {
    name: 'Amethyst',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    tagline: "The Tempo Master",
    strengths: ['Card draw', 'Character recursion', 'Bounce control'],
    playstyle: 'Control tempo through card advantage and recycling key characters'
  },
  emerald: {
    name: 'Emerald',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    tagline: "The Disruptor",
    strengths: ['Discard effects', 'Board disruption', 'Tempo control'],
    playstyle: 'Punish opponents and disrupt their plays while maintaining rhythm'
  },
  ruby: {
    name: 'Ruby',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    tagline: "The Aggressor",
    strengths: ['Rush/Evasive', 'Character removal', 'Direct lore pressure'],
    playstyle: 'Sprint to lore victory with aggressive early pressure and efficient removal'
  },
  sapphire: {
    name: 'Sapphire',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    tagline: "The Accelerator",
    strengths: ['Ink ramp', 'Item support', 'Resource acceleration'],
    playstyle: 'Deploy powerful cards early through ramping and item synergies'
  },
  steel: {
    name: 'Steel',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    tagline: "The Powerhouse",
    strengths: ['High toughness', 'Strong challenges', 'Board dominance'],
    playstyle: 'Dominate the board with durable characters and powerful challenges'
  }
};

const DeckForge: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [startingPath, setStartingPath] = useState<StartingPath>(null);
  const [selectedColors, setSelectedColors] = useState<InkColor[]>([]);
  const [deckArchetype, setDeckArchetype] = useState<DeckArchetype>(null);
  const [strategicEngine, setStrategicEngine] = useState<StrategicEngine>(null);

  const handleSelectPath = (path: StartingPath) => {
    setStartingPath(path);
    setCurrentStep(1);
  };

  const handleSelectColor = (color: InkColor) => {
    if (selectedColors.includes(color)) {
      setSelectedColors(selectedColors.filter(c => c !== color));
    } else if (selectedColors.length < 2) {
      setSelectedColors([...selectedColors, color]);
    }
  };

  const handleSelectArchetype = (archetype: DeckArchetype) => {
    setDeckArchetype(archetype);
    if (startingPath === 'strategy') {
      // If we came from strategy path, go to strategic engine selection
      setCurrentStep(2);
    } else {
      // Otherwise go to strategic engine selection
      setCurrentStep(3);
    }
  };

  const handleSelectEngine = (engine: StrategicEngine) => {
    setStrategicEngine(engine);
    if (startingPath === 'strategy') {
      // If we came from strategy path, go to color suggestions
      setCurrentStep(3);
    } else {
      // Otherwise go to building phase
      setCurrentStep(4);
    }
  };

  const renderStartingPaths = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-lorcana-ink mb-4">Welcome to Deck Forge</h2>
        <p className="text-lorcana-navy text-lg">Choose how you'd like to begin crafting your deck</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* By Colors */}
        <button
          onClick={() => handleSelectPath('colors')}
          className="card-lorcana p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-lorcana-gold to-lorcana-purple rounded-full flex items-center justify-center group-hover:animate-pulse">
              <Palette size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-lorcana-ink">By Ink Colors</h3>
            <p className="text-sm text-lorcana-navy text-center">
              Start by choosing two ink colors that match your preferred playstyle
            </p>
            <div className="flex space-x-2">
              {Object.entries(COLOR_ICONS).map(([color, icon]) => (
                <img 
                  key={color}
                  src={icon} 
                  alt={color}
                  className="w-6 h-6"
                />
              ))}
            </div>
          </div>
        </button>

        {/* By Strategy */}
        <button
          onClick={() => handleSelectPath('strategy')}
          className="card-lorcana p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-lorcana-purple to-lorcana-navy rounded-full flex items-center justify-center group-hover:animate-pulse">
              <Target size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-lorcana-ink">By Strategy</h3>
            <p className="text-sm text-lorcana-navy text-center">
              Choose your preferred playstyle and let us suggest the best colors
            </p>
            <div className="text-xs text-lorcana-gold">
              Aggro • Control • Midrange • Combo
            </div>
          </div>
        </button>

        {/* By Theme */}
        <button
          onClick={() => handleSelectPath('theme')}
          className="card-lorcana p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-lorcana-gold to-lorcana-purple rounded-full flex items-center justify-center group-hover:animate-pulse">
              <Star size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-lorcana-ink">By Theme</h3>
            <p className="text-sm text-lorcana-navy text-center">
              Build around your favorite Disney franchise or thematic synergies
            </p>
            <div className="text-xs text-lorcana-gold">
              Frozen • Moana • Mickey & Friends
            </div>
          </div>
        </button>

        {/* By Card */}
        <button
          onClick={() => handleSelectPath('card')}
          className="card-lorcana p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-lorcana-navy to-lorcana-purple rounded-full flex items-center justify-center group-hover:animate-pulse">
              <CreditCard size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-lorcana-ink">By Signature Card</h3>
            <p className="text-sm text-lorcana-navy text-center">
              Choose a favorite character and build a deck to support them
            </p>
            <div className="text-xs text-lorcana-gold">
              Build around your favorite card
            </div>
          </div>
        </button>
      </div>

      <div className="text-center mt-8">
        <button
          onClick={() => navigate('/decks')}
          className="text-lorcana-navy hover:text-lorcana-gold transition-colors"
        >
          <ArrowLeft className="inline mr-2" size={16} />
          Back to My Decks
        </button>
      </div>
    </div>
  );

  const renderColorSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-lorcana-ink mb-4">Choose Your Ink Colors</h2>
        <p className="text-lorcana-navy text-lg">
          Select two colors that will define your deck's strategy
        </p>
        <div className="mt-4 flex justify-center items-center space-x-4">
          <div className={`w-16 h-16 rounded-full border-4 ${
            selectedColors[0] ? inkColors[selectedColors[0]].bgColor : 'bg-gray-200'
          } border-lorcana-gold flex items-center justify-center`}>
            {selectedColors[0] && (
              <img 
                src={COLOR_ICONS[inkColors[selectedColors[0]].name]} 
                alt={inkColors[selectedColors[0]].name}
                className="w-10 h-10"
              />
            )}
          </div>
          <span className="text-2xl text-lorcana-gold">+</span>
          <div className={`w-16 h-16 rounded-full border-4 ${
            selectedColors[1] ? inkColors[selectedColors[1]].bgColor : 'bg-gray-200'
          } border-lorcana-gold flex items-center justify-center`}>
            {selectedColors[1] && (
              <img 
                src={COLOR_ICONS[inkColors[selectedColors[1]].name]} 
                alt={inkColors[selectedColors[1]].name}
                className="w-10 h-10"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {(Object.entries(inkColors) as [InkColor, InkColorInfo][]).map(([key, color]) => {
          const isSelected = selectedColors.includes(key);
          
          return (
            <button
              key={key}
              onClick={() => handleSelectColor(key)}
              disabled={!isSelected && selectedColors.length >= 2}
              className={`
                card-lorcana p-4 transition-all duration-300 transform
                ${isSelected ? 'ring-4 ring-lorcana-gold scale-105 shadow-xl' : 'hover:shadow-lg hover:scale-102'}
                ${!isSelected && selectedColors.length >= 2 ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-12 h-12 ${color.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <img 
                    src={COLOR_ICONS[color.name]} 
                    alt={color.name}
                    className="w-8 h-8"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`font-bold ${color.color} text-lg`}>{color.name}</h3>
                  <p className="text-xs text-lorcana-navy italic mb-2">{color.tagline}</p>
                  <div className="space-y-1">
                    {color.strengths.map((strength, idx) => (
                      <div key={idx} className="flex items-center text-xs text-lorcana-navy">
                        <CheckCircle size={12} className="mr-1 text-green-500" />
                        {strength}
                      </div>
                    ))}
                  </div>
                </div>
                {isSelected && (
                  <div className="flex-shrink-0">
                    <CheckCircle className="text-lorcana-gold" size={24} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedColors.length === 2 && (
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="card-lorcana p-6 bg-gradient-to-r from-lorcana-cream to-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-lorcana-ink">
                {inkColors[selectedColors[0]].name} + {inkColors[selectedColors[1]].name} Synergy
              </h3>
              <div className="flex space-x-2">
                {/* Strategy tags based on color combinations */}
                {(selectedColors.includes('amber') && selectedColors.includes('amethyst')) && (
                  <>
                    <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">Midrange</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">Combo</span>
                  </>
                )}
                {(selectedColors.includes('amber') && selectedColors.includes('emerald')) && (
                  <>
                    <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">Aggro</span>
                    <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">Midrange</span>
                  </>
                )}
                {(selectedColors.includes('amber') && selectedColors.includes('ruby')) && (
                  <>
                    <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">Midrange</span>
                    <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">Aggro</span>
                  </>
                )}
                {(selectedColors.includes('amber') && selectedColors.includes('sapphire')) && (
                  <>
                    <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">Control</span>
                    <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">Midrange</span>
                  </>
                )}
                {(selectedColors.includes('amber') && selectedColors.includes('steel')) && (
                  <>
                    <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">Midrange</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">Control</span>
                  </>
                )}
                {(selectedColors.includes('amethyst') && selectedColors.includes('emerald')) && (
                  <>
                    <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">Midrange</span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">Tempo</span>
                  </>
                )}
                {(selectedColors.includes('amethyst') && selectedColors.includes('ruby')) && (
                  <>
                    <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">Control</span>
                    <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">Midrange</span>
                  </>
                )}
                {(selectedColors.includes('amethyst') && selectedColors.includes('sapphire')) && (
                  <>
                    <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">Control</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">Combo</span>
                  </>
                )}
                {(selectedColors.includes('amethyst') && selectedColors.includes('steel')) && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">Control</span>
                )}
                {(selectedColors.includes('emerald') && selectedColors.includes('ruby')) && (
                  <>
                    <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">Aggro</span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">Tempo</span>
                  </>
                )}
                {(selectedColors.includes('emerald') && selectedColors.includes('sapphire')) && (
                  <>
                    <span className="px-3 py-1 bg-blue-200 text-blue-700 text-xs font-semibold rounded-full">Ramp</span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">Tempo</span>
                  </>
                )}
                {(selectedColors.includes('emerald') && selectedColors.includes('steel')) && (
                  <>
                    <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">Aggro</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">Control</span>
                  </>
                )}
                {(selectedColors.includes('ruby') && selectedColors.includes('sapphire')) && (
                  <>
                    <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">Tempo</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">Combo</span>
                  </>
                )}
                {(selectedColors.includes('ruby') && selectedColors.includes('steel')) && (
                  <>
                    <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">Aggro</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">Control</span>
                  </>
                )}
                {(selectedColors.includes('sapphire') && selectedColors.includes('steel')) && (
                  <>
                    <span className="px-3 py-1 bg-blue-200 text-blue-700 text-xs font-semibold rounded-full">Ramp</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">Control</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-lorcana-navy text-sm">
              {
                (selectedColors.includes('amber') && selectedColors.includes('emerald')) 
                  ? 'Amber–Emerald offers blistering speed and tempo disruption. Select this if you want to pressure lore gain early while forcing your opponent off balance. Great for players who prefer to race and punish mistakes.'
                  : (selectedColors.includes('amber') && selectedColors.includes('amethyst'))
                  ? 'Amber–Amethyst combines relentless lore generation with card draw and recursion. Select this if you want a fast deck that keeps its hand full and replays key characters for sustained pressure.'
                  : (selectedColors.includes('amber') && selectedColors.includes('steel'))
                  ? 'Amber–Steel offers the well-known "Steelsong" archetype, mixing steady lore pressure with sturdy defenders. Select this if you prefer consistent, board-focused midrange gameplay that can adapt between aggression and resilience.'
                  : (selectedColors.includes('amethyst') && selectedColors.includes('ruby'))
                  ? 'Amethyst–Ruby is a premier control pairing, combining Amethyst\'s hand manipulation and bounce with Ruby\'s efficient removal. Select this if you prefer disruption and board resets leading into powerful finishers.'
                  : (selectedColors.includes('ruby') && selectedColors.includes('sapphire'))
                  ? 'Sapphire–Ruby offers acceleration into high-impact threats, turning late-game power into early pressure. Select this if you like resource ramping and dropping game-ending characters ahead of schedule.'
                  : (selectedColors.includes('sapphire') && selectedColors.includes('emerald'))
                  ? 'Sapphire–Emerald provides card draw, ramp, and tempo disruption. Select this if you want a toolbox midrange deck that controls rhythm, accelerates resources, and balances proactive and reactive play.'
                  : (selectedColors.includes('emerald') && selectedColors.includes('ruby'))
                  ? 'Emerald–Ruby delivers evasive threats and tempo swings. Select this if you want a tricky, agile deck that pressures opponents with hard-to-block characters and surprise shifts in momentum.'
                  : (selectedColors.includes('amber') && selectedColors.includes('sapphire'))
                  ? 'Amber–Sapphire blends Amber\'s healing and defensive support with Sapphire\'s ramp and card advantage. Select this when you want a flexible midrange build that stabilizes early, accelerates resources, and transitions into consistent board control.'
                  : (selectedColors.includes('emerald') && selectedColors.includes('steel'))
                  ? 'Emerald–Steel combines resource disruption and low-cost threats with heavy-hitting backup. Select this if you\'re looking to cripple your opponent\'s options while sustaining steady board advantage via discard engines.'
                  : (selectedColors.includes('amber') && selectedColors.includes('ruby'))
                  ? 'Amber–Ruby delivers a pirate-themed synergy deck that emphasizes aggressive tempo with evasive pressure plus lore acceleration. Choose this when you want to dominate the board, refill your resources with songs and draw, and steadily press lore advantage.'
                  : (selectedColors.includes('amethyst') && selectedColors.includes('sapphire'))
                  ? 'Amethyst–Sapphire ("Blurple") brings together Sapphire\'s fast ramp and resource acceleration with Amethyst\'s card advantage and bounce mechanics. Select this if you\'re after a tempo-savvy setup that builds explosive board presence through repeated value plays.'
                  : (selectedColors.includes('amethyst') && selectedColors.includes('steel'))
                  ? 'Amethyst–Steel blends Amethyst\'s bounce and recursion tools with Steel\'s disruptive board presence. Select this when you want a resilient tempo deck that can respond, reset, and snowball through repeatable value.'
                  : (selectedColors.includes('emerald') && selectedColors.includes('amethyst'))
                  ? 'Emerald–Amethyst decks combine aggressive tempo with disruptive control, leveraging bounce mechanics and evasive characters to pressure opponents and control the board. Select this when you want a dynamic deck that can adapt to various strategies and maintain consistent pressure.'
                  : (selectedColors.includes('ruby') && selectedColors.includes('steel'))
                  ? 'Ruby–Steel decks combine aggressive tempo with combo potential and control elements, leveraging evasive characters and efficient removal to pressure opponents and disrupt their strategies. Select this when you want a dynamic deck that can adapt to various strategies and maintain consistent pressure.'
                  : (selectedColors.includes('sapphire') && selectedColors.includes('steel'))
                  ? 'Sapphire–Steel decks combine efficient ramping with robust control elements, leveraging item synergies and powerful characters to maintain board presence and accelerate lore generation. Select this when you want a versatile deck that can adapt to various strategies and maintain consistent pressure.'
                  : 'This unique combination offers strategic versatility and tactical options for creative deck building.'
              }
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep(0)}
          className="btn-lorcana-navy-outline flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button
          onClick={() => setCurrentStep(2)}
          disabled={selectedColors.length !== 2}
          className={`flex items-center space-x-2 ${
            selectedColors.length === 2 
              ? 'btn-lorcana-gold' 
              : 'btn-lorcana-gold opacity-50 cursor-not-allowed'
          }`}
        >
          <span>Next: Choose Playstyle</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );

  const renderArchetypeSelection = () => {
    // Get recommended strategy based on selected colors
    const getRecommendedStrategy = (): DeckArchetype | null => {
      if (selectedColors.length !== 2) return null;
      
      const colorSet = new Set(selectedColors);
      
      // Highly recommended combinations based on best fit
      if (colorSet.has('amber') && colorSet.has('amethyst')) return 'midrange';
      if (colorSet.has('amber') && colorSet.has('emerald')) return 'aggro';
      if (colorSet.has('amber') && colorSet.has('ruby')) return 'midrange';
      if (colorSet.has('amber') && colorSet.has('sapphire')) return 'control';
      if (colorSet.has('amber') && colorSet.has('steel')) return 'midrange';
      if (colorSet.has('amethyst') && colorSet.has('emerald')) return 'midrange';
      if (colorSet.has('amethyst') && colorSet.has('ruby')) return 'control';
      if (colorSet.has('amethyst') && colorSet.has('sapphire')) return 'combo'; // Blurple combo
      if (colorSet.has('amethyst') && colorSet.has('steel')) return 'control';
      if (colorSet.has('emerald') && colorSet.has('ruby')) return 'aggro';
      if (colorSet.has('emerald') && colorSet.has('sapphire')) return 'midrange'; // Ramp/Tempo -> Midrange
      if (colorSet.has('emerald') && colorSet.has('steel')) return 'aggro';
      if (colorSet.has('ruby') && colorSet.has('sapphire')) return 'combo'; // Ruby/Sapphire combo
      if (colorSet.has('ruby') && colorSet.has('steel')) return 'aggro';
      if (colorSet.has('sapphire') && colorSet.has('steel')) return 'control'; // Ramp/Control -> Control
      
      return null;
    };
    
    const recommendedStrategy = getRecommendedStrategy();
    
    return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-lorcana-ink mb-4">Define Your Playstyle</h2>
        <p className="text-lorcana-navy text-lg">
          How do you want to win your games?
        </p>
        {selectedColors.length === 2 && (
          <div className="mt-4 flex justify-center items-center space-x-2">
            <div className={`px-3 py-1 rounded ${inkColors[selectedColors[0]].bgColor} ${inkColors[selectedColors[0]].color} font-semibold`}>
              {inkColors[selectedColors[0]].name}
            </div>
            <span className="text-lorcana-gold">+</span>
            <div className={`px-3 py-1 rounded ${inkColors[selectedColors[1]].bgColor} ${inkColors[selectedColors[1]].color} font-semibold`}>
              {inkColors[selectedColors[1]].name}
            </div>
          </div>
        )}
        {recommendedStrategy && (
          <div className="mt-3 text-sm text-lorcana-gold">
            🌟 {recommendedStrategy.charAt(0).toUpperCase() + recommendedStrategy.slice(1)} is highly recommended for this color combination
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {/* Aggro */}
        <button
          onClick={() => handleSelectArchetype('aggro')}
          className={`card-lorcana p-8 hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative ${
            recommendedStrategy === 'aggro' ? 'ring-4 ring-lorcana-gold shadow-xl' : ''
          }`}
        >
          {recommendedStrategy === 'aggro' && (
            <div className="absolute -top-2 -right-2 bg-lorcana-gold text-lorcana-navy rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              ★
            </div>
          )}
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <Swords size={32} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-lorcana-ink">Aggro</h3>
              <p className="text-sm text-lorcana-gold">Turn 5-6 Wins</p>
            </div>
            <p className="text-sm text-lorcana-navy">
              Generate 4-6 lore per turn starting turn 3. Must win before Turn 7 when control tools come online.
            </p>
            <div className="text-xs text-lorcana-navy">
              <p className="font-semibold">Strong Colors:</p>
              <p>Amber, Emerald, Ruby</p>
            </div>
          </div>
        </button>

        {/* Midrange */}
        <button
          onClick={() => handleSelectArchetype('midrange')}
          className={`card-lorcana p-8 hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative ${
            recommendedStrategy === 'midrange' ? 'ring-4 ring-lorcana-gold shadow-xl' : ''
          }`}
        >
          {recommendedStrategy === 'midrange' && (
            <div className="absolute -top-2 -right-2 bg-lorcana-gold text-lorcana-navy rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              ★
            </div>
          )}
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <Gem size={32} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-lorcana-ink">Midrange</h3>
              <p className="text-sm text-lorcana-gold">Turn 6-9 Wins</p>
            </div>
            <p className="text-sm text-lorcana-navy">
              Survive the aggro rush (turns 5-6), then apply pressure before control stabilizes at turn 7+.
            </p>
            <div className="text-xs text-lorcana-navy">
              <p className="font-semibold">Strong Colors:</p>
              <p>Any combination works</p>
            </div>
          </div>
        </button>

        {/* Control */}
        <button
          onClick={() => handleSelectArchetype('control')}
          className={`card-lorcana p-8 hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative ${
            recommendedStrategy === 'control' ? 'ring-4 ring-lorcana-gold shadow-xl' : ''
          }`}
        >
          {recommendedStrategy === 'control' && (
            <div className="absolute -top-2 -right-2 bg-lorcana-gold text-lorcana-navy rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              ★
            </div>
          )}
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
              <Brain size={32} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-lorcana-ink">Control</h3>
              <p className="text-sm text-lorcana-gold">Turn 8-12+ Wins</p>
            </div>
            <p className="text-sm text-lorcana-navy">
              Survive until turn 7+ when powerful tools like Be Prepared come online. Stabilize then win with late-game threats.
            </p>
            <div className="text-xs text-lorcana-navy">
              <p className="font-semibold">Strong Colors:</p>
              <p>Amethyst, Steel, Sapphire</p>
            </div>
          </div>
        </button>

        {/* Combo */}
        <button
          onClick={() => handleSelectArchetype('combo')}
          className={`card-lorcana p-8 hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative ${
            recommendedStrategy === 'combo' ? 'ring-4 ring-lorcana-gold shadow-xl' : ''
          }`}
        >
          {recommendedStrategy === 'combo' && (
            <div className="absolute -top-2 -right-2 bg-lorcana-gold text-lorcana-navy rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              ★
            </div>
          )}
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Star size={32} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-lorcana-ink">Combo</h3>
              <p className="text-sm text-lorcana-gold">Variable/Explosive Wins</p>
            </div>
            <p className="text-sm text-lorcana-navy">
              Assemble specific card interactions for explosive turns. Can win turn 5-6 or single-turn kills.
            </p>
            <div className="text-xs text-lorcana-navy">
              <p className="font-semibold">Popular Decks:</p>
              <p>ChernaDogz, Jafar Wheels</p>
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep(1)}
          className="btn-lorcana-navy-outline flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>
    </div>
    );
  };

  const renderStrategicEngineSelection = () => {
    // Engine viability data based on archetype + color combinations
    const getEngineViability = (engine: StrategicEngine): EngineViability => {
      const colorSet = new Set(selectedColors);
      
      // Default values
      let rating = 3;
      let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
      let description = 'A solid strategic choice';
      let category: 'natural' | 'unconventional' | 'experimental' = 'unconventional';

      // Engine-specific logic based on archetype and colors
      if (engine === 'tempo') {
        if (deckArchetype === 'midrange') {
          category = 'natural';
          rating = 5;
          difficulty = 'Beginner';
          description = 'Most popular midrange engine - efficient board control';
        } else if (deckArchetype === 'aggro') {
          category = 'natural';
          rating = 4;
          difficulty = 'Intermediate';
          description = 'Apply fast pressure while disrupting blockers';
        } else if (deckArchetype === 'control') {
          category = 'unconventional';
          rating = 2;
          difficulty = 'Advanced';
          description = 'Slow tempo - disrupt while setting up late game';
        } else if (deckArchetype === 'combo') {
          category = 'unconventional';
          rating = 3;
          difficulty = 'Intermediate';
          description = 'Control tempo while assembling combo pieces';
        }
      } else if (engine === 'removal') {
        // Ruby has the most efficient removal, Amethyst has bounce "removal"
        const hasRuby = colorSet.has('ruby');
        const hasAmethyst = colorSet.has('amethyst');
        
        if (deckArchetype === 'control') {
          category = 'natural';
          rating = hasRuby ? 5 : (hasAmethyst ? 4 : 3);
          difficulty = 'Beginner';
          description = hasRuby ? 'Ruby offers the most efficient removal for control' : (hasAmethyst ? 'Amethyst bounce provides flexible removal' : 'Core control strategy - remove threats and stabilize');
        } else if (deckArchetype === 'midrange') {
          category = 'natural';
          rating = hasRuby ? 5 : 4;
          difficulty = 'Intermediate';
          description = hasRuby ? 'Ruby removal clears the way perfectly for midrange' : 'Clear the way for your efficient threats';
        } else if (deckArchetype === 'combo') {
          category = 'unconventional';
          rating = hasRuby ? 4 : 3;
          difficulty = 'Intermediate';
          description = hasRuby ? 'Ruby removal protects combo efficiently' : 'Protect your combo with targeted removal';
        } else if (deckArchetype === 'aggro') {
          category = 'experimental';
          rating = 2;
          difficulty = 'Advanced';
          description = 'Unusual - aggro typically races rather than removes';
        }
      } else if (engine === 'ramp') {
        // Sapphire is the premier ramp color
        const hasSapphire = colorSet.has('sapphire');
        const hasEmerald = colorSet.has('emerald');
        
        if (deckArchetype === 'control') {
          category = 'natural';
          rating = hasSapphire ? 5 : 3;
          difficulty = hasSapphire ? 'Intermediate' : 'Advanced';
          description = hasSapphire ? 'Sapphire excels at ramping to powerful late-game threats' : 'Accelerate to powerful late-game threats';
        } else if (deckArchetype === 'midrange') {
          category = 'natural';
          rating = hasSapphire ? 5 : (hasEmerald ? 4 : 3);
          difficulty = 'Intermediate';
          description = hasSapphire ? 'Sapphire ramp enables explosive midrange curves' : 'Deploy mid-game threats ahead of schedule';
        } else if (deckArchetype === 'combo') {
          category = 'unconventional';
          rating = hasSapphire ? 4 : 3;
          difficulty = 'Intermediate';
          description = hasSapphire ? 'Sapphire ramp to expensive combo enablers' : 'Ramp to expensive combo enablers';
        } else if (deckArchetype === 'aggro') {
          category = 'experimental';
          rating = 1;
          difficulty = 'Advanced';
          description = 'Counterintuitive - aggro wants low costs';
        }
      } else if (engine === 'bounce') {
        // Amethyst is the premier bounce color
        const hasAmethyst = colorSet.has('amethyst');
        
        if (deckArchetype === 'control') {
          category = 'natural';
          rating = hasAmethyst ? 5 : 3;
          difficulty = 'Intermediate';
          description = hasAmethyst ? 'Amethyst bounce perfectly resets threats and gains card advantage' : 'Reset threats and gain card advantage';
        } else if (deckArchetype === 'midrange') {
          category = 'natural';
          rating = hasAmethyst ? 5 : 3;
          difficulty = 'Intermediate';
          description = hasAmethyst ? 'Amethyst provides excellent flexible disruption and value' : 'Flexible disruption and value generation';
        } else if (deckArchetype === 'combo') {
          category = 'unconventional';
          rating = hasAmethyst ? 4 : 3;
          difficulty = 'Advanced';
          description = hasAmethyst ? 'Amethyst bounce protects combo or reuses key pieces' : 'Protect combo or reuse key pieces';
        } else if (deckArchetype === 'aggro') {
          category = 'unconventional';
          rating = hasAmethyst ? 3 : 2;
          difficulty = 'Advanced';
          description = hasAmethyst ? 'Amethyst tempo bounce to clear blockers' : 'Tempo bounce to clear blockers';
        }
      } else if (engine === 'steelsong') {
        // Steelsong specifically requires Amber/Steel
        if (colorSet.has('amber') && colorSet.has('steel')) {
          if (deckArchetype === 'midrange') {
            category = 'natural';
            rating = 5;
            difficulty = 'Beginner';
            description = 'The classic Steelsong strategy - proven Amber/Steel synergy';
          } else if (deckArchetype === 'control') {
            category = 'natural';
            rating = 4;
            difficulty = 'Intermediate';
            description = 'Slower Steelsong build with defensive focus';
          } else if (deckArchetype === 'aggro') {
            category = 'unconventional';
            rating = 3;
            difficulty = 'Intermediate';
            description = 'Aggressive Steelsong tempo variant';
          }
        } else {
          // Without Amber/Steel, Steelsong doesn't work
          category = 'experimental';
          rating = 1;
          difficulty = 'Advanced';
          description = 'Steelsong requires Amber/Steel color combination';
        }
      } else if (engine === 'items') {
        // Sapphire excels at item support and synergies
        const hasSapphire = colorSet.has('sapphire');
        
        if (deckArchetype === 'midrange') {
          category = 'natural';
          rating = hasSapphire ? 5 : 3;
          difficulty = 'Intermediate';
          description = hasSapphire ? 'Sapphire item synergies provide excellent sustained value' : 'Item synergies for sustained value';
        } else if (deckArchetype === 'control') {
          category = 'natural';
          rating = hasSapphire ? 5 : 3;
          difficulty = 'Intermediate';
          description = hasSapphire ? 'Sapphire items provide powerful late-game effects' : 'Powerful item effects for late game';
        } else if (deckArchetype === 'combo') {
          category = 'natural';
          rating = hasSapphire ? 5 : 4;
          difficulty = 'Advanced';
          description = hasSapphire ? 'Sapphire items as powerful combo enablers' : 'Items as combo enablers or win conditions';
        } else if (deckArchetype === 'aggro') {
          category = 'unconventional';
          rating = 2;
          difficulty = 'Advanced';
          description = 'Fast items for immediate impact';
        }
      } else if (engine === 'evasive') {
        // Ruby excels at evasive threats, Emerald also has good evasive options
        const hasRuby = colorSet.has('ruby');
        const hasEmerald = colorSet.has('emerald');
        
        if (deckArchetype === 'aggro') {
          category = 'natural';
          rating = hasRuby ? 5 : (hasEmerald ? 4 : 3);
          difficulty = 'Beginner';
          description = hasRuby ? 'Ruby provides the best evasive threats for consistent pressure' : (hasEmerald ? 'Emerald evasive threats for solid pressure' : 'Unblockable threats for consistent lore pressure');
        } else if (deckArchetype === 'midrange') {
          category = 'natural';
          rating = hasRuby ? 5 : (hasEmerald ? 4 : 3);
          difficulty = 'Intermediate';
          description = hasRuby ? 'Ruby evasive threats demand immediate answers' : (hasEmerald ? 'Emerald provides solid evasive threats' : 'Reliable threats that demand answers');
        } else if (deckArchetype === 'combo') {
          category = 'unconventional';
          rating = hasRuby ? 4 : 3;
          difficulty = 'Intermediate';
          description = hasRuby ? 'Ruby evasive combo pieces or finishers' : 'Evasive combo pieces or finishers';
        } else if (deckArchetype === 'control') {
          category = 'unconventional';
          rating = hasRuby ? 3 : 2;
          difficulty = 'Advanced';
          description = hasRuby ? 'Ruby evasive finishers after stabilizing' : 'Evasive finishers after stabilizing';
        }
      } else if (engine === 'discard') {
        // Emerald is the premier discard color
        const hasEmerald = colorSet.has('emerald');
        
        if (deckArchetype === 'control') {
          category = 'natural';
          rating = hasEmerald ? 5 : 3;
          difficulty = 'Intermediate';
          description = hasEmerald ? 'Emerald excels at disrupting opponent resources' : 'Disrupt opponent resources and hand size';
        } else if (deckArchetype === 'midrange') {
          category = 'natural';
          rating = hasEmerald ? 4 : 3;
          difficulty = 'Intermediate';
          description = hasEmerald ? 'Emerald discard provides excellent disruption with board presence' : 'Targeted disruption with board presence';
        } else if (deckArchetype === 'aggro') {
          category = 'unconventional';
          rating = hasEmerald ? 3 : 2;
          difficulty = 'Advanced';
          description = hasEmerald ? 'Emerald aggressive discard to limit responses' : 'Aggressive discard to limit responses';
        } else if (deckArchetype === 'combo') {
          category = 'experimental';
          rating = 2;
          difficulty = 'Advanced';
          description = 'Protect combo by disrupting interaction';
        }
      } else if (engine === 'rush') {
        if (deckArchetype === 'aggro') {
          category = 'natural';
          rating = 5;
          difficulty = 'Beginner';
          description = 'Immediate board impact with rush characters';
        } else if (deckArchetype === 'midrange') {
          category = 'natural';
          rating = 4;
          difficulty = 'Intermediate';
          description = 'Flexible threats that impact immediately';
        } else if (deckArchetype === 'combo') {
          category = 'unconventional';
          rating = 2;
          difficulty = 'Advanced';
          description = 'Rush protection or utility characters';
        } else if (deckArchetype === 'control') {
          category = 'experimental';
          rating = 1;
          difficulty = 'Advanced';
          description = 'Counterintuitive - control prefers late game';
        }
      } else if (engine === 'locations') {
        if (deckArchetype === 'control') {
          category = 'natural';
          rating = 4;
          difficulty = 'Intermediate';
          description = 'Persistent value engines for late game';
        } else if (deckArchetype === 'midrange') {
          category = 'natural';
          rating = 4;
          difficulty = 'Intermediate';
          description = 'Locations provide ongoing board advantage';
        } else if (deckArchetype === 'combo') {
          category = 'unconventional';
          rating = 3;
          difficulty = 'Advanced';
          description = 'Locations as combo enablers or protection';
        } else if (deckArchetype === 'aggro') {
          category = 'experimental';
          rating = 2;
          difficulty = 'Advanced';
          description = 'Fast locations for immediate tempo';
        }
      }
      
      return { rating, difficulty, description, category };
    };

    // Filter engines based on color requirements
    const isEngineAvailable = (engine: StrategicEngine): boolean => {
      const colorSet = new Set(selectedColors);
      
      // Steelsong specifically requires Amber + Steel
      if (engine === 'steelsong') {
        return colorSet.has('amber') && colorSet.has('steel');
      }
      
      // All other engines are available for any color combination
      return true;
    };

    const allEngines: StrategicEngine[] = ['tempo', 'removal', 'ramp', 'rush', 'bounce', 'items', 'evasive', 'discard', 'steelsong', 'locations'];
    const engines = allEngines.filter(isEngineAvailable);
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-lorcana-ink mb-4">Select ONE Primary Strategic Engine</h2>
          <p className="text-lorcana-navy text-lg">
            What's your {deckArchetype} deck's main focus? Choose the single strategy that will drive your core deck engine.
          </p>
          <p className="text-sm text-lorcana-gold mt-2">
            💡 Your deck can include other elements, but having one clear primary focus makes it stronger and more consistent
          </p>
          {selectedColors.length === 2 && (
            <div className="mt-4 flex justify-center items-center space-x-2">
              <div className={`px-3 py-1 rounded ${inkColors[selectedColors[0]].bgColor} ${inkColors[selectedColors[0]].color} font-semibold`}>
                {inkColors[selectedColors[0]].name}
              </div>
              <span className="text-lorcana-gold">+</span>
              <div className={`px-3 py-1 rounded ${inkColors[selectedColors[1]].bgColor} ${inkColors[selectedColors[1]].color} font-semibold`}>
                {inkColors[selectedColors[1]].name}
              </div>
              <span className="text-lorcana-gold">→</span>
              <div className={`px-3 py-1 rounded ${
                deckArchetype === 'aggro' ? 'bg-red-100 text-red-600' :
                deckArchetype === 'midrange' ? 'bg-green-100 text-green-600' :
                'bg-purple-100 text-purple-600'
              } font-semibold`}>
                {deckArchetype ? deckArchetype.charAt(0).toUpperCase() + deckArchetype.slice(1) : ''}
              </div>
            </div>
          )}
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Natural Fits */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-lorcana-ink mb-4 text-center">
              🟢 Best Primary Engines for {deckArchetype ? deckArchetype.charAt(0).toUpperCase() + deckArchetype.slice(1) : 'Your Strategy'}
            </h3>
            <p className="text-sm text-lorcana-navy text-center mb-4">
              These engines are natural fits and highly recommended as your primary focus
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {engines.filter(engine => getEngineViability(engine).category === 'natural').map(engine => {
                const viability = getEngineViability(engine);
                return (
                  <button
                    key={engine}
                    onClick={() => handleSelectEngine(engine)}
                    className="card-lorcana p-4 hover:shadow-xl transition-all duration-300 transform hover:scale-105 ring-2 ring-green-200"
                  >
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-lorcana-ink capitalize">{engine}</h4>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} className={i < viability.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-lorcana-navy">{viability.description}</p>
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 text-xs rounded ${
                          viability.difficulty === 'Beginner' ? 'bg-green-100 text-green-600' :
                          viability.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {viability.difficulty}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Also Works */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-lorcana-ink mb-3 text-center">
              🟡 Alternative Primary Options
            </h3>
            <p className="text-xs text-lorcana-navy text-center mb-3">
              These can work as your main engine with the right build
            </p>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
              {engines.filter(engine => getEngineViability(engine).category === 'unconventional').map(engine => {
                const viability = getEngineViability(engine);
                return (
                  <button
                    key={engine}
                    onClick={() => handleSelectEngine(engine)}
                    className="card-lorcana p-3 hover:shadow-lg transition-all duration-300 opacity-75 hover:opacity-100"
                  >
                    <div className="flex flex-col space-y-2">
                      <h4 className="text-sm font-semibold text-lorcana-ink capitalize">{engine}</h4>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={10} className={i < viability.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'} />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experimental */}
          <div>
            <h3 className="text-lg font-bold text-lorcana-ink mb-3 text-center">
              🔴 Experimental Primary Engines
            </h3>
            <p className="text-xs text-lorcana-navy text-center mb-3">
              Advanced builders only - these require very specific builds to work as primary engines
            </p>
            <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-2">
              {engines.filter(engine => getEngineViability(engine).category === 'experimental').map(engine => {
                const viability = getEngineViability(engine);
                return (
                  <button
                    key={engine}
                    onClick={() => handleSelectEngine(engine)}
                    className="card-lorcana p-2 hover:shadow-md transition-all duration-300 opacity-50 hover:opacity-75"
                  >
                    <div className="flex flex-col space-y-1">
                      <h4 className="text-xs font-medium text-lorcana-ink capitalize">{engine}</h4>
                      <div className="flex items-center justify-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={8} className={i < viability.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'} />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrentStep(startingPath === 'strategy' ? 1 : 2)}
            className="btn-lorcana-navy-outline flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          {strategicEngine && (
            <button
              onClick={() => setCurrentStep(startingPath === 'strategy' ? 3 : 4)}
              className="btn-lorcana-gold flex items-center space-x-2"
            >
              <span>Next: {startingPath === 'strategy' ? 'Choose Colors' : 'Build Deck'}</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };


  const renderColorSuggestions = () => {
    // Suggest colors based on the chosen archetype
    const colorSuggestions: Record<string, { primary: InkColor[], secondary: InkColor[] }> = {
      aggro: {
        primary: ['emerald', 'ruby'],
        secondary: ['amber', 'steel']
      },
      control: {
        primary: ['amethyst', 'sapphire'],
        secondary: ['amber', 'steel']
      },
      midrange: {
        primary: ['amber', 'amethyst'],
        secondary: ['emerald', 'ruby']
      },
      combo: {
        primary: ['amethyst', 'sapphire'],
        secondary: ['ruby', 'amber']
      },
      tempo: {
        primary: ['ruby', 'emerald'],
        secondary: ['amethyst', 'sapphire']
      },
      ramp: {
        primary: ['emerald', 'sapphire'],
        secondary: ['steel', 'amber']
      }
    };

    const suggestions = deckArchetype ? colorSuggestions[deckArchetype] : null;

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-lorcana-ink mb-4">Recommended Colors for {deckArchetype}</h2>
          <p className="text-lorcana-navy text-lg">
            Based on your {deckArchetype} strategy, here are the best color combinations
          </p>
        </div>

        {suggestions && (
          <>
            {/* Primary Recommendations */}
            <div className="max-w-4xl mx-auto">
              <h3 className="text-xl font-bold text-lorcana-ink mb-4 text-center">
                🌟 Highly Recommended
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {suggestions.primary.map(color => (
                  <button
                    key={color}
                    onClick={() => handleSelectColor(color)}
                    className={`card-lorcana p-4 transition-all duration-300 transform hover:scale-105 ${
                      selectedColors.includes(color) ? 'ring-4 ring-lorcana-gold shadow-xl' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-16 h-16 ${inkColors[color].bgColor} rounded-full flex items-center justify-center`}>
                        <img 
                          src={COLOR_ICONS[inkColors[color].name]} 
                          alt={inkColors[color].name}
                          className="w-10 h-10"
                        />
                      </div>
                      <div className="text-left flex-1">
                        <h4 className={`font-bold ${inkColors[color].color} text-lg`}>
                          {inkColors[color].name}
                        </h4>
                        <p className="text-xs text-lorcana-navy">
                          {inkColors[color].tagline}
                        </p>
                        <p className="text-xs text-lorcana-navy mt-1">
                          Perfect for {deckArchetype}: {
                            deckArchetype === 'aggro' && color === 'amber' ? 'Fast lore generation and sustain' :
                            deckArchetype === 'aggro' && color === 'emerald' ? 'Tempo control and disruption ("Lemon-Lime")' :
                            deckArchetype === 'control' && color === 'amethyst' ? 'Card draw and character bounce' :
                            deckArchetype === 'control' && color === 'ruby' ? 'Efficient character removal' :
                            deckArchetype === 'midrange' && color === 'amber' ? 'Defensive sustain and healing' :
                            deckArchetype === 'midrange' && color === 'steel' ? 'Board dominance ("Steelsong")' :
                            'Strategic advantage'
                          }
                        </p>
                      </div>
                      {selectedColors.includes(color) && (
                        <CheckCircle className="text-lorcana-gold" size={24} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Recommendations */}
            <div className="max-w-4xl mx-auto">
              <h3 className="text-lg font-bold text-lorcana-ink mb-3 text-center">
                Also Good Options
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {suggestions.secondary.map(color => (
                  <button
                    key={color}
                    onClick={() => handleSelectColor(color)}
                    disabled={selectedColors.length >= 2 && !selectedColors.includes(color)}
                    className={`card-lorcana p-3 transition-all duration-300 ${
                      selectedColors.includes(color) ? 'ring-4 ring-lorcana-gold shadow-xl' : 'opacity-75 hover:opacity-100'
                    } ${selectedColors.length >= 2 && !selectedColors.includes(color) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-10 h-10 ${inkColors[color].bgColor} rounded-full flex items-center justify-center`}>
                        <img 
                          src={COLOR_ICONS[inkColors[color].name]} 
                          alt={inkColors[color].name}
                          className="w-6 h-6"
                        />
                      </div>
                      <div className="text-left flex-1">
                        <h4 className={`font-semibold ${inkColors[color].color} text-sm`}>
                          {inkColors[color].name}
                        </h4>
                        <p className="text-xs text-lorcana-navy">
                          {inkColors[color].strengths[0]}
                        </p>
                      </div>
                      {selectedColors.includes(color) && (
                        <CheckCircle className="text-lorcana-gold" size={20} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Colors Display */}
            {selectedColors.length === 2 && (
              <div className="mt-8 max-w-2xl mx-auto">
                <div className="card-lorcana p-6 bg-gradient-to-r from-lorcana-cream to-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-lorcana-ink">
                      Your {deckArchetype} Deck: {inkColors[selectedColors[0]].name} + {inkColors[selectedColors[1]].name}
                    </h3>
                    <div className="flex space-x-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        deckArchetype === 'aggro' ? 'bg-red-100 text-red-600' :
                        deckArchetype === 'combo' ? 'bg-blue-100 text-blue-600' :
                        deckArchetype === 'midrange' ? 'bg-green-100 text-green-600' :
                        deckArchetype === 'control' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {deckArchetype ? deckArchetype.charAt(0).toUpperCase() + deckArchetype.slice(1) : ''}
                      </span>
                    </div>
                  </div>
                  <p className="text-lorcana-navy text-sm">
                    {
                      selectedColors.includes('amber') && selectedColors.includes('emerald') 
                        ? 'Amber–Emerald offers blistering speed and tempo disruption. This "Lemon-Lime" aggro build pressures lore gain early while forcing your opponent off balance—perfect for racing and punishing mistakes.'
                        : selectedColors.includes('amethyst') && selectedColors.includes('ruby')
                        ? 'Amethyst–Ruby is a premier control pairing, combining hand manipulation and bounce with efficient removal. This build excels at disruption and board resets leading into powerful finishers.'
                        : selectedColors.includes('amber') && selectedColors.includes('steel')
                        ? 'Amber–Steel offers the well-known "Steelsong" archetype, mixing steady lore pressure with sturdy defenders. This consistent, board-focused build adapts between aggression and resilience.'
                        : selectedColors.includes('ruby') && selectedColors.includes('sapphire')
                        ? 'Sapphire–Ruby offers acceleration into high-impact threats, turning late-game power into early pressure. This powerful ramp build is perfect for deploying game-ending characters ahead of schedule.'
                        : selectedColors.includes('sapphire') && selectedColors.includes('amethyst')
                        ? 'Amethyst–Sapphire ("Blurple") brings together fast ramp and resource acceleration with card advantage and bounce mechanics. This tempo-savvy setup builds explosive board presence through repeated value plays.'
                        : selectedColors.includes('sapphire') && selectedColors.includes('emerald')
                        ? 'Sapphire–Emerald provides card draw, ramp, and tempo disruption. This toolbox midrange build controls rhythm, accelerates resources, and balances proactive and reactive play.'
                        : selectedColors.includes('emerald') && selectedColors.includes('ruby')
                        ? 'Emerald–Ruby delivers evasive threats and tempo swings. This tricky, agile build pressures opponents with hard-to-block characters and surprise shifts in momentum.'
                        : selectedColors.includes('amber') && selectedColors.includes('sapphire')
                        ? 'Amber–Sapphire blends healing and defensive support with ramp and card advantage. This flexible midrange build stabilizes early, accelerates resources, and transitions into consistent board control.'
                        : selectedColors.includes('emerald') && selectedColors.includes('steel')
                        ? 'Emerald–Steel combines resource disruption and low-cost threats with heavy-hitting backup. Perfect for crippling opponent options while sustaining steady board advantage via discard engines.'
                        : selectedColors.includes('amber') && selectedColors.includes('ruby')
                        ? 'Amber–Ruby delivers a pirate-themed synergy deck emphasizing aggressive tempo with evasive pressure plus lore acceleration. Dominates the board while refilling resources and pressing lore advantage.'
                        : selectedColors.includes('amethyst') && selectedColors.includes('steel')
                        ? 'Amethyst–Steel blends bounce and recursion tools with disruptive board presence. This resilient tempo build responds, resets, and snowballs through repeatable value.'
                        : selectedColors.includes('emerald') && selectedColors.includes('amethyst')
                        ? 'Emerald–Amethyst combines aggressive tempo with disruptive control, leveraging bounce mechanics and evasive characters. This dynamic build adapts to various strategies while maintaining consistent pressure.'
                        : selectedColors.includes('ruby') && selectedColors.includes('steel')
                        ? 'Ruby–Steel combines aggressive tempo with combo potential and control elements, leveraging evasive characters and efficient removal. This dynamic build adapts to various strategies while maintaining consistent pressure.'
                        : selectedColors.includes('sapphire') && selectedColors.includes('steel')
                        ? 'Sapphire–Steel combines efficient ramping with robust control elements, leveraging item synergies and powerful characters. This versatile build adapts to various strategies while maintaining consistent pressure.'
                        : 'This unique combination offers strategic depth and tactical flexibility for your chosen archetype.'
                    }
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-between mt-8">
          <button
            onClick={() => {
              setCurrentStep(1);
              setSelectedColors([]);
            }}
            className="btn-lorcana-navy-outline flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <button
            onClick={() => setCurrentStep(3)}
            disabled={selectedColors.length !== 2}
            className={`flex items-center space-x-2 ${
              selectedColors.length === 2 
                ? 'btn-lorcana-gold' 
                : 'btn-lorcana-gold opacity-50 cursor-not-allowed'
            }`}
          >
            <span>Start Building</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderBuildingPhase = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-lorcana-ink mb-4">Building Your Deck</h2>
        <p className="text-lorcana-navy text-lg">
          Let's start adding cards to your {deckArchetype} deck
        </p>
        <div className="mt-4 flex justify-center items-center space-x-2">
          <div className={`px-3 py-1 rounded ${inkColors[selectedColors[0]].bgColor} ${inkColors[selectedColors[0]].color} font-semibold`}>
            {inkColors[selectedColors[0]].name}
          </div>
          <span className="text-lorcana-gold">+</span>
          <div className={`px-3 py-1 rounded ${inkColors[selectedColors[1]].bgColor} ${inkColors[selectedColors[1]].color} font-semibold`}>
            {inkColors[selectedColors[1]].name}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
          <div className="bg-gradient-to-r from-lorcana-gold to-lorcana-purple h-full rounded-full transition-all duration-500" 
               style={{ width: '25%' }}>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-lorcana-navy">
          <span>0/60 cards</span>
          <span>Step 1: Core Engine</span>
        </div>
      </div>

      {/* Current Step Instructions */}
      <div className="max-w-4xl mx-auto">
        <div className="card-lorcana p-6 bg-gradient-to-r from-lorcana-cream to-white">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Info className="text-lorcana-gold" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-lorcana-ink mb-2">Step 1: Choose Your Core Engine</h3>
              <p className="text-lorcana-navy mb-3">
                Your core engine consists of 8-12 cards that define your deck's primary strategy. 
                For your {deckArchetype} deck, look for:
              </p>
              <ul className="space-y-1 text-sm text-lorcana-navy">
                {deckArchetype === 'aggro' && (
                  <>
                    <li>• Efficient 2-3 cost characters with good stats</li>
                    <li>• Characters with Rush or Evasive abilities</li>
                    <li>• Cards that can quest immediately</li>
                  </>
                )}
                {deckArchetype === 'combo' && (
                  <>
                    <li>• Key combo pieces that work together</li>
                    <li>• Card draw to find your combo pieces</li>
                    <li>• Protection or enablers for your combo</li>
                  </>
                )}
                {deckArchetype === 'midrange' && (
                  <>
                    <li>• Versatile 3-5 cost characters</li>
                    <li>• Cards with multiple abilities</li>
                    <li>• Good stats for their cost</li>
                  </>
                )}
                {deckArchetype === 'control' && (
                  <>
                    <li>• Cards with "When Played" removal effects</li>
                    <li>• High-cost powerful characters for late game</li>
                    <li>• Cards that generate card advantage</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for card selection interface */}
      <div className="max-w-6xl mx-auto">
        <div className="card-lorcana p-8 text-center">
          <Sparkles className="mx-auto text-lorcana-gold mb-4" size={48} />
          <h3 className="text-xl font-bold text-lorcana-ink mb-2">Card Selection Coming Soon!</h3>
          <p className="text-lorcana-navy mb-4">
            This is where you'll browse and select cards based on the filters and recommendations 
            tailored to your chosen colors and archetype.
          </p>
          <p className="text-sm text-lorcana-navy">
            The interface will show filtered cards, mana curve visualization, synergy suggestions, 
            and real-time deck validation.
          </p>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep(2)}
          className="btn-lorcana-navy-outline flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button
          onClick={() => navigate('/decks')}
          className="btn-lorcana-gold flex items-center space-x-2"
        >
          <span>Exit Deck Forge</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderStartingPaths();
      case 1:
        if (startingPath === 'colors') {
          return renderColorSelection();
        }
        if (startingPath === 'strategy') {
          // For strategy path, go straight to archetype selection
          return renderArchetypeSelection();
        }
        // Placeholder for other paths
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-lorcana-ink mb-4">Coming Soon!</h2>
            <p className="text-lorcana-navy mb-4">
              {startingPath === 'theme' && 'Theme-based deck building will be available soon.'}
              {startingPath === 'card' && 'Building around a signature card will be available soon.'}
            </p>
            <button
              onClick={() => setCurrentStep(0)}
              className="btn-lorcana-gold"
            >
              Back to Start
            </button>
          </div>
        );
      case 2:
        if (startingPath === 'strategy') {
          // After choosing archetype in strategy path, show strategic engine selection
          return renderStrategicEngineSelection();
        }
        return renderArchetypeSelection();
      case 3:
        if (startingPath === 'strategy') {
          // After choosing engine in strategy path, suggest colors
          return renderColorSuggestions();
        }
        return renderStrategicEngineSelection();
      case 4:
        return renderBuildingPhase();
      default:
        return renderStartingPaths();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Progress Indicator */}
      {currentStep > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2">
            {[0, 1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                {step > 0 && (
                  <div className={`h-0.5 w-16 ${
                    step <= currentStep ? 'bg-lorcana-gold' : 'bg-gray-300'
                  }`} />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === currentStep 
                    ? 'bg-lorcana-gold text-lorcana-navy' 
                    : step < currentStep 
                    ? 'bg-lorcana-purple text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {step < currentStep ? <CheckCircle size={16} /> : step + 1}
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-center mt-2 space-x-12 text-xs text-lorcana-navy">
            <span className={currentStep === 0 ? 'font-bold' : ''}>Start</span>
            <span className={currentStep === 1 ? 'font-bold' : ''}>Colors</span>
            <span className={currentStep === 2 ? 'font-bold' : ''}>Style</span>
            <span className={currentStep === 3 ? 'font-bold' : ''}>Engine</span>
            <span className={currentStep === 4 ? 'font-bold' : ''}>Build</span>
          </div>
        </div>
      )}

      {renderCurrentStep()}
    </div>
  );
};

export default DeckForge;