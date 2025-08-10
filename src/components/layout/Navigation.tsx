import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Package, Layers3, Users } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface NavigationProps {
  shouldHideNavigation: boolean;
  navVisible: boolean;
  isActivePath: (path: string) => boolean;
}

const Navigation: React.FC<NavigationProps> = ({
  shouldHideNavigation,
  navVisible,
  isActivePath
}) => {
  const tabs: Tab[] = [
    { id: '/cards', label: 'Cards', icon: BookOpen },
    { id: '/collection', label: 'Collection', icon: Package },
    { id: '/decks', label: 'Decks', icon: Layers3 },
    { id: '/users', label: 'Users', icon: Users },
  ];

  if (shouldHideNavigation) {
    return null;
  }

  return (
    /* Mobile Navigation - sticky and scroll-responsive */
    <nav className={`
      sm:hidden fixed bottom-0 left-0 right-0 z-50 
      bg-lorcana-navy/95 backdrop-blur border-t-2 border-lorcana-gold
      transition-transform duration-300 ease-in-out
      ${navVisible ? 'translate-y-0' : 'translate-y-full'}
    `}>
      <div className="px-2 py-2">
        <div className="flex justify-around space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                to={tab.id}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-sm transition-all duration-200 flex-1 ${
                  isActivePath(tab.id)
                    ? 'bg-lorcana-gold text-lorcana-navy shadow-md'
                    : 'text-lorcana-cream hover:bg-lorcana-purple hover:text-lorcana-gold'
                }`}
              >
                <Icon size={18} />
                <span className="text-xs font-medium mt-1 leading-none">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;