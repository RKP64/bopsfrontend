const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID || 'abbab19a-995e-44af-9506-f34a1645c4f9',
    authority: import.meta.env.VITE_AUTHORITY_URL || 'https://login.microsoftonline.com/61903f2d-e804-491f-99d8-996637013ee5',
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin, // Use current origin for development
    postLogoutRedirectUri: window.location.origin, // Use current origin
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false, // For use with session storage & redirect flows in older browsers.
  },
};

// For SSO authentication, we need to request an ID token, not an access token
// ID tokens are issued for your application (CLIENT_ID as audience)
const defaultScopes = ["openid", "profile", "email"];

const loginRequest = {
  scopes: defaultScopes,
  prompt: "select_account", // Optional: force account selection
};

const SilentSSORequest = {
  scopes: defaultScopes,
};

export {
  msalConfig,
  defaultScopes,
  loginRequest,
  SilentSSORequest,
};
