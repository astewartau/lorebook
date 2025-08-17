import React, { useState, useEffect } from 'react';
import { Bell, Users, X, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from '../contexts/CollectionContext';
import { groupService, Notification } from '../services/groupService';


interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
}


const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ 
  isOpen, 
  onClose, 
  onMarkAllRead 
}) => {
  const { user } = useAuth();
  const { reloadCollection } = useCollection();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const [showAcceptConfirmation, setShowAcceptConfirmation] = useState(false);
  const [inviteToAccept, setInviteToAccept] = useState<any>(null);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [showGroupError, setShowGroupError] = useState(false);
  const [currentUserGroup, setCurrentUserGroup] = useState<any>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadNotifications();
      loadPendingInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    const subscription = groupService.subscribeToNotifications(user.id, (notification) => {
      setNotifications(prev => [notification, ...prev]);
      // If it's a group invite, reload invitations
      if (notification.type === 'group_invite') {
        loadPendingInvitations();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await groupService.getNotifications(user.id);
      setNotifications(data);
      
      // Check if there are unread notifications beyond what we're showing
      const unreadCount = data.filter(n => !n.is_read).length;
      // If all shown notifications are unread and we're showing exactly 10, there might be more
      setHasMoreNotifications(unreadCount >= 10);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingInvitations = async () => {
    if (!user) return [];
    try {
      const invites = await groupService.getPendingInvitations(user.id);
      console.log('Loaded pending invitations:', invites); // Debug log
      setPendingInvitations(invites);
      return invites;
    } catch (error) {
      console.error('Error loading invitations:', error);
      return [];
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'group_invite':
      case 'group_join':
        return <Users size={16} className="text-lorcana-gold" />;
      default:
        return <Bell size={16} className="text-lorcana-gold" />;
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 1000 * 60) return 'Just now';
    if (diff < 1000 * 60 * 60) return `${Math.floor(diff / (1000 * 60))}m ago`;
    if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / (1000 * 60 * 60))}h ago`;
    return `${Math.floor(diff / (1000 * 60 * 60 * 24))}d ago`;
  };

  const handleAcceptInvite = async (invitation: any) => {
    if (!user) return;
    
    // Check if user is already in a group
    const userGroup = await groupService.getUserGroup(user.id);
    if (userGroup) {
      setCurrentUserGroup(userGroup);
      setShowGroupError(true);
    } else {
      setInviteToAccept(invitation);
      setShowAcceptConfirmation(true);
    }
  };

  const confirmAcceptInvite = async () => {
    if (!user || !inviteToAccept) return;
    
    setShowAcceptConfirmation(false);
    setProcessingInvite(inviteToAccept.id);
    try {
      const result = await groupService.acceptInvitation(inviteToAccept.id, user.id);
      if (result.success) {
        // Remove from pending invitations
        setPendingInvitations(prev => prev.filter(inv => inv.id !== inviteToAccept.id));
        // Mark related notification as read
        const notif = notifications.find(n => 
          n.type === 'group_invite' && n.data?.invitation_id === inviteToAccept.id
        );
        if (notif) {
          await handleMarkRead(notif.id);
        }
        // Reload notifications
        loadNotifications();
        // Reload collection to show group collection immediately
        await reloadCollection();
      } else {
        // Show error message to user
        setAcceptError(result.error || 'Failed to join group. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    } finally {
      setProcessingInvite(null);
      setInviteToAccept(null);
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
    if (!user) return;
    setProcessingInvite(invitationId);
    try {
      const result = await groupService.declineInvitation(invitationId, user.id);
      if (result.success) {
        // Remove from pending invitations
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        // Mark related notification as read
        const notif = notifications.find(n => 
          n.type === 'group_invite' && n.data?.invitation_id === invitationId
        );
        if (notif) {
          await handleMarkRead(notif.id);
        }
        // Reload notifications
        loadNotifications();
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await groupService.markNotificationRead(notificationId, user.id);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await groupService.markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      onMarkAllRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div className="absolute top-full right-0 mt-2 w-80 bg-lorcana-navy border border-lorcana-gold/30 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-lorcana-gold/20">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lorcana-cream">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-lorcana-gold hover:text-lorcana-cream transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="border-b border-lorcana-gold/20 p-4">
            <h4 className="text-sm font-medium text-lorcana-cream mb-2">Pending Invitations</h4>
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="bg-lorcana-purple/20 rounded-lg p-3">
                  <p className="text-sm text-lorcana-cream mb-2">
                    <span className="font-medium">{invitation.inviter?.display_name || 'Someone'}</span> invited you to join
                    <span className="font-medium"> "{invitation.collection_groups?.name}"</span>
                  </p>
                  <button
                    onClick={() => handleAcceptInvite(invitation)}
                    className="flex items-center gap-1 px-3 py-1 bg-lorcana-gold text-lorcana-navy text-xs rounded hover:bg-lorcana-gold/90 transition-colors"
                  >
                    View invitation
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center">
              <Loader2 className="mx-auto mb-2 text-lorcana-gold animate-spin" size={24} />
              <p className="text-lorcana-cream/60">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-lorcana-cream/60">
              <Bell size={24} className="mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-lorcana-gold/10 last:border-b-0 ${
                  !notification.is_read ? 'bg-lorcana-purple/10' : ''
                } hover:bg-lorcana-purple/20 transition-colors cursor-pointer`}
                onClick={() => !notification.is_read && handleMarkRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-8 h-8 bg-lorcana-gold/20 rounded-full flex items-center justify-center mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-lorcana-cream">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-lorcana-cream/80 mt-1">
                          {notification.message}
                        </p>
                      </div>
                      
                      {/* Timestamp & read status */}
                      <div className="flex flex-col items-end ml-2">
                        <span className="text-xs text-lorcana-cream/50">
                          {formatTimestamp(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-1"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Indicator for more unread notifications */}
        {hasMoreNotifications && (
          <div className="p-3 border-t border-lorcana-gold/20 bg-yellow-900/20 text-center">
            <p className="text-sm text-yellow-200">
              <AlertTriangle size={14} className="inline mr-1" />
              You have more unread notifications - mark some as read to see older ones
            </p>
          </div>
        )}
      </div>

      {/* Accept Invitation Confirmation Modal */}
      {showAcceptConfirmation && inviteToAccept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 100 }}>
          <div className="bg-lorcana-navy rounded-lg border-2 border-lorcana-gold w-full max-w-md">
            <div className="p-6 space-y-6 relative">
              {/* Close button */}
              <button
                onClick={() => {
                  setShowAcceptConfirmation(false);
                  setInviteToAccept(null);
                }}
                className="absolute top-2 right-2 text-lorcana-cream/60 hover:text-lorcana-cream transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold text-lorcana-cream mb-2">Join Group?</h3>
                <p className="text-lorcana-cream/80 text-sm max-w-md mx-auto">
                  <span className="font-medium">{inviteToAccept.inviter?.display_name || 'Someone'}</span> has invited you to join 
                  <span className="font-medium"> "{inviteToAccept.collection_groups?.name}"</span>.
                </p>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="font-medium text-yellow-200 mb-1">What happens when you accept:</h4>
                    <ul className="text-sm text-yellow-200/80 space-y-1">
                      <li>• You'll join the group and work with the shared collection</li>
                      <li>• Your personal collection will be preserved but not accessible while in the group</li>
                      <li>• All group members can see and manage the shared collection</li>
                      <li>• You can leave the group later to return to your personal collection</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setShowAcceptConfirmation(false);
                    if (inviteToAccept) {
                      await handleDeclineInvite(inviteToAccept.id);
                    }
                    setInviteToAccept(null);
                  }}
                  className="flex-1 py-2 px-4 border border-red-600/50 text-red-200 rounded-lg hover:bg-red-900/20 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={confirmAcceptInvite}
                  disabled={processingInvite === inviteToAccept.id}
                  className="flex-1 py-2 px-4 bg-lorcana-gold text-lorcana-navy rounded-lg hover:bg-lorcana-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingInvite === inviteToAccept.id ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Accepting...
                    </>
                  ) : (
                    'Accept'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal - Already in a Group */}
      {showGroupError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 100 }}>
          <div className="bg-lorcana-navy rounded-lg border-2 border-lorcana-gold w-full max-w-md">
            <div className="p-6 space-y-6 relative">
              {/* Close button */}
              <button
                onClick={() => {
                  setShowGroupError(false);
                  setCurrentUserGroup(null);
                }}
                className="absolute top-2 right-2 text-lorcana-cream/60 hover:text-lorcana-cream transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold text-lorcana-cream mb-2">Already in a Group</h3>
                <p className="text-lorcana-cream/80 text-sm max-w-md mx-auto">
                  You're currently in the group <span className="font-medium">"{currentUserGroup?.name}"</span>.
                </p>
                <p className="text-lorcana-cream/80 text-sm max-w-md mx-auto mt-2">
                  Please leave your current group before accepting a new invitation.
                </p>
              </div>

              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Users className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="font-medium text-blue-200 mb-1">How to leave your group:</h4>
                    <ol className="text-sm text-blue-200/80 space-y-1 list-decimal list-inside">
                      <li>Open the Collection Group modal</li>
                      <li>Click "Leave Group" or "Disband Group"</li>
                      <li>Confirm your choice</li>
                      <li>Then you can accept this invitation</li>
                    </ol>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowGroupError(false);
                  setCurrentUserGroup(null);
                }}
                className="w-full py-2 px-4 bg-lorcana-gold text-lorcana-navy rounded-lg hover:bg-lorcana-gold/90 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal - Failed to Accept */}
      {acceptError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 100 }}>
          <div className="bg-lorcana-navy rounded-lg border-2 border-lorcana-gold w-full max-w-md">
            <div className="p-6 space-y-6 relative">
              {/* Close button */}
              <button
                onClick={() => setAcceptError(null)}
                className="absolute top-2 right-2 text-lorcana-cream/60 hover:text-lorcana-cream transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-lorcana-cream mb-2">Failed to Join Group</h3>
                <p className="text-lorcana-cream/80 text-sm max-w-md mx-auto">
                  {acceptError}
                </p>
              </div>

              <button
                onClick={() => setAcceptError(null)}
                className="w-full py-2 px-4 bg-lorcana-gold text-lorcana-navy rounded-lg hover:bg-lorcana-gold/90 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationDropdown;