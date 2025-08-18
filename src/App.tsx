import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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
import { useModal } from './hooks';
import AuthSection from './components/layout/AuthSection';
import Navigation from './components/layout/Navigation';
import DeckEditingSidebar from './components/layout/DeckEditingSidebar';
import Footer from './components/Footer';

function AppContent() {
  const navigate = useNavigate();
  const { navVisible } = useScrollManager();
  const loginModal = useModal();
  const profileModal = useModal();
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
          <div className="sm:hidden bg-lorcana-navy shadow-xl">
            <header className="px-4 py-3 flex items-center justify-between">
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

          {/* Desktop Header section - Full Width */}
          <div className="hidden sm:block bg-lorcana-navy shadow-xl">
            <header className="p-6 pb-4 relative">
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
          </div>

          {/* Main Content Area - shifts when deck sidebar is open on desktop */}
          <div className={`flex-1 transition-all duration-300 ease-in-out ${
            isEditingDeck && !sidebarCollapsed ? 'lg:mr-80 xl:mr-80' : ''
          }`}>
            <main className="pb-20 sm:pb-0">
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
