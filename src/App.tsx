import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Package, Layers3, Users } from 'lucide-react';
import CardBrowser from './components/CardBrowser';
import Collections from './components/Collections';
import SetBinder from './components/SetBinder';
import MyDecks from './components/MyDecks';
import DeckSummary from './components/DeckSummary';
import UsersComponent from './components/Users';
import UserProfileComponent from './components/UserProfile';
import LoginModal from './components/LoginModal';
import { CollectionProvider } from './contexts/CollectionContext';
import { DeckProvider, useDeck } from './contexts/DeckContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import ProfileEditModal from './components/ProfileEditModal';
import { ImageLoadProvider } from './contexts/ImageLoadContext';
import { useScrollManager } from './hooks/useScrollManager';
import AuthSection from './components/layout/AuthSection';
import Navigation from './components/layout/Navigation';
import DeckEditingSidebar from './components/layout/DeckEditingSidebar';
import Footer from './components/Footer';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { navVisible } = useScrollManager();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isEditingDeck, currentDeck, stopEditingDeck, removeCardFromDeck, updateCardQuantity, updateDeck, validateDeck, deleteDeck } = useDeck();

  const isActivePath = (path: string) => {
    if (path === '/cards') {
      return location.pathname === '/' || location.pathname === '/cards';
    }
    if (path === '/collections') {
      return location.pathname.startsWith('/collections') || location.pathname.startsWith('/collection');
    }
    return location.pathname.startsWith(path);
  };

  const isDeckPage = location.pathname.includes('/deck/');
  const shouldHideNavigation = isDeckPage;
  
  const handleDeleteDeck = async () => {
    if (currentDeck) {
      try {
        await deleteDeck(currentDeck.id);
        stopEditingDeck();
        setSidebarCollapsed(false);
      } catch (error) {
        console.error('Error deleting deck:', error);
      }
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



  return (
    <div className="min-h-screen bg-lorcana-cream">
          {/* Mobile Header - Full Width */}
          <div className="sm:hidden bg-lorcana-navy shadow-xl border-b-2 border-lorcana-gold">
            <header className="px-4 py-3 flex items-center justify-between">
              <div className="flex-1 flex justify-center">
                <img 
                  src="/imgs/lorebook-wide.png" 
                  alt="Lorebook" 
                  className="h-12 object-contain"
                />
              </div>
              
              {/* Mobile Auth */}
              <div className="flex-shrink-0">
                <AuthSection
                  isMobile
                  onLoginClick={() => setShowLoginModal(true)}
                  onProfileClick={() => setShowProfileModal(true)}
                />
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
                  <div className="flex flex-col items-center">
                    <img 
                      src="/imgs/lorebook-wide.png" 
                      alt="Lorebook" 
                      className="h-24 object-contain"
                    />
                  </div>
                  
                  {/* Auth section - top right */}
                  <div className="absolute top-4 right-6">
                    <AuthSection
                      onLoginClick={() => setShowLoginModal(true)}
                      onProfileClick={() => setShowProfileModal(true)}
                    />
                  </div>
                </header>

                {/* Desktop Navigation */}
                {!shouldHideNavigation && (
                  <nav className="px-6 pb-3">
                    <div className="flex justify-center">
                      <div className="bg-lorcana-purple/50 backdrop-blur border border-lorcana-gold/50 rounded-sm p-1">
                        <div className="flex space-x-1">
                          {[
                            { id: '/cards', label: 'Cards', icon: BookOpen },
                            { id: '/collections', label: 'Collections', icon: Package },
                            { id: '/decks', label: 'Decks', icon: Layers3 },
                            { id: '/users', label: 'Users', icon: Users },
                          ].map((tab) => {
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
                  <Route path="/collections" element={<Collections />} />
                  <Route path="/collection/binder/:setCode" element={<SetBinder />} />
                  <Route path="/binder/:binderId" element={<SetBinder />} />
                  <Route path="/decks" element={<MyDecks onBuildDeck={() => {}} onViewDeck={(deckId: string) => navigate(`/deck/${deckId}`)} />} />
                  <Route path="/deck/:deckId" element={<DeckSummary onBack={() => navigate('/decks')} onEditDeck={() => {}} />} />
                  <Route path="/users" element={<UsersComponent onViewProfile={(userId: string) => navigate(`/users/${userId}`)} />} />
                  <Route path="/users/:userId" element={<UserProfileComponent onBack={() => navigate('/users')} />} />
                </Routes>
              </main>
            </div>
          </div>

          {/* Footer */}
          <Footer />

          <DeckEditingSidebar
            isEditingDeck={isEditingDeck}
            currentDeck={currentDeck}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            onRemoveCard={removeCardFromDeck}
            onUpdateQuantity={updateCardQuantity}
            onDeleteDeck={handleDeleteDeck}
            onViewDeck={handleViewDeck}
            onStopEditing={handleStopEditingDeck}
            onUpdateDeckName={handleUpdateDeckName}
            onUpdateDeckDescription={handleUpdateDeckDescription}
            deckValidation={currentDeck ? validateDeck(currentDeck) : { isValid: false, errors: [] }}
            navVisible={navVisible}
          />

          {/* Mobile Navigation - sticky and scroll-responsive */}
          <Navigation
            shouldHideNavigation={shouldHideNavigation}
            navVisible={navVisible}
            isActivePath={isActivePath}
          />
          
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
