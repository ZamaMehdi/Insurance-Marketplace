import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import apiService from '../services/api';
import { 
  Shield, 
  TrendingUp,
  Clock,
  DollarSign, 
  Plus,
  RefreshCw,
  MessageSquare,
  MessageCircle,
  Eye,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  
  // Add a ref to track if data has been loaded
  const dataLoadedRef = useRef(false);
  
  // Add a ref to track if we're currently loading data
  const isLoadingRef = useRef(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [dashboardNotifications, setDashboardNotifications] = useState([]);
  const [activeChats, setActiveChats] = useState([]);

  // Load dashboard data when user changes
  useEffect(() => {
    console.log('🔍 Dashboard useEffect triggered with:', { 
      hasUser: !!user, 
      userRole: user?.role,
      authLoading, 
      dataAlreadyLoaded: dataLoadedRef.current 
    });
    
    // Only run once when user is loaded and auth is complete
    if (user && !authLoading && !dataLoadedRef.current) {
      console.log('✅ Dashboard useEffect - user loaded, setting up dashboard');
      // Don't mark as loaded yet - wait for successful data loading
      loadDashboardData();
    } else {
      console.log('⏳ Dashboard useEffect - waiting for user or auth to complete:', { 
        hasUser: !!user, 
        authLoading, 
        dataAlreadyLoaded: dataLoadedRef.current
      });
    }
  }, [user, authLoading]); // Only depend on user and authLoading

  // Setup socket listeners when user and socket are available
  useEffect(() => {
    if (user && socket) {
      console.log('Dashboard: Setting up socket listeners');
      setupSocketListeners();
    }
  }, [user, socket]);

  // Debug useEffect to monitor state changes
  useEffect(() => {
    console.log('🔍 Dashboard Debug - State changed:', {
      hasUser: !!user,
      userType: user ? typeof user : 'null',
      userKeys: user ? Object.keys(user) : 'null',
      authLoading,
      isLoading
    });

    // Reset loading state if it gets stuck for too long
    if (isLoading) {
      const timeout = setTimeout(() => {
        if (isLoading) {
          console.log('⚠️ Dashboard: Loading state stuck for 10 seconds, resetting...');
          setIsLoading(false);
        }
      }, 10000); // 10 seconds timeout

      return () => clearTimeout(timeout);
    }
  }, [user, authLoading, isLoading]);



  const setupSocketListeners = () => {
    // Safety check - if user is null, don't proceed
    if (!user) {
      console.log('User is null, skipping socket setup');
      return;
    }

    // Get the actual user ID from the nested structure
    const userId = user?.user?._id || user?._id;
    
    if (!userId) {
      console.log('User ID not found, skipping socket setup');
      return;
    }

    if (socket) {
      // Listen for new insurance requests
      socket.on('insurance_request_notification', (data) => {
        console.log('Dashboard: New insurance request notification:', data);
        toast.success(`New insurance request: ${data.title}`);
        loadDashboardData();
      });

      // Listen for new bids
      socket.on('bid_notification', (data) => {
        console.log('Dashboard: New bid notification:', data);
        toast.success(`New bid received: $${data.amount?.toLocaleString()}`);
        loadDashboardData();
      });

      // Listen for bid acceptance notifications
      socket.on('bid_accepted_notification', (data) => {
        console.log('Dashboard: Bid accepted notification:', data);
        toast.success(`Your bid was accepted: ${data.message}`);
        loadDashboardData();
      });

      // Listen for new messages
      socket.on('new_message', (data) => {
        console.log('Dashboard: New message notification:', data);
        toast.success('New message received');
        loadDashboardData();
      });

      return () => {
        socket.off('insurance_request_notification');
        socket.off('bid_notification');
        socket.off('new_message');
      };
    }
  };

  const loadDashboardData = async () => {
    console.log('🚀 loadDashboardData function called!');
    
    // Prevent duplicate calls using ref instead of state
    if (isLoadingRef.current) {
      console.log('Dashboard: Already loading data (ref), skipping duplicate call');
      return;
    }
    
    // Safety check - ensure user is properly authenticated
    if (!user || !user._id) {
      console.log('Dashboard: User not authenticated, skipping data load');
      return;
    }
    
    // Set loading ref immediately to prevent duplicate calls
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      console.log('🚀 Dashboard: Starting to load dashboard data...');
      console.log('Dashboard: Loading dashboard data for user:', user);
      console.log('Dashboard: User object structure:', JSON.stringify(user, null, 2));
      console.log('Dashboard: User ID:', user?._id, 'User.user ID:', user?.user?._id);
      
      // Get the actual user ID from the nested structure
      const userId = user?.user?._id || user?._id;
      
      if (!userId) {
        console.error('Dashboard: No user ID found in user object');
        console.error('Dashboard: User object keys:', Object.keys(user || {}));
        console.error('Dashboard: User.user object keys:', Object.keys(user?.user || {}));
        toast.error('User ID not found. Please log in again.');
        return;
      }

      console.log('✅ Dashboard: User ID extracted successfully:', userId);
      
      // Fetch statistics
      console.log('📊 Dashboard: Fetching user dashboard stats...');
      const statsRes = await apiService.getUserDashboardStats(userId);
      console.log('📊 Dashboard: Stats response:', statsRes);
      console.log('📊 Dashboard: Stats data structure:', JSON.stringify(statsRes.data, null, 2));
      console.log('📊 Dashboard: Stats data keys:', Object.keys(statsRes.data || {}));
      setStats(statsRes.data || {});

      // Fetch recent requests
      console.log('📋 Dashboard: Fetching user insurance requests...');
      let requestsRes;
      if (user?.role === 'provider') {
        // For providers: get requests they've bid on
        console.log('📋 Dashboard: Provider - fetching requests with bids...');
        requestsRes = await apiService.getProviderBidRequests(userId, 5);
        setRecentRequests(requestsRes.data || []);
      } else {
        // For clients: get requests they've created
        requestsRes = await apiService.getUserInsuranceRequests(userId, 5);
        setRecentRequests(requestsRes.data || []);
      }
      console.log('📋 Dashboard: Requests response:', requestsRes);
      console.log('📋 Dashboard: Request data details:', JSON.stringify(requestsRes.data, null, 2));

      // Fetch recent bids
      console.log('💰 Dashboard: Fetching user bids...');
      const bidsRes = await apiService.getUserBids(userId, 5, user?.role);
      console.log('💰 Dashboard: Bids response:', bidsRes);
      setRecentBids(bidsRes.data || []);

      // Fetch recent chats
      console.log('💬 Dashboard: Fetching user chat rooms...');
      const chatsRes = await apiService.getUserChatRooms(userId, 3);
      console.log('💬 Dashboard: Chats response:', chatsRes);
      setRecentChats(chatsRes.data || []);

      // Fetch unread message count
      console.log('📨 Dashboard: Fetching unread message count...');
      const unreadCountRes = await apiService.getUserUnreadMessageCount(userId);
      console.log('📨 Dashboard: Unread count response:', unreadCountRes);
      setUnreadMessageCount(unreadCountRes.data || 0);

      // Fetch notifications
      console.log('🔔 Dashboard: Fetching user notifications...');
      const notificationsRes = await apiService.getUserNotifications(userId, 5);
      console.log('🔔 Dashboard: Notifications response:', notificationsRes);
      setDashboardNotifications(notificationsRes.data || []);

      // Fetch active chats
      console.log('💬 Dashboard: Fetching user active chats...');
      const activeChatsRes = await apiService.getUserActiveChats(userId, 3);
      console.log('💬 Dashboard: Active chats response:', activeChatsRes);
      setActiveChats(activeChatsRes.data || []);

      console.log('✅ Dashboard: All data loaded successfully!');
      
      // Mark as loaded only after successful completion
      dataLoadedRef.current = true;
      
    } catch (error) {
      console.error('❌ Dashboard: Error loading dashboard data:', error);
      console.error('❌ Dashboard: Error details:', {
        message: error.message,
        stack: error.stack
      });
      toast.error('Failed to load dashboard data.');
      setStats({});
      setRecentRequests([]);
      setRecentBids([]);
      setRecentChats([]);
      setDashboardNotifications([]);
      setActiveChats([]);
      
      // Don't mark as loaded if there was an error - allow retry
      dataLoadedRef.current = false;
    } finally {
      console.log('🏁 Dashboard: Setting loading to false');
      setIsLoading(false);
      isLoadingRef.current = false; // Reset the loading ref
    }
  };

  const handleResetData = async () => {
    if (window.confirm('Are you sure you want to reset all data to initial state? This will clear all your requests, bids, and accepted offers.')) {
      try {
        // Clear data via API
        await apiService.deleteUserData();
        toast.success('Data reset successfully!');
        loadDashboardData();
      } catch (error) {
        console.error('Error resetting data:', error);
        toast.error('Failed to reset data.');
      }
    }
  };

  const handleRefreshDashboard = async () => {
    console.log('🔄 Manual dashboard refresh triggered');
    console.log('🔄 Current state before refresh:', {
      recentRequests: recentRequests.length,
      recentBids: recentBids.length,
      stats: stats
    });
    dataLoadedRef.current = false; // Reset the ref
    await loadDashboardData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'bidding':
        return 'text-green-600 bg-green-100';
      case 'draft':
        return 'text-gray-600 bg-gray-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
      case 'awarded':
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'bidding':
        return 'Bidding Open';
      case 'draft':
        return 'Draft';
      case 'expired':
        return 'Expired';
      case 'awarded':
        return 'Awarded';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return formatDate(dateString);
  };

  // Authentication check removed for development

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Safety check to ensure user exists
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading User Data</h2>
          <p className="text-gray-600">Please wait while we load your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
            <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.user?.profile?.firstName || 'User'}!</h1>
            <p className="text-gray-600 mt-2">
              {user?.role === 'provider' 
                ? "Here's what's happening with your insurance offers and bids" 
                : "Here's what's happening with your insurance requests"
              }
            </p>
            </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefreshDashboard}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Refresh
            </button>
                <button
              onClick={() => {
                console.log('🔄 Manual reset button clicked');
                dataLoadedRef.current = false; // Allow data to be reloaded
                setIsLoading(false);
                setStats({});
                setRecentRequests([]);
                setRecentBids([]);
                setRecentChats([]);
                setDashboardNotifications([]);
                setActiveChats([]);
                toast.success('Dashboard reset manually');
              }}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              🔄 Reset
                </button>
                <button
              onClick={() => {
                if (user?.role === 'provider') {
                  // Navigate to post offer page for providers
                  navigate('/post-insurance-offer');
                } else {
                  // Navigate to create request page for clients
                  navigate('/insurance-request/new');
                }
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {user?.role === 'provider' ? '📝 Post Offer' : '+ New Request'}
                </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {user.role === 'provider' ? 'Active Offers' : 'Active Requests'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeItems || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {user.role === 'provider' ? 'Total Bids' : 'Total Bids Received'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBids || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Actions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingActions || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {user.role === 'provider' ? 'Total Value' : 'Total Coverage'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalCoverage || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Requests */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Requests</h3>
              <Link to="/insurance-requests" className="text-blue-600 hover:text-blue-700 text-sm">
                View All
              </Link>
            </div>
            {recentRequests.length > 0 ? (
              <div className="space-y-3">
                {recentRequests.slice(0, 3).map((request) => (
                  <div key={request._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{request.title}</p>
                      <p className="text-gray-500 text-xs">{request.status}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No recent requests</p>
            )}
          </div>

          {/* Recent Messages */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
              <div className="flex items-center space-x-2">
                {unreadMessageCount > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {unreadMessageCount} unread
                  </span>
                )}
                <span className="text-xs text-gray-500">Click to open chat</span>
              </div>
            </div>
            {recentChats.length > 0 ? (
              <div className="space-y-3">
                {recentChats.slice(0, 3).map((chat) => {
                  const lastMessage = chat.lastMessage || {};
                  const userId = user?.user?._id || user?._id;
                  const otherParticipant = chat.participants?.find(id => id !== userId) || {};
                  const isUnread = lastMessage && !lastMessage.read && lastMessage.senderId !== userId;
                  
                  // Get provider name from the chat data
                  let providerName = 'Provider';
                  if (chat.participants && Array.isArray(chat.participants)) {
                    const otherParticipant = chat.participants.find(p => p._id !== userId);
                    if (otherParticipant) {
                      if (otherParticipant.role === 'provider') {
                        // For providers, show company name or full name
                        providerName = otherParticipant.profile?.companyName || 
                                      `${otherParticipant.profile?.firstName || ''} ${otherParticipant.profile?.lastName || ''}`.trim() || 
                                      'Provider';
                      } else {
                        // For clients, show full name
                        providerName = `${otherParticipant.profile?.firstName || ''} ${otherParticipant.profile?.lastName || ''}`.trim() || 'Client';
                      }
                    }
                  }
                  
                  return (
                    <div 
                      key={chat._id} 
                      onClick={() => navigate(`/chat/${chat._id}`)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${
                        isUnread ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${isUnread ? 'text-blue-900' : 'text-gray-900'}`}>
                          Chat with {providerName}
                        </p>
                        {lastMessage && lastMessage.content && (
                          <p className={`text-xs ${isUnread ? 'text-blue-700' : 'text-gray-500'}`}>
                            {lastMessage.content.substring(0, 50)}...
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {lastMessage && (
                          <span className="text-xs text-gray-400">
                            {new Date(lastMessage.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                        {isUnread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 ml-auto"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No recent messages</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Requests/Offers */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent {user.role === 'provider' ? 'Insurance Requests' : 'Your Requests'}
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {recentRequests.length === 0 ? (
                  <div className="p-6 text-center">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {user.role === 'provider' 
                        ? 'No insurance requests available yet.' 
                        : 'You haven\'t created any insurance requests yet.'
                      }
                    </p>
                  </div>
                ) : (
                  recentRequests.map((request) => (
                    <div key={request._id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {request.title}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                              {getStatusText(request.status)}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.priority)}`}>
                              {request.priority}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Coverage:</span>
                              <div className="font-medium">
                                {request.insuranceDetails?.requestedAmount 
                                  ? formatCurrency(request.insuranceDetails.requestedAmount, request.insuranceDetails?.currency || 'USD')
                                  : 'Not specified'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Duration:</span>
                              <div className="font-medium">
                                {request.insuranceDetails?.duration 
                                  ? `${request.insuranceDetails.duration} months`
                                  : 'Not specified'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <div className="font-medium">
                                {request.assetDetails?.location?.city && request.assetDetails?.location?.country
                                  ? `${request.assetDetails.location.city}, ${request.assetDetails.location.country}`
                                  : request.assetDetails?.location?.city || request.assetDetails?.location?.country || 'Not specified'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Deadline:</span>
                              <div className="font-medium">
                                {request.biddingDetails?.deadline && !isNaN(new Date(request.biddingDetails.deadline).getTime())
                                  ? formatDate(request.biddingDetails.deadline)
                                  : 'Not specified'
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => navigate(`/request-detail/${request._id}`)}
                            className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {recentRequests.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={() => navigate(user.role === 'provider' ? '/marketplace' : '/insurance-requests')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                  >
                    View All {user.role === 'provider' ? 'Requests' : 'Your Requests'}
                    <CheckCircle className="h-4 w-4 ml-1" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Bids */}
            {user.role === 'client' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Bids</h3>
                </div>
                
                <div className="p-6">
                  {recentBids.length === 0 ? (
                    <p className="text-gray-500 text-sm">No bids received yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {recentBids.slice(0, 3).map((bid) => (
                        <div key={bid._id} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {bid.providerName}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatCurrency(bid.amount)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {bid.coverageDetails ? bid.coverageDetails.substring(0, 50) + '...' : 'No details provided'}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(bid.createdAt)}
                            </span>
                            <button
                              onClick={() => navigate(`/request-detail/${bid.requestId || bid._id}`)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Posted Offers - Only for Providers */}
            {user.role === 'provider' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">My Posted Offers</h3>
                </div>
                
                <div className="p-6">
                  <div className="text-center">
                    <Shield className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Manage your insurance offers
                    </p>
                    <button
                      onClick={() => navigate('/posted-offers')}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View All Offers
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* KYC Verification - Only for Providers */}
            {user.role === 'provider' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">KYC Verification</h3>
                </div>
                
                <div className="p-6">
                  <div className="text-center">
                    <Shield className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Get verified to build trust with clients
                    </p>
                    <button
                      onClick={() => navigate('/kyc')}
                      className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                    >
                      Verify Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Accepted Offers - Only for Clients */}
            {user.role === 'client' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Accepted Offers</h3>
                </div>
                
                <div className="p-6">
                  {stats.acceptedOffersCount > 0 ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          You have <span className="font-semibold text-green-600">{stats.acceptedOffersCount}</span> accepted offers
                        </p>
                        <button
                          onClick={() => navigate('/accepted-offers')}
                          className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                        >
                          View All Offers
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Shield className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No accepted offers yet</p>
                      <button
                        onClick={() => navigate('/marketplace')}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Browse Offers
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Chats */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Active Chats</h3>
              </div>
              
              <div className="p-6">
                {activeChats.length === 0 ? (
                  <p className="text-gray-500 text-sm">No active conversations.</p>
                ) : (
                  <div className="space-y-3">
                    {activeChats.slice(0, 3).map((chat) => (
                      <div key={chat._id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {chat.recipientName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {chat.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/chat/${chat._id}`)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
              </div>
              
              <div className="p-6">
                {dashboardNotifications.length === 0 ? (
                  <p className="text-gray-500 text-sm">No notifications.</p>
                ) : (
                  <div className="space-y-3">
                    {dashboardNotifications.slice(0, 5).map((notification) => (
                      <div key={notification._id} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
