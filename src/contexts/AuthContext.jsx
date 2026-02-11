import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config';
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError, AuthError } from '@azure/msal-browser';

const AuthContext = createContext();

const API_BASE_URL = API_CONFIG.BASE_URL;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMsalReady, setIsMsalReady] = useState(false);
  const { instance, accounts } = useMsal();

  // Process authentication result from MSAL
  const processAuthenticationResult = async (authResult) => {
    const account = authResult?.account;
    if (authResult && account) {
      // Prevent duplicate processing
      if (window.authProcessed) {
        console.log('Authentication already processed, skipping...');
        return;
      }
      
      console.log('Processing authentication result for account:', account.username);
      window.authProcessed = true; // Set flag to prevent duplicate processing
      
      // Set loading to true while processing
      setLoading(true);
      
      try {
        // Exchange MSAL ID token for backend token
        const idToken = authResult.idToken || authResult.accessToken;
        console.log('Attempting SSO login with token:', idToken ? 'Token present' : 'No token');
        
        const backendResponse = await axios.post(`${API_BASE_URL}/login/sso`, {
          sso_token: idToken
        });
        
        localStorage.setItem('authToken', backendResponse.data.access_token);
        localStorage.setItem('loginMethod', 'sso');
        
        // Get user info from backend
        const userResponse = await axios.get(`${API_BASE_URL}/user/me`, {
          headers: {
            'Authorization': `Bearer ${backendResponse.data.access_token}`
          }
        });
        
        setUser(userResponse.data);
        setIsAuthenticated(true);
        setLoading(false); // Set loading to false after successful authentication
        
        // Show app and hide login
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('root').style.display = 'block';
        
        console.log('SSO authentication successful');
      } catch (backendError) {
        console.error('Backend token exchange failed:', backendError);
        console.error('Error details:', {
          status: backendError.response?.status,
          statusText: backendError.response?.statusText,
          data: backendError.response?.data,
          url: backendError.config?.url
        });
        
        // Check if it's a configuration error
        if (backendError.response?.status === 503) {
          console.error('SSO service not configured on backend');
          // Fallback to MSAL user info
          const msalUser = {
            name: account.name,
            email: account.username,
            id: account.localAccountId
          };
          setUser(msalUser);
          setIsAuthenticated(true);
          setLoading(false); // Set loading to false
          
          // Show app and hide login
          document.getElementById('login-container').style.display = 'none';
          document.getElementById('root').style.display = 'block';
        } else {
          // For other errors, show error message
          console.error('SSO authentication failed');
          setLoading(false); // Set loading to false even on error
          showErrorMessage(`SSO login failed: ${backendError.response?.data?.detail || 'Unknown error'}`);
        }
      }
    }
  };

  // Show error message to user
  const showErrorMessage = (message) => {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded';
    errorDiv.textContent = message;
    
    const loginContainer = document.getElementById('login-container');
    const existingError = loginContainer?.querySelector('.error-message');
    if (existingError) existingError.remove();
    if (loginContainer) {
      loginContainer.appendChild(errorDiv);
    }
  };

  // Check if user is logged in on app start
  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        // Token is invalid, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('loginMethod');
        window.dispatchEvent(new Event("userLoggedOut"));
      }
    } else if (accounts.length > 0) {
      // If no token but MSAL has accounts, try to get token silently
      try {
        const silentRequest = {
          scopes: ["openid", "profile", "email"],
          account: accounts[0]
        };
        const response = await instance.acquireTokenSilent(silentRequest);
        
        // Process the authentication result
        await processAuthenticationResult(response);
      } catch (error) {
        console.error('Silent token acquisition failed:', error);
        
        // If silent acquisition fails, try SSO silent
        if (error instanceof InteractionRequiredAuthError) {
          try {
            console.log('Attempting SSO silent...');
            const ssoResponse = await instance.ssoSilent({
              scopes: ["openid", "profile", "email"]
            });
            await processAuthenticationResult(ssoResponse);
          } catch (ssoError) {
            console.log('SSO silent failed, user needs to login manually');
          }
        }
      }
    }
    setLoading(false);
  };

  // Handle redirect promise and initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Wait for MSAL to be ready
        if (!instance) {
          console.log('MSAL instance not ready yet');
          return;
        }

        console.log('Initializing authentication...');
        
        // Handle redirect promise first - this is crucial for processing authentication results
        try {
          const redirectResponse = await instance.handleRedirectPromise();
          if (redirectResponse) {
            console.log("Redirect response received:", redirectResponse);
            // Set the account from redirect response
            instance.setActiveAccount(redirectResponse.account);
            
            // Process the authentication result
            await processAuthenticationResult(redirectResponse);
            return; // Exit early if redirect was successful
          }
        } catch (error) {
          console.error("Error handling redirect promise:", error);
        }

        // If no redirect response, check existing authentication
        await checkAuthStatus();
        
      } catch (error) {
        console.error('Authentication initialization failed:', error);
        setLoading(false);
      }
    };

    // Only initialize if not already authenticated
    if (!isAuthenticated) {
      initializeAuth();
    }
  }, [instance, accounts]); // Re-run when MSAL instance or accounts change

  // Listen for storage changes to sync across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'authToken') {
        if (e.newValue) {
          // Token was added, check auth status
          checkAuthStatus();
        } else {
          // Token was removed, logout
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    // Listen for login events from HTML page
    const handleUserLoggedIn = (e) => {
      setUser(e.detail);
      setIsAuthenticated(true);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleUserLoggedIn);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, []);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  // Force login redirect when authentication fails
  const forceLogin = async () => {
    try {
      console.log('Forcing login redirect...');
      await instance.loginRedirect({
        scopes: ["openid", "profile", "email"],
        prompt: "select_account"
      });
    } catch (error) {
      console.error('Login redirect failed:', error);
      showErrorMessage('Login failed. Please try again.');
    }
  };

  // Expose functions globally for HTML access
  useEffect(() => {
    window.forceLogin = forceLogin;
    window.triggerAuthResult = processAuthenticationResult;
    return () => {
      delete window.forceLogin;
      delete window.triggerAuthResult;
    };
  }, [instance]);

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await axios.post(`${API_BASE_URL}/logout`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('loginMethod');
      setUser(null);
      setIsAuthenticated(false);
      
      // Reset authentication processing flag
      window.authProcessed = false;
      
      // Logout from MSAL
      if (accounts.length > 0) {
        instance.logoutRedirect({
          postLogoutRedirectUri: window.location.origin
        });
      }
      
      // Notify app to clear feature state (chat history, reports, etc.)
      window.dispatchEvent(new Event('userLoggedOut'));
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    getAuthHeaders,
    forceLogin,
    processAuthenticationResult
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
