import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { 
  signIn, 
  signOut, 
  signUp, 
  confirmSignUp, 
  getCurrentUser,
  fetchAuthSession
} from '@aws-amplify/auth';
import { Hub } from '@aws-amplify/core';

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
      loginWith: {
        email: true,
        username: true,
      },
    },
  }
});

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  signIn: (username: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  signUp: (username: string, password: string, email: string) => Promise<any>;
  confirmSignUp: (username: string, code: string) => Promise<any>;
  refreshAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  const refreshAuthState = async () => {
    setIsLoading(true);
    try {
      // Check if we have a valid session
      const session = await fetchAuthSession();
      if (session && session.tokens) {
        const userData = await getCurrentUser();
        setIsAuthenticated(true);
        setUser(userData);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.log('No current user', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuthState();

    const hubListener = Hub.listen('auth', (data) => {
      const { event } = data.payload;
      console.log('Auth event:', event);
      
      switch (event) {
        case 'signedIn':
          refreshAuthState();
          break;
        case 'signedOut':
          setIsAuthenticated(false);
          setUser(null);
          break;
        case 'tokenRefresh':
          refreshAuthState();
          break;
      }
    });

    return () => {
      hubListener();
    };
  }, []);

  const handleSignIn = async (username: string, password: string) => {
    try {
      // First check if there's already a signed-in user and sign them out
      try {
        await signOut();
      } catch (e) {
        // Ignore errors during sign out
      }
      
      // Now attempt to sign in
      const user = await signIn({ username, password });
      await refreshAuthState();
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const handleSignUp = async (username: string, password: string, email: string) => {
    try {
      const result = await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });
      return result;
    } catch (error) {
      throw error;
    }
  };

  const handleConfirmSignUp = async (username: string, code: string) => {
    try {
      return await confirmSignUp({ username, confirmationCode: code });
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        signIn: handleSignIn,
        signOut: handleSignOut,
        signUp: handleSignUp,
        confirmSignUp: handleConfirmSignUp,
        refreshAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
