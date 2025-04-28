import React, { useState, useEffect } from 'react';
import { Alert, Box, CircularProgress, Snackbar, Typography } from '@mui/material';

// Global state for rate limit notification
let notifyCallback: ((isRateLimited: boolean, retryAfter?: number) => void) | null = null;

// Function to be called from API service
export const notifyRateLimit = (isRateLimited: boolean, retryAfter?: number) => {
  if (notifyCallback) {
    notifyCallback(isRateLimited, retryAfter);
  }
};

const RateLimitAlert: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [retryTime, setRetryTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Register callback
    notifyCallback = (isRateLimited: boolean, retryAfter?: number) => {
      setOpen(isRateLimited);
      if (isRateLimited && retryAfter) {
        setRetryTime(retryAfter);
        setCountdown(Math.ceil(retryAfter));
      } else {
        setRetryTime(null);
        setCountdown(null);
      }
    };

    // Cleanup
    return () => {
      notifyCallback = null;
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown && countdown > 0 && open) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev !== null ? prev - 1 : null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, open]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={null} // Don't auto-hide, will be hidden when request completes
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert 
        severity="warning" 
        sx={{ width: '100%' }}
        icon={false}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography>
            Rate limit reached. {countdown ? `Retrying in ${countdown} seconds...` : 'Waiting and retrying automatically...'}
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default RateLimitAlert;