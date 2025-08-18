import React, { useState, useRef, useEffect } from 'react';
import { Search, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserSearchResult {
  id: string;
  user_id: string;
  displayName: string;
  fullName?: string;
  avatarUrl?: string;
  isPublic: boolean;
}

interface UserSearchInputProps {
  onUserSelect: (user: UserSearchResult) => void;
  placeholder?: string;
  excludeUserIds?: string[];
}

// Search users from Supabase
const searchUsers = async (searchTerm: string, excludeUserIds: string[]): Promise<UserSearchResult[]> => {
  if (searchTerm.trim().length < 2) return [];
  
  try {
    let query = supabase
      .from('user_profiles')
      .select('id, user_id, display_name, full_name, avatar_url, is_public')
      .or(`display_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      .eq('is_public', true)
      .limit(5);

    // Exclude users if provided
    if (excludeUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return (data || []).map(user => ({
      id: user.id,
      user_id: user.user_id,
      displayName: user.display_name,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      isPublic: user.is_public
    }));
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

const UserSearchInput: React.FC<UserSearchInputProps> = ({ 
  onUserSelect, 
  placeholder = "Search for community members...",
  excludeUserIds = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<UserSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search users based on search term
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchTerm.trim().length < 2) {
        setFilteredUsers([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchUsers(searchTerm, excludeUserIds);
        setFilteredUsers(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setFilteredUsers([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, excludeUserIds]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredUsers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredUsers.length) {
          handleUserSelect(filteredUsers[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleUserSelect = (user: UserSearchResult) => {
    onUserSelect(user);
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(-1);
    setIsLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-lorcana-purple/20 border border-lorcana-gold/30 rounded-lg text-lorcana-cream placeholder-lorcana-cream/50 focus:outline-none focus:border-lorcana-gold"
        />
        
        {/* Search icon */}
        <Search 
          size={16} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lorcana-cream/50" 
        />
        
        {/* Clear button */}
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-lorcana-cream/50 hover:text-lorcana-cream transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {(isOpen || isLoading) && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-lorcana-navy border border-lorcana-gold/30 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-center text-lorcana-cream/60">
              <div className="animate-spin h-4 w-4 border-2 border-lorcana-gold border-t-transparent rounded-full mx-auto mb-2"></div>
              Searching...
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => handleUserSelect(user)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-lorcana-purple/20 transition-colors border-b border-lorcana-gold/10 last:border-b-0 ${
                index === selectedIndex ? 'bg-lorcana-purple/30' : ''
              }`}
            >
              {/* Avatar placeholder */}
              <div className="w-8 h-8 bg-lorcana-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <User size={16} className="text-lorcana-gold" />
                )}
              </div>
              
              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="text-lorcana-cream font-medium truncate">
                  {user.displayName}
                </div>
                {user.fullName && user.fullName !== user.displayName && (
                  <div className="text-lorcana-cream/60 text-sm truncate">
                    {user.fullName}
                  </div>
                )}
              </div>
              
              {/* Privacy indicator */}
              {!user.isPublic && (
                <div className="text-xs bg-lorcana-purple/40 text-lorcana-cream/80 px-2 py-1 rounded">
                  Private
                </div>
              )}
            </button>
            ))
          ) : (
            <div className="px-4 py-3 text-center text-lorcana-cream/60">
              No users found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearchInput;