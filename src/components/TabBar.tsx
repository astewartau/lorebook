import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Package, Layers3, Users, LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const tabs: Tab[] = [
  { id: 'cards', label: 'Cards', icon: BookOpen, path: '/cards' },
  { id: 'collections', label: 'Collections', icon: Package, path: '/collections' },
  { id: 'decks', label: 'Decks', icon: Layers3, path: '/decks' },
  { id: 'community', label: 'Community', icon: Users, path: '/community' },
];

const TabBar: React.FC = () => {
  const location = useLocation();

  const isActivePath = (path: string) => {
    if (path === '/cards') {
      return location.pathname === '/' || location.pathname === '/cards';
    }
    if (path === '/collections') {
      return location.pathname.startsWith('/collections') || location.pathname.startsWith('/collection');
    }
    if (path === '/community') {
      return location.pathname.startsWith('/community');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="hidden sm:block bg-transparent border-b-2 border-lorcana-gold relative">
      <nav className="px-6 py-4">
        <div className="flex justify-center">
          <div className="bg-lorcana-purple/50 backdrop-blur border border-lorcana-gold/50 rounded-sm p-1">
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.id}
                    to={tab.path}
                    className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-sm transition-all duration-200 ${
                      isActivePath(tab.path)
                        ? 'bg-lorcana-gold text-lorcana-navy shadow-md'
                        : 'text-lorcana-cream hover:bg-lorcana-purple hover:text-lorcana-gold'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default TabBar;