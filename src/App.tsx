import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { BookOpen, Package, Layers3, Users } from 'lucide-react';
import CardBrowser from './components/CardBrowser';
import LoginModal from './components/LoginModal';
import { CollectionProvider } from './contexts/CollectionContext';
import { DeckProvider, useDeck } from './contexts/DeckContext';
import { BinderProvider } from './contexts/BinderContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';
import { CardDataProvider } from './contexts/CardDataContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/Toast';
import ProfileEditModal from './components/ProfileEditModal';
import LegalNoticeModal from './components/LegalNoticeModal';
import DataAttributionModal from './components/DataAttributionModal';
import AvatarEditor from './components/AvatarEditor';
import { useModal } from './hooks';
import AuthSection from './components/layout/AuthSection';
import Navigation from './components/layout/Navigation';
import DeckEditingSidebar from './components/layout/DeckEditingSidebar';
import Footer from './components/Footer';

// Pages other than the card browser load when first visited.
const Collections = lazy(() => import('./components/Collections'));
const SetBinder = lazy(() => import('./components/SetBinder'));
const MyDecks = lazy(() => import('./components/MyDecks'));
const DeckSummary = lazy(() => import('./components/DeckSummary'));
const UsersComponent = lazy(() => import('./components/Users'));
const UserProfileComponent = lazy(() => import('./components/UserProfile'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const AuthCallback = lazy(() => import('./components/AuthCallback'));

const PageLoading = () => (
  <div className="flex items-center justify-center h-96">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lorcana-gold" aria-label="Loading"></div>
  </div>
);

const NotFound = () => (
  <div className="flex flex-col items-center justify-center text-center h-96 gap-4 px-4">
    <h1 className="text-2xl font-bold text-lorcana-ink">Page not found</h1>
    <p className="text-lorcana-navy">There's nothing at this address.</p>
    <Link to="/cards" className="btn-lorcana-gold">Browse cards</Link>
  </div>
);

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginModal = useModal();
  const profileModal = useModal();
  const legalModal = useModal();
  const dataAttributionModal = useModal();
  const avatarModal = useModal();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userProfile, createOrUpdateProfile } = useProfile();
  const { isEditingDeck, currentDeck, stopEditingDeck, removeCardFromDeck, updateCardQuantity, updateDeck, validateDeck, deleteDeck, allUserTags } = useDeck();


  // Hide mobile navigation when deck sidebar is expanded
  const shouldHideNavigation = isEditingDeck && !sidebarCollapsed;
  
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

  const handleUpdateDeckTags = (tags: string[]) => {
    if (currentDeck) {
      updateDeck({
        ...currentDeck,
        tags,
        updatedAt: new Date()
      });
    }
  };



  return (
    <div className="min-h-screen bg-lorcana-cream">
          {/* Mobile Header - Full Width */}
          <div className={`sm:hidden bg-gradient-to-br from-lorcana-navy via-lorcana-purple to-lorcana-navy shadow-xl relative overflow-hidden transition-all duration-300 ease-in-out ${
            isEditingDeck && !sidebarCollapsed ? 'lg:mr-80 xl:mr-80' : ''
          }`}>
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
                  onAvatarClick={() => avatarModal.open()}
                />
              </div>
            </header>
          </div>

          {/* Desktop Header and TabBar Container - Combined with continuous pattern */}
          <div className={`hidden sm:block bg-gradient-to-br from-lorcana-navy via-lorcana-purple to-lorcana-navy shadow-xl relative overflow-hidden transition-all duration-300 ease-in-out ${
            isEditingDeck && !sidebarCollapsed ? 'lg:mr-80 xl:mr-80' : ''
          }`}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-32 h-32 bg-lorcana-gold transform rotate-45 -translate-x-16 -translate-y-16"></div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-lorcana-gold rounded-full -translate-y-8 -translate-x-4"></div>
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
              <div className="absolute top-4 right-6 z-50">
                <AuthSection
                  onLoginClick={() => loginModal.open()}
                  onProfileClick={() => profileModal.open()}
                  onAvatarClick={() => avatarModal.open()}
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
                        { id: 'cards', label: 'Cards', icon: Layers3, path: '/cards' },
                        { id: 'collections', label: 'Collections', icon: BookOpen, path: '/collections' },
                        { id: 'decks', label: 'Decks', icon: Package, path: '/decks' },
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
          <div className={`transition-all duration-300 ease-in-out ${
            isEditingDeck && !sidebarCollapsed ? 'lg:mr-80 xl:mr-80' : ''
          }`}>
            <main className="pb-20 sm:pb-10">
              <Suspense fallback={<PageLoading />}>
                <Routes>
                  <Route path="/" element={<CardBrowser />} />
                  <Route path="/cards" element={<CardBrowser />} />
                  <Route path="/collections" element={<Collections />} />
                  <Route path="/collection/binder/custom/:customBinderId" element={<SetBinder />} />
                  <Route path="/collection/binder/:setCode" element={<SetBinder />} />
                  <Route path="/binder/:binderId" element={<SetBinder />} />
                  <Route path="/decks" element={<MyDecks onBuildDeck={() => {}} onViewDeck={(deckId: string) => navigate(`/decks/${deckId}`)} />} />
                  <Route path="/decks/:deckId" element={<DeckSummary onBack={() => navigate('/decks')} onEditDeck={() => {}} />} />
                  <Route path="/community" element={<UsersComponent onViewProfile={(userId: string) => navigate(`/community/${userId}`)} />} />
                  <Route path="/community/:userId" element={<UserProfileComponent onBack={() => navigate('/community')} />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
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
            onUpdateDeckTags={handleUpdateDeckTags}
            allUserTags={allUserTags}
            deckValidation={currentDeck ? validateDeck(currentDeck) : { isValid: false, errors: [] }}
          />

          {/* Mobile Navigation - scroll responsive */}
          <Navigation
            shouldHideNavigation={shouldHideNavigation}
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

          {/* User Avatar Editor Modal */}
          <AvatarEditor
            isOpen={avatarModal.isOpen}
            onClose={avatarModal.close}
            title="Choose Profile Avatar"
            onSave={async (avatarData) => {
              if (!userProfile) return;
              try {
                await createOrUpdateProfile({
                  ...userProfile,
                  avatarCardId: avatarData.cardId,
                  avatarCropData: avatarData.cropData
                });
                avatarModal.close();
              } catch (error) {
                console.error('Error updating user avatar:', error);
              }
            }}
            currentAvatar={userProfile?.avatarCardId && userProfile?.avatarCropData ? {
              cardId: userProfile.avatarCardId,
              cropData: userProfile.avatarCropData
            } : undefined}
          />
        </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ProfileProvider>
          <CardDataProvider>
            <CollectionProvider>
              <DeckProvider>
                <BinderProvider>
                  <Router>
                    <AppContent />
                    <ToastContainer />
                  </Router>
                </BinderProvider>
              </DeckProvider>
            </CollectionProvider>
          </CardDataProvider>
        </ProfileProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
