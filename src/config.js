// API Configuration
export const API_CONFIG = {
  MARKETPLACE_URL: import.meta.env.VITE_MARKETPLACE_URL || "https://blraiport-dev.bialairport.com/",
  BASE_URL: 'http://localhost:8021',
  BASE_URL_2: 'http://localhost:8021',
  // BASE_URL: 'https://bial-genai-regulatory-mda-app-02-c8eag5fch2hkbfa2.southindia-01.azurewebsites.net/',
  // BASE_URL_2: 'https://bial-genai-regulatory-backend-01-bpdeeyd2h7hsc6bp.southindia-01.azurewebsites.net/',

  // BASE_URL: '/api-mda',
  // BASE_URL_2: '/api-ff',

  ENDPOINTS: {
    // Authentication
    LOGIN: '/login',
    LOGOUT: '/logout',
    SSO_LOGIN: '/login/sso',
    USER_ME: '/user/me',

    // Conversational Agent
    CHAT: '/conversational-chat',

    // MDA Reviewer
    MDA_ANALYZE: '/analyze-document',
    MDA_REFINE: '/refine-report',
    MDA_CHAT: '/mda-chat',

    // Document Analysis
    ANALYZE_DOCUMENT: '/analyze-document',

    // File Upload
    UPLOAD_FILE: '/upload-file',

    // Download
    DOWNLOAD_REPORT: '/download-report',

    // Feedback
    FEEDBACK: '/feedback',

    // Refine Report
    REFINE_REPORT: '/refine-report',

    // Blob Proxy (for secure blob access)
    BLOB_PROXY: '/blob-proxy'
  },

  // Request timeout in milliseconds
  TIMEOUT: 300000,

  // Default headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get blob proxy URL
// If the URL is already a proxy URL (starts with /blob-proxy), prepend the appropriate BASE_URL
// By default, uses BASE_URL (MDA service), but can be overridden
// Otherwise, return as-is (for non-blob URLs)
export const getBlobProxyUrl = (url, useBaseUrl2 = false) => {
  if (!url) return url;

  // If it's already a full URL (starts with http:// or https://), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's a proxy URL (starts with /blob-proxy), prepend the appropriate BASE_URL
  if (url.startsWith('/blob-proxy')) {
    const baseUrl = useBaseUrl2 ? API_CONFIG.BASE_URL_2 : API_CONFIG.BASE_URL;
    const fullUrl = `${baseUrl}${url}`;

    // If baseUrl is relative (starts with /), convert to absolute URL using current origin
    if (baseUrl.startsWith('/')) {
      return `${window.location.origin}${fullUrl}`;
    }

    return fullUrl;
  }

  // For other relative URLs (like file://), return as-is
  return url;
};

// Helper function to get auth headers
export const getAuthHeaders = (token) => {
  return {
    ...API_CONFIG.DEFAULT_HEADERS,
    'Authorization': `Bearer ${token}`
  };
};

// Helper function to get multipart headers
export const getMultipartHeaders = (token) => {
  return {
    'Authorization': `Bearer ${token}`
  };
};

export default API_CONFIG;