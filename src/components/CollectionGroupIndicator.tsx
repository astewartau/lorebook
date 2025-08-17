import React, { useState, useEffect } from 'react';
import { Users, Crown, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from '../contexts/CollectionContext';
import { groupService, CollectionGroup, GroupMember } from '../services/groupService';

interface CollectionGroupIndicatorProps {
  onOpenSettings: () => void;
}

const CollectionGroupIndicator: React.FC<CollectionGroupIndicatorProps> = ({ onOpenSettings }) => {
  const { user } = useAuth();
  const { collection } = useCollection();
  const [currentGroup, setCurrentGroup] = useState<CollectionGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupStats, setGroupStats] = useState({ totalCards: 0, uniqueCards: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'owner' | 'member' | null>(null);

  useEffect(() => {
    if (user) {
      loadGroupData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadGroupData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Check if user is in a group
      const group = await groupService.getUserGroup(user.id);
      if (group) {
        setCurrentGroup(group);
        
        // Load group members and stats
        const [members, stats] = await Promise.all([
          groupService.getGroupMembers(group.id),
          groupService.getGroupStats(group.id)
        ]);
        
        setGroupMembers(members);
        setGroupStats(stats);
        
        // Find user's role in the group
        const userMember = members.find(m => m.user_id === user.id);
        setUserRole(userMember?.role || null);
      } else {
        setCurrentGroup(null);
        setGroupMembers([]);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate personal collection stats when not in a group
  const personalStats = {
    totalCards: collection.reduce((sum, item) => 
      sum + (item.quantityNormal || 0) + (item.quantityFoil || 0), 0
    ),
    uniqueCards: collection.length
  };

  if (isLoading) {
    return (
      <div className="bg-lorcana-purple/20 border border-lorcana-gold/30 rounded-lg p-3">
        <div className="flex items-center justify-center">
          <Loader2 className="animate-spin text-lorcana-gold" size={16} />
          <span className="ml-2 text-sm text-lorcana-cream/60">Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentGroup) {
    // Individual collection state
    return (
      <div className="bg-lorcana-purple/20 border border-lorcana-gold/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-lorcana-gold/20 rounded-full flex items-center justify-center">
              <Users size={16} className="text-lorcana-cream/60" />
            </div>
            <div>
              <div className="text-sm font-medium text-lorcana-cream">Personal Collection</div>
              <div className="text-xs text-lorcana-cream/60">
                {personalStats.totalCards} total cards • {personalStats.uniqueCards} unique cards
              </div>
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="text-lorcana-gold hover:text-lorcana-cream transition-colors p-1"
            title="Collection Groups"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Group collection state
  return (
    <div className="bg-lorcana-navy border border-lorcana-gold/50 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-lorcana-gold/30 rounded-full flex items-center justify-center">
            {userRole === 'owner' ? (
              <Crown size={16} className="text-lorcana-gold" />
            ) : (
              <Users size={16} className="text-lorcana-gold" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-lorcana-cream flex items-center gap-2">
              {currentGroup.name}
              <span className="text-xs bg-lorcana-gold/20 text-lorcana-gold px-2 py-0.5 rounded-full">
                {groupMembers.length} members
              </span>
            </div>
            <div className="text-xs text-lorcana-cream/80">
              Shared collection • {groupStats.totalCards} total cards • {groupStats.uniqueCards} unique cards
            </div>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="text-lorcana-gold hover:text-lorcana-cream transition-colors p-1"
          title="Manage Group"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
};

export default CollectionGroupIndicator;