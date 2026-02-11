// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import axios from 'axios'; // <-- 1. IMPORT AXIOS

// --- 2. ADD THIS ENTIRE INTERCEPTOR BLOCK ---
axios.interceptors.response.use(
  (response) => {
    // If the response is successful, just return it
    return response;
  },
  (error) => {
    // Check if the error is a 401 Unauthorized
    if (error.response && error.response.status === 401) {

      console.error("Authentication Error (401). Token is invalid. Logging out.");

      // Clear the bad token from storage.
      // We use 'authToken' and 'loginMethod' because that's what your index.html uses.
      localStorage.removeItem('authToken');
      localStorage.removeItem('loginMethod');

      // Force a redirect to the login page (index.html)
      window.location.href = '/';
    }

    // For all other errors, just let them pass
    return Promise.reject(error);
  }
);
// --- END OF NEW CODE ---

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);