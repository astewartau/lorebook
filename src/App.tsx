import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
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
import LegalNoticeModal from './components/LegalNoticeModal';
import DataAttributionModal from './components/DataAttributionModal';
import { ImageLoadProvider } from './contexts/ImageLoadContext';
import { useScrollManager } from './hooks/useScrollManager';
import { useModal } from './hooks';
import AuthSection from './components/layout/AuthSection';
import Navigation from './components/layout/Navigation';
import DeckEditingSidebar from './components/layout/DeckEditingSidebar';
import Footer from './components/Footer';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { navVisible } = useScrollManager();
  const loginModal = useModal();
  const profileModal = useModal();
  const legalModal = useModal();
  const dataAttributionModal = useModal();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isEditingDeck, currentDeck, stopEditingDeck, removeCardFromDeck, updateCardQuantity, updateDeck, validateDeck, deleteDeck } = useDeck();


  // Don't hide navigation - show it on all pages including individual deck and user profile pages
  const shouldHideNavigation = false;
  
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
      navigate(`/decks/${deckId}`);
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
    <div className="min-h-screen bg-lorcana-cream flex flex-col">
          {/* Mobile Header - Full Width */}
          <div className="sm:hidden bg-gradient-to-br from-lorcana-navy via-lorcana-purple to-lorcana-navy shadow-xl relative">
            <div className="absolute inset-0 opacity-15">
              <div className="absolute top-0 left-0 w-24 h-24 bg-lorcana-gold transform rotate-45 -translate-x-12 -translate-y-12"></div>
              <div className="absolute top-0 right-0 w-16 h-16 bg-lorcana-gold rounded-full -translate-y-6 translate-x-6"></div>
              <div className="absolute bottom-0 right-1/4 w-28 h-28 bg-lorcana-gold transform rotate-45 translate-y-14"></div>
            </div>
            <header className="px-4 py-4 flex items-center justify-between relative">
              <div className="flex-1 flex justify-center">
                <button 
                  onClick={() => navigate('/cards')}
                  className="focus:outline-none hover:opacity-80 transition-opacity"
                >
                  <img 
                    src="/imgs/lorebook-wide.png" 
                    alt="Lorebook" 
                    className="h-12 object-contain"
                  />
                </button>
              </div>
              
              {/* Mobile Auth */}
              <div className="flex-shrink-0">
                <AuthSection
                  isMobile
                  onLoginClick={() => loginModal.open()}
                  onProfileClick={() => profileModal.open()}
                />
              </div>
            </header>
          </div>

          {/* Desktop Header and TabBar Container - Combined with continuous pattern */}
          <div className="hidden sm:block bg-gradient-to-br from-lorcana-navy via-lorcana-purple to-lorcana-navy shadow-xl relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-32 h-32 bg-lorcana-gold transform rotate-45 -translate-x-16 -translate-y-16"></div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-lorcana-gold rounded-full -translate-y-8 translate-x-8"></div>
              <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-lorcana-gold transform rotate-45 translate-y-20"></div>
              <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-lorcana-gold rounded-full opacity-50"></div>
              <div className="absolute bottom-4 right-1/3 w-16 h-16 bg-lorcana-gold rounded-full opacity-30"></div>
              <div className="absolute top-3/4 left-1/6 w-24 h-24 bg-lorcana-gold transform rotate-45 opacity-25"></div>
              {/* Additional pattern elements for TabBar area */}
              <div className="absolute bottom-0 right-1/4 w-20 h-20 bg-lorcana-gold rounded-full opacity-15"></div>
              <div className="absolute bottom-2 left-1/3 w-16 h-16 bg-lorcana-gold transform rotate-45 opacity-20"></div>
            </div>
            
            {/* Header */}
            <header className="p-6 pb-0 relative">
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => navigate('/cards')}
                  className="focus:outline-none hover:opacity-80 transition-opacity"
                >
                  <img 
                    src="/imgs/lorebook-wide.png" 
                    alt="Lorebook" 
                    className="h-24 object-contain cursor-pointer"
                  />
                </button>
              </div>
              
              {/* Auth section - top right */}
              <div className="absolute top-4 right-6">
                <AuthSection
                  onLoginClick={() => loginModal.open()}
                  onProfileClick={() => profileModal.open()}
                />
              </div>
            </header>
            
            {/* TabBar - Inside the gradient container */}
            <div className="border-b-2 border-lorcana-gold relative z-10">
              <nav className="px-6 py-4">
                <div className="flex justify-center">
                  <div className="bg-lorcana-purple/50 backdrop-blur border border-lorcana-gold/50 rounded-sm p-1">
                    <div className="flex space-x-1">
                      {[
                        { id: 'cards', label: 'Cards', icon: BookOpen, path: '/cards' },
                        { id: 'collections', label: 'Collections', icon: Package, path: '/collections' },
                        { id: 'decks', label: 'Decks', icon: Layers3, path: '/decks' },
                        { id: 'community', label: 'Community', icon: Users, path: '/community' },
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = tab.path === '/cards' 
                          ? (location.pathname === '/' || location.pathname === '/cards')
                          : tab.path === '/collections'
                          ? (location.pathname.startsWith('/collections') || location.pathname.startsWith('/collection'))
                          : tab.path === '/community'
                          ? location.pathname.startsWith('/community')
                          : location.pathname.startsWith(tab.path);
                        
                        return (
                          <Link
                            key={tab.id}
                            to={tab.path}
                            className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-sm transition-all duration-200 ${
                              isActive
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
          </div>

          {/* Main Content Area - shifts when deck sidebar is open on desktop */}
          <div className={`flex-1 transition-all duration-300 ease-in-out ${
            isEditingDeck && !sidebarCollapsed ? 'lg:mr-80 xl:mr-80' : ''
          }`}>
            <main className="pb-20 sm:pb-10">
                <Routes>
                  <Route path="/" element={<CardBrowser />} />
                  <Route path="/cards" element={<CardBrowser />} />
                  <Route path="/collections" element={<Collections />} />
                  <Route path="/collection/binder/:setCode" element={<SetBinder />} />
                  <Route path="/binder/:binderId" element={<SetBinder />} />
                  <Route path="/decks" element={<MyDecks onBuildDeck={() => {}} onViewDeck={(deckId: string) => navigate(`/decks/${deckId}`)} />} />
                  <Route path="/decks/:deckId" element={<DeckSummary onBack={() => navigate('/decks')} onEditDeck={() => {}} />} />
                  <Route path="/community" element={<UsersComponent onViewProfile={(userId: string) => navigate(`/community/${userId}`)} />} />
                  <Route path="/community/:userId" element={<UserProfileComponent onBack={() => navigate('/community')} />} />
                </Routes>
            </main>
          </div>

          {/* Footer */}
          <Footer 
            onLegalClick={legalModal.open}
            onDataAttributionClick={dataAttributionModal.open}
          />

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
          />
          
          {/* Login Modal */}
          <LoginModal
            isOpen={loginModal.isOpen}
            onClose={loginModal.close}
          />

          {/* Profile Edit Modal */}
          <ProfileEditModal
            isOpen={profileModal.isOpen}
            onClose={profileModal.close}
          />

          {/* Legal Notice Modal */}
          <LegalNoticeModal
            isOpen={legalModal.isOpen}
            onClose={legalModal.close}
          />

          {/* Data Attribution Modal */}
          <DataAttributionModal
            isOpen={dataAttributionModal.isOpen}
            onClose={dataAttributionModal.close}
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
