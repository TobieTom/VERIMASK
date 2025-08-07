import axios from 'axios';
import AuthService from './AuthService';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Debug helper to check auth status
const debugAuth = () => {
  const user = AuthService.getCurrentUser();
  console.log("Auth Debug:", {
    userExists: !!user,
    tokenExists: !!(user && user.token),
    tokenExpired: user ? AuthService.isTokenExpired() : true
  });
};

// Create axios instance with auth header
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for JWT token
apiClient.interceptors.request.use(
  (config) => {
    // Log the endpoint being called
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    
    // Get fresh token for each request
    const token = AuthService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Token attached to request');
    } else {
      console.warn('No token available for request!');
      
      // Only show auth error for non-auth endpoints
      if (!config.url.includes('/auth/')) {
        toast.error('Your session has expired. Please log in again.');
      }
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.warn(`API Error: ${error.response?.status} ${error.config?.url}`, error);
    
    const originalRequest = error.config;
    
    // If error is 401 and not already retrying
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Check if we're not trying to refresh already (to avoid loops)
      if (!originalRequest.url.includes('refresh')) {
        try {
          console.log('Attempting token refresh...');
          const token = await AuthService.refreshToken();
          
          if (token) {
            console.log('Token refreshed, retrying request');
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          } else {
            console.warn('Token refresh returned empty token');
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          
          // Refresh token failed, logout user
          AuthService.logout();
          
          // Show a message only once
          if (!window.tokenErrorShown) {
            window.tokenErrorShown = true;
            toast.error('Your session has expired. Please log in again.');
            
            // Redirect after toast is shown
            setTimeout(() => {
              window.tokenErrorShown = false;
              window.location.href = '/login';
            }, 2000);
          }
          
          return Promise.reject(refreshError);
        }
      } else {
        console.warn('Token refresh endpoint returned 401, preventing infinite loop');
      }
    }
    
    // Custom error handling for different status codes
    switch (error.response?.status) {
      case 400:
        console.error('Bad Request:', error.response.data);
        break;
      case 403:
        toast.error('You do not have permission to perform this action');
        break;
      case 404:
        console.warn('Resource not found:', error.config.url);
        break;
      case 500:
        toast.error('Server error occurred. Please try again later.');
        break;
      default:
        // No default action
        break;
    }
    
    return Promise.reject(error);
  }
);

const ApiService = {
  // Document endpoints
  uploadDocument: (formData) => {
    // Double check auth before upload
    const token = AuthService.getToken();
    if (!token) {
      toast.error('Your session has expired. Please log in again.');
      return Promise.reject(new Error('Authentication required'));
    }
    
    return apiClient.post('/documents/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}` // Explicitly set token again just to be safe
      }
    });
  },
  
  getUserDocuments: () => {
    return apiClient.get('/documents/');
  },
  
  getDocumentDetails: (documentId) => {
    return apiClient.get(`/documents/${documentId}/`);
  },
  
  verifyDocument: (documentId, status, notes) => {
    return apiClient.post(`/documents/${documentId}/verify/`, {
      status,
      notes
    });
  },
  
  getPendingDocuments: () => {
    return apiClient.get('/documents/pending/');
  },
  
  getVerificationHistory: () => {
    return apiClient.get('/documents/history/');
  },
  
  // Profile endpoints
  updateProfile: (profileData) => {
    return apiClient.put('/profile/update/', profileData);
  },
  
  // Auth health check endpoint
  checkAuthStatus: () => {
    return apiClient.get('/auth/status/').catch(error => {
      console.log('Auth status check failed:', error.response?.status);
      return { data: { status: 'unauthenticated' } };
    });
  },
  
  // Helper method to retry a failed request with a fresh token
  retryRequest: async (requestConfig) => {
    try {
      // Try to refresh token first
      await AuthService.refreshToken();
      
      // Get fresh token
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Failed to refresh token');
      }
      
      // Create a fresh apiClient instance with updated token
      const freshClient = axios.create({
        ...apiClient.defaults,
        headers: {
          ...apiClient.defaults.headers,
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Retry the original request
      return await freshClient(requestConfig);
    } catch (error) {
      console.error('Retry request failed:', error);
      throw error;
    }
  },
  
  // Debug helper
  debugAuth
};

export default ApiService;