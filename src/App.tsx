import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Package, Layers3, User, LogOut, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import CardBrowser from './components/CardBrowser';
import Collection from './components/Collection';
import MyDecks from './components/MyDecks';
import DeckSummary from './components/DeckSummary';
import UsersComponent from './components/Users';
import UserProfileComponent from './components/UserProfile';
import LoginModal from './components/LoginModal';
import DeckPanel from './components/deck/DeckPanel';
import { CollectionProvider } from './contexts/CollectionContext';
import { DeckProvider, useDeck } from './contexts/DeckContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';
import ProfileEditModal from './components/ProfileEditModal';
import { ImageLoadProvider } from './contexts/ImageLoadContext';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, signOut, loading } = useAuth();
  const { isEditingDeck, currentDeck, stopEditingDeck, removeCardFromDeck, updateCardQuantity, updateDeck, validateDeck } = useDeck();
  const { userProfile } = useProfile();

  const tabs = [
    { id: '/cards', label: 'Cards', icon: BookOpen },
    { id: '/collection', label: 'Collection', icon: Package },
    { id: '/decks', label: 'Decks', icon: Layers3 },
    { id: '/users', label: 'Users', icon: Users },
  ];

  const isActivePath = (path: string) => {
    if (path === '/cards') {
      return location.pathname === '/' || location.pathname === '/cards';
    }
    return location.pathname.startsWith(path);
  };

  const isDeckPage = location.pathname.includes('/deck/');
  const shouldHideNavigation = isDeckPage;
  
  const handleClearDeck = () => {
    if (currentDeck) {
      updateDeck({
        ...currentDeck,
        cards: [],
        updatedAt: new Date()
      });
    }
  };
  
  const handleViewDeck = (deckId?: string) => {
    if (deckId) {
      navigate(`/deck/${deckId}`);
    }
  };
  
  const handleStopEditingDeck = () => {
    stopEditingDeck();
    setSidebarCollapsed(false);
  };

  const handleUpdateDeckName = (name: string) => {
    if (currentDeck) {
      updateDeck({
        ...currentDeck,
        name,
        updatedAt: new Date()
      });
    }
  };

  const handleUpdateDeckDescription = (description: string) => {
    if (currentDeck) {
      updateDeck({
        ...currentDeck,
        description,
        updatedAt: new Date()
      });
    }
  };

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      const threshold = 10; // Minimum scroll distance to trigger hide/show
      
      // Don't hide/show if we're near the top
      if (currentScrollY < 100) {
        setNavVisible(true);
      } else if (Math.abs(currentScrollY - lastScrollY) > threshold) {
        if (currentScrollY > lastScrollY) {
          // Scrolling down - hide navbar
          setNavVisible(false);
        } else {
          // Scrolling up - show navbar
          setNavVisible(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', controlNavbar);
    
    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, [lastScrollY]);


  return (
    <div className="min-h-screen bg-lorcana-cream">
          {/* Mobile Header - Full Width */}
          <div className="sm:hidden bg-lorcana-navy shadow-xl border-b-2 border-lorcana-gold">
            <header className="px-4 py-3 flex items-center justify-between">
              <div className="flex-1 text-center">
                <h1 className="text-xl font-bold text-lorcana-gold tracking-wide">
                  Lorcana Manager
                </h1>
              </div>
              
              {/* Mobile Auth */}
              <div className="flex-shrink-0">
                {loading ? (
                  <div className="w-8 h-8 rounded-full bg-lorcana-cream/20 animate-pulse"></div>
                ) : user ? (
                  <button
                    onClick={() => signOut()}
                    className="p-2 text-lorcana-cream hover:text-lorcana-gold transition-colors"
                    title={`Sign out ${user.email}`}
                  >
                    <LogOut size={20} />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    data-sign-in-button
                    className="p-2 text-lorcana-gold hover:text-lorcana-cream transition-colors"
                  >
                    <User size={20} />
                  </button>
                )}
              </div>
            </header>
          </div>

          {/* Main Content Area - shifts when deck sidebar is open on desktop */}
          <div className={`transition-all duration-300 ease-in-out ${
            isEditingDeck && !sidebarCollapsed ? 'lg:mr-80 xl:mr-80' : ''
          }`}>
            <div className="container mx-auto px-2 sm:px-4 py-0 sm:py-6">
              {/* Desktop Header section */}
              <div className="hidden sm:block bg-lorcana-navy rounded-t-sm shadow-xl border-2 border-lorcana-gold border-b-0">
                <header className="p-6 pb-4 relative">
                  <h1 className="text-4xl font-bold text-lorcana-gold mb-2 text-center tracking-wider">
                    Lorcana Collection Manager
                  </h1>
                  <p className="text-lorcana-cream text-center">
                    Manage your Disney Lorcana TCG collection
                  </p>
                  
                  {/* Auth section - top right */}
                  <div className="absolute top-4 right-6">
                    {loading ? (
                      <div className="text-lorcana-cream">Loading...</div>
                    ) : user ? (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setShowProfileModal(true)}
                          className="flex items-center space-x-2 text-lorcana-cream hover:text-lorcana-gold transition-colors"
                        >
                          <User size={18} />
                          <span className="text-sm truncate max-w-32 underline-offset-2 hover:underline" title={userProfile ? `@${userProfile.displayName}` : user.email}>
                            {userProfile ? userProfile.displayName : user.email}
                          </span>
                        </button>
                        <button
                          onClick={() => signOut()}
                          className="flex items-center space-x-1 px-3 py-1 text-sm text-lorcana-cream hover:text-lorcana-gold border border-lorcana-cream/30 hover:border-lorcana-gold rounded-sm transition-colors"
                        >
                          <LogOut size={14} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowLoginModal(true)}
                        data-sign-in-button
                        className="flex items-center space-x-2 px-4 py-2 bg-lorcana-gold text-lorcana-navy rounded-sm hover:bg-lorcana-cream transition-colors font-medium"
                      >
                        <User size={16} />
                        <span>Sign In</span>
                      </button>
                    )}
                  </div>
                </header>

                {/* Desktop Navigation - always visible */}
                {!shouldHideNavigation && (
                  <nav className="px-6 pb-3">
                    <div className="flex justify-center">
                      <div className="bg-lorcana-purple/50 backdrop-blur border border-lorcana-gold/50 rounded-sm p-1">
                        <div className="flex space-x-1">
                          {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                              <Link
                                key={tab.id}
                                to={tab.id}
                                className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-sm transition-all duration-200 ${
                                  isActivePath(tab.id)
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
                )}
              </div>

              <main className="pb-20 sm:pb-0">
                <Routes>
                  <Route path="/" element={<CardBrowser />} />
                  <Route path="/cards" element={<CardBrowser />} />
                  <Route path="/collection" element={<Collection />} />
                  <Route path="/decks" element={<MyDecks onBuildDeck={() => {}} onViewDeck={(deckId: string) => navigate(`/deck/${deckId}`)} />} />
                  <Route path="/deck/:deckId" element={<DeckSummary onBack={() => navigate('/decks')} onEditDeck={() => {}} />} />
                  <Route path="/users" element={<UsersComponent onViewProfile={(userId: string) => navigate(`/users/${userId}`)} />} />
                  <Route path="/users/:userId" element={<UserProfileComponent onBack={() => navigate('/users')} />} />
                </Routes>
              </main>
            </div>
          </div>

          {/* Mobile Navigation - sticky and scroll-responsive */}
          {!shouldHideNavigation && (
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
          )}
          
          {/* Persistent Deck Panel - Shows when editing a deck */}
          {isEditingDeck && currentDeck && (
            <>
              {/* Backdrop when expanded - only on mobile/tablet */}
              {!sidebarCollapsed && (
                <div 
                  className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
                  onClick={() => setSidebarCollapsed(true)}
                />
              )}
              
              {/* Deck Sidebar */}
              <div className={`fixed top-0 right-0 h-screen transition-all duration-300 ease-in-out z-40 ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
                {/* Collapse/Expand Button */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-50 w-8 h-12 bg-white border-2 border-lorcana-gold rounded-l-sm shadow-xl hover:bg-lorcana-cream transition-colors flex items-center justify-center"
                >
                  {sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
                
                {/* Sidebar Content */}
                <div className={`h-full transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <DeckPanel
                    deck={currentDeck}
                    onRemoveCard={removeCardFromDeck}
                    onUpdateQuantity={updateCardQuantity}
                    onClearDeck={handleClearDeck}
                    onViewDeck={handleViewDeck}
                    onStopEditing={handleStopEditingDeck}
                    onUpdateDeckName={handleUpdateDeckName}
                    onUpdateDeckDescription={handleUpdateDeckDescription}
                    validation={validateDeck(currentDeck)}
                    isCollapsed={sidebarCollapsed}
                  />
                </div>
              </div>
            </>
          )}
          
          {/* Login Modal */}
          <LoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
          />

          {/* Profile Edit Modal */}
          <ProfileEditModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
          />
        </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <CollectionProvider>
          <ImageLoadProvider>
            <DeckProvider>
              <Router>
                <AppContent />
              </Router>
            </DeckProvider>
          </ImageLoadProvider>
        </CollectionProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

export default App;
