import React, { useEffect, useMemo, useState } from "react";
import { loginRequest, msalConfig } from "./authconfig";
import { EventType, InteractionRequiredAuthError, PublicClientApplication, AuthError } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";

export const AuthProvider = ({ children }) => {
  const [isMsalReady, setIsMsalReady] = useState(false); 
  const msalInstance = useMemo(() => {
    return new PublicClientApplication(msalConfig);
  }, []);

  // Function to process authentication result - simplified for MSAL provider
  const processAuthenticationResult = async (authResult) => {
    const account = authResult?.account;
    if (authResult && account) {
      console.log('MSAL authentication result received for account:', account.username);
      
      // Set the account as active
      msalInstance.setActiveAccount(account);
      
      // Trigger the AuthContext to process this result
      if (window.triggerAuthResult) {
        window.triggerAuthResult(authResult);
      }
    }
  }; 

  useEffect(() => {
    let callbackId = null;
    let isMounted = true; // Flag to prevent state updates on unmounted component
    msalInstance.initialize().then(async () => {
      if (!isMounted) return; // Stop if the component unmounted during the async call
      console.log("MSAL instance initialized.");
      
      // Expose MSAL instance globally for HTML access
      window.msalInstance = msalInstance;
      
      // Set active account if available (redirect handling is done by AuthContext)
      if(!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0){
        msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0])
      }
      
      console.log("MSAL instance ready, authentication handling delegated to AuthContext");

      // Callback to set the current logged in account as the active account
      callbackId = msalInstance.addEventCallback(async (event) => {
        const authResult = event.payload;
        const account = authResult?.account;
        if(event.eventType === EventType.LOGIN_SUCCESS && account){
          msalInstance.setActiveAccount(account);
          
          // Only process if not already handled by redirect promise
          if (!window.authProcessed) {
            window.authProcessed = true;
            await processAuthenticationResult(authResult);
          }
        }
      })
      setIsMsalReady(true);

      // Cleanup function for useEffect
      return () => {
        isMounted = false; // Mark component as unmounted
        // Remove the event callback to prevent memory leaks/stale logic
        if (callbackId) {
          msalInstance.removeEventCallback(callbackId);
        }
      };
    }).catch((error) => { 
      if(isMounted) console.error("Failed to initialize MSAL:", error);
    })
  }, [msalInstance]);

  if (!isMsalReady) {
    return <div>Initializing Authentication...</div>;
  }
  
  return (
    <MsalProvider instance={msalInstance}> 
      {children}
    </MsalProvider>
  )
}
