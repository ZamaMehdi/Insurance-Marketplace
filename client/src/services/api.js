// API service for communicating with MongoDB backend
const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5002') + '/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  getAuthToken() {
    const token = localStorage.getItem('insurance_token');
    // console.log('🔍 Getting auth token:', {
    //   hasToken: !!token,
    //   tokenLength: token ? token.length : 0,
    //   tokenStart: token ? token.substring(0, 20) + '...' : 'none'
    // });
    return token;
  }

  // Set auth token in localStorage
  setAuthToken(token) {
    // console.log('🔍 Setting auth token:', {
    //   hasToken: !!token,
    //   tokenLength: token ? token.length : 0,
    //   tokenStart: token ? token.substring(0, 20) + '...' : 'none'
    // });
    localStorage.setItem('insurance_token', token);
  }

  // Remove auth token from localStorage
  removeAuthToken() {
    localStorage.removeItem('insurance_token');
  }

  // Trigger logout event for components to handle
  triggerLogout() {
    // Dispatch a custom event that components can listen to
    window.dispatchEvent(new CustomEvent('auth:logout', {
      detail: { reason: 'token_expired' }
    }));
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();
    
    // console.log('🔍 API Request Debug:', {
    //   endpoint,
    //   hasToken: !!token,
    //   tokenLength: token ? token.length : 0,
    //   tokenStart: token ? token.substring(0, 20) + '...' : 'none'
    // });
    
    const config = {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    // console.log('🔍 Request Config:', {
    //   url,
    //   method: config.method || 'GET',
    //   headers: config.headers,
    //   hasBody: !!config.body
    // });

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific HTTP status codes
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 401) {
          // Clear invalid token and trigger logout
          this.removeAuthToken();
          this.triggerLogout();
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to perform this action.');
        } else if (response.status === 400) {
          // Handle validation errors with detailed messages
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const validationMessages = errorData.errors.map(err => `${err.param || err.path || 'field'}: ${err.msg}`).join(', ');
            throw new Error(`Validation failed: ${validationMessages}`);
          }
          throw new Error(errorData.message || 'Bad request. Please check your input.');
        } else if (response.status === 404) {
          throw new Error('Resource not found. Please check your request.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.token) {
      this.setAuthToken(response.token);
    }
    
    return response;
  }

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (response.token) {
      this.setAuthToken(response.token);
    }
    
    return response;
  }

  async logout() {
    this.removeAuthToken();
    return { success: true };
  }

  // Insurance Request endpoints
  async getRequests(filters = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const endpoint = `/requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  // Insurance Offer endpoints
  async getOffers(filters = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const endpoint = `/offers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  async getOfferById(offerId) {
    return await this.request(`/offers/${offerId}`);
  }

  async createOffer(offerData) {
    return await this.request('/offers', {
      method: 'POST',
      body: JSON.stringify(offerData)
    });
  }

  async updateOffer(offerId, updateData) {
    return await this.request(`/offers/${offerId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async deleteOffer(offerId) {
    return await this.request(`/offers/${offerId}`, {
      method: 'DELETE'
    });
  }

  async getProviderOffers(filters = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const endpoint = `/offers/provider/my-offers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  async toggleOfferStatus(offerId, status) {
    return await this.request(`/offers/${offerId}/toggle-status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  }

  async getProviderAvailableRequests(filters = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const endpoint = `/requests/provider/available${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  async getProviderBidRequests(userId, limit = 5) {
    return await this.request(`/users/${userId}/bid-requests?limit=${limit}`);
  }

  async getRequestById(requestId) {
    return await this.request(`/requests/${requestId}`);
  }

  async createRequest(requestData) {
    return await this.request('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  async submitBid(bidData) {
    return await this.request('/bids', {
      method: 'POST',
      body: JSON.stringify(bidData)
    });
  }

  async updateRequest(requestId, updateData) {
    return await this.request(`/requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async updateRequestStatus(requestId, status) {
    return await this.request(`/requests/${requestId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async deleteRequest(requestId) {
    return await this.request(`/requests/${requestId}`, {
      method: 'DELETE'
    });
  }

  async getRequestsByClient(clientId) {
    // Use the secure endpoint that gets the current user's requests
    return await this.request('/requests/client/my-requests');
  }



  // Bid endpoints
  async submitBid(bidData) {
    return await this.request('/bids', {
      method: 'POST',
      body: JSON.stringify(bidData)
    });
  }

  async getBidsForRequest(requestId) {
    return await this.request(`/bids/request/${requestId}`);
  }

  async getBidsByProvider(providerId) {
    return await this.request(`/bids/provider/${providerId}`);
  }

  async acceptBid(bidId) {
    return await this.request(`/bids/${bidId}/accept`, {
      method: 'PUT'
    });
  }

  async rejectBid(bidId) {
    return await this.request(`/bids/${bidId}/reject`, {
      method: 'PUT'
    });
  }

  async rejectBid(bidId) {
    return await this.request(`/bids/${bidId}/reject`, {
      method: 'PUT'
    });
  }

  // Accepted Offer endpoints
  async createAcceptedOffer(offerData) {
    return await this.request('/accepted-offers', {
      method: 'POST',
      body: JSON.stringify(offerData)
    });
  }

  async getClientAcceptedOffers(clientId, limit = 10, page = 1, status = 'all') {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    queryParams.append('page', page);
    if (status !== 'all') queryParams.append('status', status);
    
    return await this.request(`/accepted-offers/client/${clientId}?${queryParams.toString()}`);
  }

  async getProviderAcceptedOffers(providerId, limit = 10, page = 1, status = 'all') {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page);
    if (status !== 'all') queryParams.append('status', status);
    
    return await this.request(`/accepted-offers/provider/${providerId}?${queryParams.toString()}`);
  }

  async updateAcceptedOfferStatus(offerId, status) {
    return await this.request(`/accepted-offers/${offerId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // User endpoints
  async getCurrentUser() {
    return await this.request('/users/me');
  }

  async updateUserProfile(updateData) {
    return await this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  // Dashboard endpoints
  async getDashboardData() {
    return await this.request('/dashboard');
  }

  // User-specific dashboard endpoints
  async getUserDashboardStats(userId) {
    return await this.request(`/users/${userId}/dashboard-stats`);
  }

  async getProviderDashboardStats(userId) {
    return await this.request(`/users/${userId}/provider-dashboard`);
  }

  async getUserInsuranceRequests(userId, limit = 5) {
    return await this.request(`/users/${userId}/insurance-requests?limit=${limit}`);
  }

  async getUserBids(userId, limit = 5, role = null) {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    if (role) queryParams.append('role', role);
    
    return await this.request(`/users/${userId}/bids?${queryParams.toString()}`);
  }

  async getUserChatRooms(userId, limit = 3) {
    return await this.request(`/users/${userId}/chat-rooms?limit=${limit}`);
  }

  async getUserUnreadMessageCount(userId) {
    return await this.request(`/users/${userId}/unread-message-count`);
  }

  async getUserNotifications(userId, limit = 5) {
    return await this.request(`/users/${userId}/notifications?limit=${limit}`);
  }

  async getUserActiveChats(userId, limit = 3) {
    return await this.request(`/users/${userId}/active-chats?limit=${limit}`);
  }

  // Chat endpoints
  async createOrGetChatRoom(requestId, otherUserId) {
    // First try to get existing chat room to prevent duplicates
    try {
      const existingRooms = await this.request('/chat/rooms');
      if (existingRooms.success && existingRooms.data) {
        const existingRoom = existingRooms.data.find(room => 
          room.requestId === requestId && 
          room.participants.some(p => p._id === otherUserId)
        );
        if (existingRoom) {
          return { success: true, data: existingRoom };
        }
      }
    } catch (error) {
      // Could not check for existing rooms, proceeding with creation
    }
    
    // Create new chat room if none exists
    return await this.request('/chat/rooms', {
      method: 'POST',
      body: JSON.stringify({ requestId, otherUserId })
    });
  }

  async getChatMessages(roomId, limit = 50, before = null) {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    if (before) queryParams.append('before', before);
    
    // console.log('🔍 API Service: Getting chat messages for room:', roomId);
    // console.log('🔍 API Service: Query params:', queryParams.toString());
    
    const result = await this.request(`/chat/rooms/${roomId}/messages?${queryParams.toString()}`);
    // console.log('🔍 API Service: Chat messages result:', result);
    
    return result;
  }

  async sendMessage(roomId, content, messageType = 'text') {
    return await this.request(`/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, messageType })
    });
  }

  async getChatRooms(limit = 10, page = 1) {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    queryParams.append('page', page);
    
    return await this.request(`/chat/rooms?${queryParams.toString()}`);
  }

  async markChatAsRead(roomId) {
    return await this.request(`/chat/rooms/${roomId}/read`, {
      method: 'PUT'
    });
  }

  async getChatRoom(roomId) {
    return await this.request(`/chat/rooms/${roomId}`);
  }

  // Notification endpoints
  async getNotifications(page = 1, limit = 20, category, read, type) {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page);
    queryParams.append('limit', limit);
    if (category) queryParams.append('category', category);
    if (read !== undefined) queryParams.append('read', read);
    if (type) queryParams.append('type', type);
    
    return await this.request(`/notifications?${queryParams.toString()}`);
  }

  async getUnreadCount() {
    return await this.request('/notifications/unread-count');
  }

  async markNotificationAsRead(notificationId) {
    return await this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsAsRead() {
    return await this.request('/notifications/mark-all-read', {
      method: 'PUT'
    });
  }

  async deleteNotification(notificationId) {
    return await this.request(`/notifications/${notificationId}`, {
      method: 'DELETE'
    });
  }

  async getNotificationCategories() {
    return await this.request('/notifications/categories');
  }

  async deleteUserData() {
    return await this.request('/users/me/data', {
      method: 'DELETE'
    });
  }

  // Group Insurance endpoints (placeholder - backend routes not implemented yet)
  async getGroupDealsByRequest(requestId) {
    // Return empty array for now - backend routes not implemented
    return { success: true, data: [] };
  }

  async createGroupInsuranceDeal(dealData) {
    // Return success for now - backend routes not implemented
    return { success: true, message: 'Group deal creation not implemented yet' };
  }

  async addProviderToGroup(groupId, providerData) {
    // Return success for now - backend routes not implemented
    return { success: true, message: 'Provider addition not implemented yet' };
  }

  // Collaborative Offer endpoints
  async createCollaborativeOffer(offerData) {
    return await this.request('/offers/collaborative', {
      method: 'POST',
      body: JSON.stringify(offerData)
    });
  }

  async getCollaborativeOffers(filters = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const endpoint = `/offers/collaborative${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  // Provider search
  async searchProviders(searchTerm) {
    return await this.request(`/users/providers/search?q=${encodeURIComponent(searchTerm)}`);
  }

  // Debug methods (for development)
  async debugStore() {
    return { message: 'Debug method called' };
  }

  async resetStore() {
    return { message: 'Store reset' };
  }

  async forceReloadFromStorage() {
    return { message: 'Force reload called' };
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getAuthToken();
    const isAuth = !!token;
    // console.log('🔍 isAuthenticated check:', {
    //   hasToken: isAuth,
    //   tokenLength: token ? token.length : 0,
    //   tokenStart: token ? token.substring(0, 20) + '...' : 'none'
    // });
    return isAuth;
  }

  // Validate token by making a test request
  async validateToken() {
    try {
      const token = this.getAuthToken();
      if (!token) return false;
      
      // Make a simple request to validate the token
      const response = await fetch(`${this.baseURL}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  // Debug method to check authentication state
  debugAuthState() {
    const token = this.getAuthToken();
    const allKeys = Object.keys(localStorage);
    const insuranceKeys = allKeys.filter(key => key.includes('insurance'));
    
    // console.log('🔍 Debug Auth State:', {
    //   hasToken: !!token,
    //   tokenLength: token ? token.length : 0,
    //   tokenStart: token ? token.substring(0, 20) + '...' : 'none',
    //   allLocalStorageKeys: allKeys,
    //   insuranceKeys: insuranceKeys,
    //   localStorageSize: localStorage.length
    // });
    
    return {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      allKeys,
      insuranceKeys
    };
  }

  // KYC endpoints
  async getKYCStatus() {
    try {
      const response = await this.request('/kyc/status');
      return response;
    } catch (error) {
      console.error('Error fetching KYC status:', error);
      throw error;
    }
  }

  async submitKYC(formData) {
    try {
      const response = await this.request('/kyc/submit', {
        method: 'POST',
        body: formData
      });
      return response;
    } catch (error) {
      console.error('Error submitting KYC:', error);
      throw error;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService;
