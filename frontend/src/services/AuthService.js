import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Debug flag - set to true to see detailed auth logs
const DEBUG_AUTH = true;

// Helper functions
const logDebug = (...args) => {
  if (DEBUG_AUTH) {
    console.log('[Auth]', ...args);
  }
};

const logError = (...args) => {
  console.error('[Auth Error]', ...args);
};

const AuthService = {
  login: async (email, password, role) => {
    logDebug('Attempting login:', { email, role });
    
    try {
      const response = await axios.post(`${API_URL}/auth/token/`, {
        username: email,
        password,
        role
      });
      
      if (response.data.access) {
        // Store both token and user data
        const userData = {
          token: response.data.access,
          refreshToken: response.data.refresh,
          ...(response.data.user || {})
        };
        
        // Decode token to get expiration time and user ID
        try {
          const decoded = jwtDecode(response.data.access);
          userData.exp = decoded.exp;
          userData.id = decoded.user_id || userData.id;
          
          // Calculate token expiration time
          const expiresIn = decoded.exp * 1000 - Date.now();
          const expiresInMinutes = Math.round(expiresIn / 60000);
          logDebug(`Token will expire in ${expiresInMinutes} minutes`);
          
        } catch (decodeError) {
          logError('Failed to decode JWT token:', decodeError);
        }
        
        // Store in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Also set the token in axios defaults for immediate use
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        
        logDebug('Login successful:', { id: userData.id });
      } else {
        logError('Login response missing access token');
      }
      
      return response.data;
    } catch (error) {
      logError('Login failed:', error.response?.data || error.message);
      throw error;
    }
  },
  
  loginWithWallet: async (walletAddress, message, signature) => {
    logDebug('Attempting wallet login:', { walletAddress });
    
    try {
      const response = await axios.post(`${API_URL}/auth/wallet/`, {
        walletAddress,
        message,
        signature
      });
      
      if (response.data.access) {
        // Store both token and user data
        const userData = {
          token: response.data.access,
          refreshToken: response.data.refresh,
          walletAddress,
          ...(response.data.user || {})
        };
        
        // Decode token to get expiration time and user ID
        try {
          const decoded = jwtDecode(response.data.access);
          userData.exp = decoded.exp;
          userData.id = decoded.user_id || userData.id;
          
          // Calculate token expiration time
          const expiresIn = decoded.exp * 1000 - Date.now();
          const expiresInMinutes = Math.round(expiresIn / 60000);
          logDebug(`Token will expire in ${expiresInMinutes} minutes`);
          
        } catch (decodeError) {
          logError('Failed to decode JWT token:', decodeError);
        }
        
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Also set the token in axios defaults for immediate use
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        
        logDebug('Wallet login successful:', { id: userData.id });
      } else {
        logError('Wallet login response missing access token');
      }
      
      return response.data;
    } catch (error) {
      logError('Wallet login failed:', error.response?.data || error.message);
      throw error;
    }
  },
  
  register: async (userData) => {
    logDebug('Attempting registration');
    return axios.post(`${API_URL}/auth/register/`, userData);
  },
  
  logout: () => {
    logDebug('Logging out user');
    
    // Clear localStorage
    localStorage.removeItem('user');
    
    // Clear auth headers
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear any auth error flags
    if (window.tokenErrorShown) {
      window.tokenErrorShown = false;
    }
    
    logDebug('User logged out successfully');
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
      logDebug('No user found in localStorage');
      return null;
    }
    
    try {
      const user = JSON.parse(userStr);
      
      if (!user.token) {
        logDebug('User found in localStorage but missing token');
        localStorage.removeItem('user');
        return null;
      }
      
      // Check if token is expired
      if (user.exp && user.exp * 1000 < Date.now()) {
        logDebug('User token has expired, clearing localStorage');
        localStorage.removeItem('user');
        return null;
      }
      
      logDebug('Current user found:', { id: user.id });
      return user;
    } catch (e) {
      logError('Error parsing user from localStorage:', e);
      localStorage.removeItem('user');
      return null;
    }
  },
  
  isTokenExpired: () => {
    const user = AuthService.getCurrentUser();
    if (!user || !user.exp) {
      logDebug('No user or expiration info, considering token expired');
      return true;
    }
    
    // Add a buffer of 60 seconds to account for clock differences
    const currentTime = Date.now() / 1000;
    const isExpired = user.exp < currentTime + 60;
    
    if (isExpired) {
      logDebug('Token is expired or will expire soon');
    }
    
    return isExpired;
  },
  
  getToken: () => {
    const user = AuthService.getCurrentUser();
    if (!user) {
      logDebug('getToken: No user found');
      return null;
    }
    
    if (!user.token) {
      logDebug('getToken: User found but no token');
      return null;
    }
    
    // Print token expiration status in debug mode
    if (DEBUG_AUTH && user.exp) {
      const expiresIn = user.exp * 1000 - Date.now();
      const expiresInMinutes = Math.round(expiresIn / 60000);
      logDebug(`Token expires in ${expiresInMinutes} minutes`);
    }
    
    if (AuthService.isTokenExpired()) {
      logDebug('getToken: Token is expired, attempting silent refresh');
      // If token is expired or about to expire, try to refresh it silently
      // This is an async operation but we return the current token for now
      AuthService.refreshToken()
        .then(newToken => {
          logDebug('Silent token refresh succeeded');
        })
        .catch(err => {
          logError('Silent token refresh failed:', err.message);
          // Don't show UI error here, ApiService will handle that
        });
    }
    
    return user.token;
  },
  
  refreshToken: async () => {
    const user = AuthService.getCurrentUser();
    
    if (!user?.refreshToken) {
      logError('No refresh token available');
      return null;
    }
    
    try {
      logDebug('Attempting to refresh token');
      
      const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
        refresh: user.refreshToken
      });
      
      if (!response.data.access) {
        throw new Error('No access token in refresh response');
      }
      
      // Update stored user data with new token
      const updatedUser = {
        ...user,
        token: response.data.access
      };
      
      // Decode new token to get updated expiration
      try {
        const decoded = jwtDecode(response.data.access);
        updatedUser.exp = decoded.exp;
        
        // Calculate and log new expiration time
        const expiresIn = decoded.exp * 1000 - Date.now();
        const expiresInMinutes = Math.round(expiresIn / 60000);
        logDebug(`New token will expire in ${expiresInMinutes} minutes`);
        
      } catch (decodeError) {
        logError('Failed to decode refreshed JWT token:', decodeError);
      }
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update auth header with new token
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
      
      logDebug('Token refreshed successfully');
      return response.data.access;
    } catch (error) {
      logError('Token refresh failed:', error.response?.data || error.message);
      
      // If refresh fails, clear user data and force re-login
      if (error.response && error.response.status === 401) {
        logDebug('Refresh token is invalid, logging out user');
        AuthService.logout();
      }
      
      throw error;
    }
  },
  
  // Setup interceptor for axios
  setupAxiosInterceptors: () => {
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (!originalRequest) {
          return Promise.reject(error);
        }
        
        // Avoid retrying specific endpoints to prevent loops
        const isAuthEndpoint = 
          originalRequest.url?.includes('/auth/token/') || 
          originalRequest.url?.includes('/auth/refresh/');
        
        // If error is 401 and not already retrying and we have a refresh token
        // and we're not on an auth endpoint
        if (
          error.response && 
          error.response.status === 401 && 
          !originalRequest._retry && 
          AuthService.getCurrentUser()?.refreshToken &&
          !isAuthEndpoint
        ) {
          logDebug('401 error intercepted, attempting token refresh');
          originalRequest._retry = true;
          
          try {
            // Try to refresh token
            const newToken = await AuthService.refreshToken();
            if (newToken) {
              logDebug('Token refreshed, retrying original request');
              // Update authorization header
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              // Retry the original request
              return axios(originalRequest);
            } else {
              logDebug('Token refresh returned null token');
            }
          } catch (refreshError) {
            logError('Interceptor token refresh failed:', refreshError);
            
            // If refresh token is invalid, logout and redirect to login
            AuthService.logout();
            
            // Only show the error message once
            if (!window.tokenErrorShown) {
              window.tokenErrorShown = true;
              toast.error('Your session has expired. Please log in again.');
              
              // Give the toast time to show before redirecting
              setTimeout(() => {
                window.tokenErrorShown = false;
                window.location.href = '/login';
              }, 1500);
            }
            
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  },
  
  // Debugging helper
  debugAuth: () => {
    const user = AuthService.getCurrentUser();
    const token = user?.token;
    let tokenInfo = 'No token';
    
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const expiresIn = decoded.exp * 1000 - Date.now();
        tokenInfo = {
          subject: decoded.sub,
          userId: decoded.user_id,
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          expiresIn: Math.round(expiresIn / 60000) + ' minutes',
          isExpired: expiresIn <= 0
        };
      } catch (e) {
        tokenInfo = 'Invalid token format';
      }
    }
    
    console.log('Auth Debug Info:', {
      userExists: !!user,
      tokenExists: !!token,
      tokenInfo,
      refreshTokenExists: !!user?.refreshToken,
      userIdInStorage: user?.id,
      localStorageData: localStorage.getItem('user')
    });
    
    return {
      isAuthenticated: !!user?.token && !AuthService.isTokenExpired(),
      user
    };
  }
};

// Setup axios interceptors for automatic token refresh
AuthService.setupAxiosInterceptors();

// Debug authentication on load if in debug mode
if (DEBUG_AUTH) {
  setTimeout(() => {
    AuthService.debugAuth();
  }, 500);
}

export default AuthService;