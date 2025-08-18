// Shared mock data store for insurance requests and bids
// This ensures data consistency between provider and client views

class MockDataStore {
  constructor() {
    console.log('MockDataStore: Constructor called - creating new instance');
    this.requests = [];
    this.bids = [];
    this.acceptedOffers = [];
    this.notificationCallbacks = [];
    this.socket = null; // Will be set from outside
    
    // Chat system data
    this.chatRooms = [];
    this.messages = [];
    this.chatParticipants = [];
    
    // Group insurance data
    this.groupInsuranceDeals = [];
    this.groupBids = [];
    this.groupParticipants = [];
    
    // Load data from localStorage or initialize with sample data
    this.loadFromStorage();
    console.log('MockDataStore: Constructor completed');
  }

  // Load data from localStorage
  loadFromStorage() {
    console.log('MockDataStore: loadFromStorage called');
    try {
      const storedRequests = localStorage.getItem('insurance_requests');
      const storedBids = localStorage.getItem('insurance_bids');
      const storedAcceptedOffers = localStorage.getItem('insurance_accepted_offers');
      const storedChatRooms = localStorage.getItem('insurance_chat_rooms');
      const storedMessages = localStorage.getItem('insurance_messages');
      const storedChatParticipants = localStorage.getItem('insurance_chat_participants');
      const storedGroupDeals = localStorage.getItem('insurance_group_deals');
      const storedGroupBids = localStorage.getItem('insurance_group_bids');
      const storedGroupParticipants = localStorage.getItem('insurance_group_participants');
      
      console.log('MockDataStore: localStorage contents:', {
        requests: storedRequests ? 'EXISTS' : 'NULL',
        bids: storedBids ? 'EXISTS' : 'NULL',
        acceptedOffers: storedAcceptedOffers ? 'EXISTS' : 'NULL'
      });
      
      if (storedRequests) {
        this.requests = JSON.parse(storedRequests);
        console.log('MockDataStore: Loaded', this.requests.length, 'requests from localStorage');
      } else {
        console.log('MockDataStore: No stored requests found, initializing with sample data');
        this.initializeData();
      }
      
      if (storedBids) {
        this.bids = JSON.parse(storedBids);
        console.log('MockDataStore: Loaded', this.bids.length, 'bids from localStorage');
      }
      
      if (storedAcceptedOffers) {
        this.acceptedOffers = JSON.parse(storedAcceptedOffers);
        console.log('MockDataStore: Loaded', this.acceptedOffers.length, 'accepted offers from localStorage');
      }

      if (storedChatRooms) {
        this.chatRooms = JSON.parse(storedChatRooms);
        console.log('MockDataStore: Loaded', this.chatRooms.length, 'chat rooms from localStorage');
      }

      if (storedMessages) {
        this.messages = JSON.parse(storedMessages);
        console.log('MockDataStore: Loaded', this.messages.length, 'messages from localStorage');
      }

      if (storedChatParticipants) {
        this.chatParticipants = JSON.parse(storedChatParticipants);
        console.log('MockDataStore: Loaded', this.chatParticipants.length, 'chat participants from localStorage');
      }

      if (storedGroupDeals) {
        this.groupInsuranceDeals = JSON.parse(storedGroupDeals);
        console.log('MockDataStore: Loaded', this.groupInsuranceDeals.length, 'group deals from localStorage');
      }

      if (storedGroupBids) {
        this.groupBids = JSON.parse(storedGroupBids);
        console.log('MockDataStore: Loaded', this.groupBids.length, 'group bids from localStorage');
      }

      if (storedGroupParticipants) {
        this.groupParticipants = JSON.parse(storedGroupParticipants);
        console.log('MockDataStore: Loaded', this.groupParticipants.length, 'group participants from localStorage');
      }
      
      console.log('MockDataStore: loadFromStorage completed');
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      console.log('MockDataStore: Falling back to sample data due to error');
      this.initializeData();
    }
  }

  // Save data to localStorage
  saveToStorage() {
    try {
      console.log('MockDataStore: saveToStorage called');
      console.log('MockDataStore: Saving requests:', this.requests.length);
      console.log('MockDataStore: Saving bids:', this.bids.length);
      console.log('MockDataStore: Saving accepted offers:', this.acceptedOffers.length);
      
      localStorage.setItem('insurance_requests', JSON.stringify(this.requests));
      localStorage.setItem('insurance_bids', JSON.stringify(this.bids));
      localStorage.setItem('insurance_accepted_offers', JSON.stringify(this.acceptedOffers));
      localStorage.setItem('insurance_chat_rooms', JSON.stringify(this.chatRooms));
      localStorage.setItem('insurance_messages', JSON.stringify(this.messages));
      localStorage.setItem('insurance_chat_participants', JSON.stringify(this.chatParticipants));
      localStorage.setItem('insurance_group_deals', JSON.stringify(this.groupInsuranceDeals));
      localStorage.setItem('insurance_group_bids', JSON.stringify(this.groupBids));
      localStorage.setItem('insurance_group_participants', JSON.stringify(this.groupParticipants));
      
      // Verify data was saved
      const savedRequests = localStorage.getItem('insurance_requests');
      console.log('MockDataStore: Verification - saved requests:', savedRequests ? 'SUCCESS' : 'FAILED');
      console.log('MockDataStore: Data saved to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        requestsLength: this.requests.length,
        bidsLength: this.bids.length
      });
    }
  }

  // Clear all data and reset to initial state
  resetData() {
    this.requests = [];
    this.bids = [];
    this.acceptedOffers = [];
    this.chatRooms = [];
    this.messages = [];
    this.chatParticipants = [];
    this.initializeData();
    this.saveToStorage();
    console.log('MockDataStore: Data reset to initial state');
  }

  // Set socket instance from outside
  setSocket(socket) {
    this.socket = socket;
    console.log('MockDataStore: Socket connected:', socket?.id);
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Emit socket event if socket is available
  emitSocketEvent(event, data) {
    if (this.socket && this.socket.connected) {
      console.log(`MockDataStore: Emitting socket event '${event}':`, data);
      this.socket.emit(event, data);
    } else {
      console.log(`MockDataStore: Socket not available for event '${event}'`);
    }
  }

  // Add notification callback
  onNotification(callback) {
    this.notificationCallbacks.push(callback);
  }

  // Remove notification callback
  offNotification(callback) {
    this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
  }

  // Emit notification to all listeners
  emitNotification(type, data) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(type, data);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  initializeData() {
    // Initialize with sample insurance requests
    this.requests = [
      {
        _id: 'mock-request-1',
        title: 'Commercial Property Insurance',
        description: 'Need comprehensive coverage for office building in downtown area',
        category: 'property',
        assetDetails: {
          type: 'property',
          name: 'Office Building',
          value: 2000000,
          currency: 'USD',
          location: {
            city: 'New York',
            state: 'NY',
            country: 'USA'
          }
        },
        insuranceDetails: {
          requestedAmount: 2000000,
          coverageType: 'full',
          riskLevel: 'medium'
        },
        biddingDetails: {
          minimumBidPercentage: 10,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          allowPartialBids: true,
          groupInsuranceAllowed: false
        },
        priority: 'high',
        status: 'open',
        timeRemaining: '2 weeks',
        bidCount: 3,
        clientId: 'client-user-id',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: 'mock-request-2',
        title: 'Fleet Auto Insurance',
        description: 'Insurance coverage for company fleet of 25 vehicles',
        category: 'auto',
        assetDetails: {
          type: 'vehicle',
          name: 'Company Fleet',
          value: 750000,
          currency: 'USD',
          location: {
            city: 'Los Angeles',
            state: 'CA',
            country: 'USA'
          }
        },
        insuranceDetails: {
          requestedAmount: 750000,
          coverageType: 'full',
          riskLevel: 'high'
        },
        biddingDetails: {
          minimumBidPercentage: 15,
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          allowPartialBids: false,
          groupInsuranceAllowed: true
        },
        priority: 'urgent',
        status: 'bidding',
        timeRemaining: '5 days',
        bidCount: 7,
        clientId: 'client-user-id',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: 'mock-request-3',
        title: 'Employee Health Benefits',
        description: 'Group health insurance for 150 employees with family coverage options',
        category: 'health',
        assetDetails: {
          type: 'health',
          name: 'Employee Benefits',
          value: 500000,
          currency: 'USD',
          location: {
            city: 'Chicago',
            state: 'IL',
            country: 'USA'
          }
        },
        insuranceDetails: {
          requestedAmount: 500000,
          coverageType: 'group',
          riskLevel: 'low'
        },
        biddingDetails: {
          minimumBidPercentage: 20,
          deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          allowPartialBids: true,
          groupInsuranceAllowed: true
        },
        priority: 'medium',
        status: 'open',
        timeRemaining: '3 weeks',
        bidCount: 1,
        clientId: 'client-user-id',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Initialize with sample bids
    this.bids = [
      {
        _id: 'mock-bid-1',
        requestId: 'mock-request-1',
        providerId: 'provider-user-id',
        providerName: 'PropertyShield Inc.',
        amount: 1800000,
        percentage: 90,
        premium: 4500,
        terms: 'Comprehensive property coverage with natural disaster protection',
        status: 'pending',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: 'mock-bid-2',
        requestId: 'mock-request-1',
        providerId: 'provider-user-id-2',
        providerName: 'SecureCover Insurance',
        amount: 2000000,
        percentage: 100,
        premium: 5200,
        terms: 'Full coverage with additional liability protection',
        status: 'pending',
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: 'mock-bid-3',
        requestId: 'mock-request-1',
        providerId: 'provider-user-id-3',
        providerName: 'UrbanProtect Co.',
        amount: 1600000,
        percentage: 80,
        premium: 3800,
        terms: 'Standard coverage with basic protection',
        status: 'pending',
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Initialize with sample accepted offers
    this.acceptedOffers = [
      {
        _id: 'mock-accepted-1',
        offerId: {
          _id: 'mock-offer-1',
          title: 'Comprehensive Health Insurance',
          category: 'health',
          description: 'Complete health coverage including dental and vision'
        },
        coverageAmount: 50000,
        startDate: '2024-01-01',
        status: 'active',
        premium: 299,
        provider: {
          companyName: 'HealthFirst Insurance',
          firstName: 'John',
          lastName: 'Smith'
        },
        acceptedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        additionalNotes: 'Includes dental and vision coverage',
        coverageAmountFormatted: '$50,000',
        monthlyPremiumFormatted: '$299',
        timeSinceAcceptance: '30 days ago',
        providerId: {
          profile: {
            companyName: 'HealthFirst Insurance'
          }
        }
      }
    ];
  }

  // Get all requests
  getRequests() {
    console.log('MockDataStore: getRequests called - returning all requests');
    console.log('Requests in store:', this.requests);
    return this.requests;
  }

  // Get requests available for providers to bid on
  getAvailableRequests() {
    console.log('MockDataStore: getAvailableRequests called');
    console.log('Total requests in store:', this.requests.length);
    
    const availableRequests = this.requests.filter(request => {
      // Check if request has basic required structure
      const hasBasicStructure = request && 
                               request._id && 
                               request.title && 
                               request.status === 'open' && 
                               request.clientId;
      
      if (!hasBasicStructure) {
        console.log('MockDataStore: Request filtered out - missing basic structure:', {
          hasId: !!request?._id,
          hasTitle: !!request?.title,
          hasStatus: request?.status === 'open',
          hasClientId: !!request?.clientId,
          request: request
        });
        return false;
      }
      
      console.log('MockDataStore: Request is available:', request.title, request._id);
      return true;
    });
    
    console.log('MockDataStore: Available requests count:', availableRequests.length);
    return availableRequests;
  }

  // Debug method to see all data in the store
  debugStore() {
    console.log('=== MockDataStore Debug ===');
    console.log('Total requests:', this.requests.length);
    console.log('All requests:', this.requests);
    console.log('Available requests:', this.getAvailableRequests());
    console.log('Total bids:', this.bids.length);
    console.log('Total accepted offers:', this.acceptedOffers.length);
    
    // Check localStorage contents
    console.log('=== localStorage Debug ===');
    const storedRequests = localStorage.getItem('insurance_requests');
    const storedBids = localStorage.getItem('insurance_bids');
    const storedAcceptedOffers = localStorage.getItem('insurance_accepted_offers');
    
    console.log('localStorage insurance_requests:', storedRequests);
    console.log('localStorage insurance_bids:', storedBids);
    console.log('localStorage insurance_accepted_offers:', storedAcceptedOffers);
    
    if (storedRequests) {
      try {
        const parsedRequests = JSON.parse(storedRequests);
        console.log('Parsed localStorage requests:', parsedRequests);
        console.log('localStorage requests count:', parsedRequests.length);
      } catch (e) {
        console.error('Error parsing localStorage requests:', e);
      }
    }
    
    console.log('==========================');
  }

  // Reset store to initial state
  resetStore() {
    console.log('MockDataStore: Resetting store to initial state');
    this.requests = [];
    this.bids = [];
    this.acceptedOffers = [];
    this.chatRooms = [];
    this.messages = [];
    this.chatParticipants = [];
    this.groupInsuranceDeals = [];
    this.groupBids = [];
    this.groupParticipants = [];
    
    // Clear localStorage
    localStorage.removeItem('insurance_requests');
    localStorage.removeItem('insurance_bids');
    localStorage.removeItem('insurance_accepted_offers');
    localStorage.removeItem('insurance_chat_rooms');
    localStorage.removeItem('insurance_messages');
    localStorage.removeItem('insurance_chat_participants');
    localStorage.removeItem('insurance_group_deals');
    localStorage.removeItem('insurance_group_bids');
    localStorage.removeItem('insurance_group_participants');
    
    // Reinitialize with sample data
    this.initializeData();
    console.log('MockDataStore: Store reset complete');
  }

  // Force reload data from localStorage
  forceReloadFromStorage() {
    console.log('MockDataStore: Force reloading from localStorage');
    this.loadFromStorage();
    console.log('MockDataStore: Force reload completed. Current requests:', this.requests.length);
  }

  // Get requests by client ID
  getRequestsByClient(clientId) {
    return this.requests.filter(request => request.clientId === clientId);
  }

  // Get bids for a specific request
  getBidsForRequest(requestId) {
    return this.bids.filter(bid => bid.requestId === requestId);
  }

  // Get bids by provider
  getBidsByProvider(providerId) {
    return this.bids.filter(bid => bid.providerId === providerId);
  }

  // Submit a new bid
  submitBid(bidData) {
    const newBid = {
      _id: `mock-bid-${Date.now()}`,
      ...bidData,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    this.bids.push(newBid);

    // Update bid count for the request
    const request = this.requests.find(req => req._id === bidData.requestId);
    if (request) {
      request.bidCount = (request.bidCount || 0) + 1;
    }

    // Save to localStorage
    this.saveToStorage();

    // Emit notification to client about new bid
    this.emitNotification('new_bid', {
      type: 'new_bid',
      requestId: bidData.requestId,
      clientId: request?.clientId,
      providerId: bidData.providerId,
      providerName: bidData.providerName,
      amount: bidData.amount,
      percentage: bidData.percentage,
      message: `New bid received from ${bidData.providerName} for $${bidData.amount?.toLocaleString()}`
    });

    // ✅ Emit real socket event to notify client about new bid
    this.emitSocketEvent('new_bid', {
      requestId: bidData.requestId,
      clientId: request?.clientId,
      providerId: bidData.providerId,
      providerName: bidData.providerName,
      amount: bidData.amount,
      percentage: bidData.percentage,
      message: `New bid received from ${bidData.providerName} for $${bidData.amount?.toLocaleString()}`
    });

    return newBid;
  }

  // Accept a bid (convert to accepted offer)
  acceptBid(bidId) {
    const bid = this.bids.find(b => b._id === bidId);
    if (!bid) return null;

    // Update bid status
    bid.status = 'accepted';

    // Create accepted offer
    const request = this.requests.find(req => req._id === bid.requestId);
    const acceptedOffer = {
      _id: `mock-accepted-${Date.now()}`,
      offerId: {
        _id: bid._id,
        title: request?.title || 'Insurance Offer',
        category: request?.category || 'general',
        description: request?.description || 'Insurance coverage'
      },
      coverageAmount: bid.amount,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
      premium: bid.premium,
      provider: {
        companyName: bid.providerName || 'Insurance Provider',
        firstName: 'Provider',
        lastName: 'Name'
      },
      acceptedAt: new Date().toISOString(),
      additionalNotes: bid.terms,
      coverageAmountFormatted: `$${bid.amount?.toLocaleString()}`,
      monthlyPremiumFormatted: `$${bid.premium}`,
      timeSinceAcceptance: 'Just now',
      providerId: {
        profile: {
          companyName: bid.providerName || 'Insurance Provider'
        }
      }
    };

    this.acceptedOffers.push(acceptedOffer);

    // Save to localStorage
    this.saveToStorage();

    // Emit notification to provider about accepted bid
    this.emitNotification('bid_accepted', {
      type: 'bid_accepted',
      bidId: bid._id,
      requestId: bid.requestId,
      providerId: bid.providerId,
      requestTitle: request?.title,
      amount: bid.amount,
      message: `Your bid for "${request?.title}" has been accepted! Coverage amount: $${bid.amount?.toLocaleString()}`
    });

    // ✅ Emit real socket event to notify provider about accepted bid
    this.emitSocketEvent('bid_accepted', {
      bidId: bid._id,
      requestId: bid.requestId,
      providerId: bid.providerId,
      requestTitle: request?.title,
      amount: bid.amount,
      message: `Your bid for "${request?.title}" has been accepted! Coverage amount: $${bid.amount?.toLocaleString()}`
    });

    return acceptedOffer;
  }

  // Get accepted offers
  getAcceptedOffers() {
    return this.acceptedOffers;
  }

  // Update request status
  updateRequestStatus(requestId, status) {
    const request = this.requests.find(req => req._id === requestId);
    if (request) {
      request.status = status;
      // Save to localStorage
      this.saveToStorage();
    }
  }

  // Chat system methods
  createChatRoom(requestId, clientId, providerId) {
    const existingRoom = this.chatRooms.find(room => 
      room.requestId === requestId && 
      room.participants.includes(clientId) && 
      room.participants.includes(providerId)
    );

    if (existingRoom) {
      return existingRoom;
    }

    const newRoom = {
      _id: `chat-room-${Date.now()}`,
      requestId,
      participants: [clientId, providerId],
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };

    this.chatRooms.push(newRoom);
    this.saveToStorage();
    return newRoom;
  }

  getChatRoomsForUser(userId) {
    return this.chatRooms.filter(room => room.participants.includes(userId));
  }

  getChatRoom(roomId) {
    return this.chatRooms.find(room => room._id === roomId);
  }

  sendMessage(roomId, senderId, content, messageType = 'text') {
    const room = this.getChatRoom(roomId);
    if (!room) return null;

    const newMessage = {
      _id: `msg-${Date.now()}`,
      roomId,
      senderId,
      content,
      messageType,
      timestamp: new Date().toISOString(),
      read: false
    };

    this.messages.push(newMessage);
    
    // Update room's last message time
    room.lastMessageAt = newMessage.timestamp;
    
    this.saveToStorage();

    // Find the recipient (other participant in the chat)
    const recipientId = room.participants.find(id => id !== senderId);
    
    // Emit real-time message notification to recipient
    this.emitSocketEvent('new_message', {
      roomId,
      messageId: newMessage._id,
      senderId,
      recipientId,
      content,
      timestamp: newMessage.timestamp,
      isUnread: true
    });

    // Also emit a general notification for the recipient
    this.emitNotification('new_message', {
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${senderId === 'client-user-id' ? 'Client' : 'Provider'}`,
      recipientId,
      roomId,
      timestamp: newMessage.timestamp
    });

    return newMessage;
  }

  getMessagesForRoom(roomId, limit = 50) {
    return this.messages
      .filter(msg => msg.roomId === roomId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-limit);
  }

  markMessagesAsRead(roomId, userId) {
    this.messages.forEach(msg => {
      if (msg.roomId === roomId && msg.senderId !== userId && !msg.read) {
        msg.read = true;
      }
    });
    this.saveToStorage();
  }

  getUnreadMessageCount(userId) {
    return this.messages.filter(msg => 
      msg.senderId !== userId && 
      !msg.read && 
      this.chatRooms.some(room => 
        room._id === msg.roomId && 
        room.participants.includes(userId)
      )
    ).length;
  }

  // Group Insurance Methods
  createGroupInsuranceDeal(requestId, clientId, totalAmount, minParticipants = 2) {
    const existingDeal = this.groupInsuranceDeals.find(deal => deal.requestId === requestId);
    if (existingDeal) return existingDeal;

    const newDeal = {
      _id: `group-deal-${Date.now()}`,
      requestId,
      clientId,
      totalAmount,
      minParticipants,
      currentParticipants: 0,
      totalCoverage: 0,
      status: 'forming', // forming, active, completed, cancelled
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days to form group
      participants: []
    };

    this.groupInsuranceDeals.push(newDeal);
    this.saveToStorage();
    return newDeal;
  }

  addProviderToGroup(groupId, providerId, providerName, coverageAmount, premium, terms) {
    const group = this.groupInsuranceDeals.find(g => g._id === groupId);
    if (!group) return null;

    const newParticipant = {
      _id: `participant-${Date.now()}`,
      groupId,
      providerId,
      providerName,
      coverageAmount,
      premium,
      terms,
      joinedAt: new Date().toISOString(),
      status: 'active'
    };

    this.groupParticipants.push(newParticipant);
    
    // Update group stats
    group.currentParticipants += 1;
    group.totalCoverage += coverageAmount;
    group.participants.push(newParticipant._id);

    // Check if group is ready
    if (group.totalCoverage >= group.totalAmount && group.currentParticipants >= group.minParticipants) {
      group.status = 'ready';
    }

    this.saveToStorage();
    return newParticipant;
  }

  getGroupDealsByRequest(requestId) {
    return this.groupInsuranceDeals.filter(deal => deal.requestId === requestId);
  }

  getGroupDealsByClient(clientId) {
    return this.groupInsuranceDeals.filter(deal => deal.clientId === clientId);
  }

  getGroupDealsByProvider(providerId) {
    const participantIds = this.groupParticipants
      .filter(p => p.providerId === providerId)
      .map(p => p.groupId);
    
    return this.groupInsuranceDeals.filter(deal => participantIds.includes(deal._id));
  }

  finalizeGroupDeal(groupId) {
    const group = this.groupInsuranceDeals.find(g => g._id === groupId);
    if (!group || group.status !== 'ready') return null;

    group.status = 'completed';
    group.completedAt = new Date().toISOString();

    // Update request status
    this.updateRequestStatus(group.requestId, 'completed');

    // Create accepted offers for all participants
    const participants = this.groupParticipants.filter(p => p.groupId === groupId);
    participants.forEach(participant => {
      const acceptedOffer = {
        _id: `group-accepted-${Date.now()}`,
        offerId: {
          _id: participant._id,
          title: `Group Insurance - ${participant.providerName}`,
          category: 'group',
          description: 'Group insurance coverage'
        },
        coverageAmount: participant.coverageAmount,
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
        premium: participant.premium,
        provider: {
          companyName: participant.providerName,
          firstName: 'Group',
          lastName: 'Participant'
        },
        acceptedAt: new Date().toISOString(),
        additionalNotes: participant.terms,
        coverageAmountFormatted: `$${participant.coverageAmount?.toLocaleString()}`,
        monthlyPremiumFormatted: `$${participant.premium}`,
        timeSinceAcceptance: 'Just now',
        providerId: {
          profile: {
            companyName: participant.providerName
          }
        },
        isGroupInsurance: true,
        groupId: groupId
      };

      this.acceptedOffers.push(acceptedOffer);
    });

    this.saveToStorage();
    return group;
  }

  // Add new request
  addRequest(requestData) {
    const newRequest = {
      _id: `mock-request-${Date.now()}`,
      ...requestData,
      status: 'open', // Ensure status is set to 'open'
      bidCount: 0,
      createdAt: new Date().toISOString(),
      timeRemaining: requestData.timeRemaining || '30 days'
    };
    
    // Ensure required fields are present
    if (!newRequest.title) {
      console.error('Request missing title:', newRequest);
    }
    if (!newRequest.clientId) {
      console.error('Request missing clientId:', newRequest);
    }
    
    this.requests.push(newRequest);
    console.log('MockDataStore: Added new request:', newRequest);
    console.log('MockDataStore: Total requests after adding:', this.requests.length);
    console.log('MockDataStore: All requests:', this.requests);

    // Save to localStorage
    this.saveToStorage();

    // Emit notification to providers about new request
    this.emitNotification('new_request', {
      type: 'new_request',
      requestId: newRequest._id,
      title: newRequest.title,
      category: newRequest.category,
      amount: newRequest.insuranceDetails?.requestedAmount,
      message: `New insurance request: "${newRequest.title}" - $${newRequest.insuranceDetails?.requestedAmount?.toLocaleString()}`
    });

    // ✅ Emit real socket event to notify all providers
    this.emitSocketEvent('new_insurance_request', {
      requestId: newRequest._id,
      title: newRequest.title,
      category: newRequest.category,
      amount: newRequest.insuranceDetails?.requestedAmount,
      clientId: newRequest.clientId,
      description: newRequest.description
    });

    return newRequest;
  }
}

// Create singleton instance
const mockDataStore = new MockDataStore();
export default mockDataStore;