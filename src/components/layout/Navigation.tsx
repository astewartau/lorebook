import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Package, Layers3, Users } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface NavigationProps {
  shouldHideNavigation: boolean;
  navVisible: boolean;
}

const Navigation: React.FC<NavigationProps> = ({
  shouldHideNavigation,
  navVisible
}) => {
  const location = useLocation();

  const isActivePath = (path: string) => {
    if (path === '/cards') {
      return location.pathname === '/' || location.pathname === '/cards';
    }
    if (path === '/collections') {
      return location.pathname.startsWith('/collections') || location.pathname.startsWith('/collection');
    }
    return location.pathname.startsWith(path);
  };
  const tabs: Tab[] = [
    { id: '/cards', label: 'Cards', icon: BookOpen },
    { id: '/collections', label: 'Collections', icon: Package },
    { id: '/decks', label: 'Decks', icon: Layers3 },
    { id: '/community', label: 'Community', icon: Users },
  ];

  if (shouldHideNavigation) {
    return null;
  }

  return (
    /* Mobile Navigation - scroll responsive */
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-lorcana-navy/95 backdrop-blur border-t-2 border-lorcana-gold transition-transform duration-200 ease-in-out"
      style={{
        transform: navVisible ? 'translateY(0)' : 'translateY(100%)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex justify-around px-4 py-2">
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
    </nav>
  );
};

export default Navigation;