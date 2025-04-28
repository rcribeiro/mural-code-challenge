import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { config } from './config';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import AccountsPage from './pages/AccountsPage';
import AccountDetailPage from './pages/AccountDetailPage';
import PayoutRequestsPage from './pages/PayoutRequestsPage';
import CreatePayoutRequestPage from './pages/CreatePayoutRequestPage';
import NotFoundPage from './pages/NotFoundPage';
import PayoutRequestDetailPage from './pages/PayoutRequestDetailPage';
import RateLimitAlert, { notifyRateLimit } from './components/common/RateLimitAlert';

// Add this before the Amplify.configure call
console.log('Cognito Config:', {
  userPoolId: config.cognito.userPoolId,
  userPoolClientId: config.cognito.userPoolWebClientId,
  region: config.cognito.region
});

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.cognito.userPoolId,
      userPoolClientId: config.cognito.userPoolWebClientId,
      loginWith: {
        email: true,
        username: true,
      },
    },
  },
});

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Blue
    },
    secondary: {
      main: '#f50057', // Pink
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection:', event.reason);
      
      // Check if it's a rate limit error
      const error = event.reason;
      const isRateLimited = 
        error?.response?.status === 429 || 
        (error?.response?.status === 500 && 
         ((error?.response?.data && 
           typeof error.response.data === 'object' && 
           'message' in error.response.data && 
           typeof error.response.data.message === 'string' && 
           error.response.data.message.includes('ThrottlerException')) ||
          (typeof error?.response?.data === 'string' && 
           error.response.data.includes('ThrottlerException'))));
      
      if (isRateLimited) {
        notifyRateLimit(true);
        // Hide after 5 seconds
        setTimeout(() => notifyRateLimit(false), 5000);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <RateLimitAlert />
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            <Route path="/customers" element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            } />
            
            <Route path="/customers/:customerId" element={
              <ProtectedRoute>
                <CustomerDetailPage />
              </ProtectedRoute>
            } />
            
            <Route path="/customers/:customerId/accounts" element={
              <ProtectedRoute>
                <AccountsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/customers/:customerId/accounts/:accountId" element={
              <ProtectedRoute>
                <AccountDetailPage />
              </ProtectedRoute>
            } />
            
            <Route path="/customers/:customerId/accounts/:accountId/payout-requests" element={
              <ProtectedRoute>
                <PayoutRequestsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/customers/:customerId/accounts/:accountId/payout-requests/create" element={
              <ProtectedRoute>
                <CreatePayoutRequestPage />
              </ProtectedRoute>
            } />
            
            <Route path="/customers/:customerId/accounts/:accountId/payout-requests/:payoutRequestId" element={
              <ProtectedRoute>
                <PayoutRequestDetailPage />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
