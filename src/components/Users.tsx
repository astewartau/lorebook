import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import TabBar from './TabBar';

interface UsersProps {
  onViewProfile: (userId: string) => void;
}

const Users: React.FC<UsersProps> = ({ onViewProfile }) => {
  const { allProfiles, loadAllProfiles, searchProfiles } = useProfile();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAllProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only load on mount

  useEffect(() => {
    if (searchTerm) {
      searchProfiles(searchTerm);
    } else {
      loadAllProfiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // Only run when searchTerm changes

  // Since searchProfiles already filters on the server, just use allProfiles directly
  const displayProfiles = allProfiles;

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div>
      {/* Tab Bar */}
      <TabBar />

      <div className="container mx-auto px-2 sm:px-4 py-6 space-y-6">
        {/* Search Bar */}
        <div className="card-lorcana p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lorcana-navy" size={20} />
          <input
            type="text"
            placeholder="Search community by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream"
          />
        </div>
      </div>


      {/* Users Grid */}
      {displayProfiles.length === 0 ? (
            <div className="card-lorcana p-12 text-center">
              <p className="text-lorcana-navy">
                {searchTerm ? 'No community members found matching your search.' : 'No community members found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayProfiles.map(profile => (
                <div 
                  key={profile.id} 
                  className="card-lorcana p-6 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 art-deco-corner-sm"
                  onClick={() => onViewProfile(profile.userId)}
                >
                  {/* Mini Art Deco Header */}
                  <div className="relative bg-gradient-to-r from-lorcana-navy to-lorcana-purple p-4 -m-6 mb-4 text-white">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-lorcana-gold rounded-full -translate-y-2 translate-x-2"></div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-lorcana-gold rounded-full flex items-center justify-center border-2 border-white shadow-md">
                        {profile.avatarUrl ? (
                          <img 
                            src={profile.avatarUrl} 
                            alt={profile.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-lorcana-navy">
                            {profile.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-bold text-lorcana-gold text-lg leading-tight">
                          {profile.displayName}
                        </h3>
                        {profile.fullName && (
                          <p className="text-sm text-lorcana-cream opacity-90">
                            {profile.fullName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="space-y-3">
                    {profile.bio && (
                      <p className="text-sm text-lorcana-navy leading-relaxed line-clamp-3">
                        {profile.bio}
                      </p>
                    )}
                    
                    <div className="flex flex-col space-y-2 text-xs text-lorcana-purple">
                      {profile.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin size={12} />
                          <span>{profile.location}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>Joined {formatDate(profile.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* View Profile Button */}
                  <div className="mt-4 pt-4 border-t border-lorcana-gold/20">
                    <button className="btn-lorcana-gold-sm w-full text-sm">
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default Users;