// src/App.jsx
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthProvider as MsalAuthProvider } from './config/auth-provider';

// Corrected imports to use relative paths from the current file's location.
// Since App.jsx is in /src, the path to /src/components is ./components
import Header from './components/Header/Header.jsx';
import Sidebar from './components/Sidebar/Sidebar.jsx';
import ConversationalAgent from './components/ConversationalAgent/ConversationalAgent.jsx';
import MDAReviewer from './components/MDAReviewer/MDAReviewer.jsx';

// This relative import for CSS was already correct. We're applying the same logic.
import './index.css'; 

function AppContent() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [selectedApp, setSelectedApp] = useState('conversational'); // Default to Conversational Agent

  const handleAppSelect = (app) => {
    setSelectedApp(app);
  };

  const handleLogout = () => {
    logout();
    // Hide the app and show login page
    document.getElementById('root').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't show anything - let HTML login handle it
  if (!isAuthenticated) {
    return null;
  }

  return (
    // Assuming you have a root element with a class for styling in your CSS
    <div className="appContainer">
      <Header onLogout={handleLogout} /> {/* Header component at the top */}
      <div className="mainContent">
        <Sidebar onSelectApp={handleAppSelect} selectedApp={selectedApp} />
        <div className="contentArea">
          {/* Conditionally render the selected component */}
          {selectedApp === 'conversational' && <ConversationalAgent />}
          {selectedApp === 'mda-reviewer' && <MDAReviewer />}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <MsalAuthProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </MsalAuthProvider>
  );
}

export default App;

