import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid as MuiGrid,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import MainLayout from '../components/layout/MainLayout';
import { muralPayApi } from '../services/api';

const Grid = (props: any) => {
    const { item, ...other } = props;
    return <MuiGrid {...(item ? { item: true } : {})} {...other} />;
  };

interface PayoutRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceAccountId: string;
  memo: string;
  status: string;
  transactionHash?: string;
  payouts: Array<{
    id: string;
    amount: {
      tokenSymbol: string;
      tokenAmount: number;
    };
    details: {
      type: string;
      fiatAndRailCode?: string;
      fiatAmount: {
        fiatAmount: number;
        fiatCurrencyCode: string;
      };
      fiatPayoutStatus: {
        type: string;
        completedAt?: string;
      };
      // other fields...
    };
  }>;
}

const PayoutRequestDetailPage: React.FC = () => {
  const { customerId, accountId, payoutRequestId } = useParams<{ customerId: string; accountId: string; payoutRequestId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutRequest, setPayoutRequest] = useState<PayoutRequest | null>(null);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);
  const accountIdentifier = process.env.REACT_APP_ACCOUNT_IDENTIFIER || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch payout request details using the proxy endpoint
        const response = await muralPayApi.getPayoutRequest(accountIdentifier, payoutRequestId!, customerId);
        
        // Check if the response has a results array
        if (response.data && response.data.results && Array.isArray(response.data.results)) {
          // Find the specific payout request by ID
          const foundPayoutRequest = response.data.results.find(
            (pr: any) => pr.id === payoutRequestId
          );
          
          if (foundPayoutRequest) {
            setPayoutRequest(foundPayoutRequest);
          } else {
            setError('Payout request not found in the results');
          }
        } else {
          // If it's a direct object, use it as is
          setPayoutRequest(response.data);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch payout request details');
      } finally {
        setLoading(false);
      }
    };
    if (customerId && accountId && payoutRequestId) {
      fetchData();
    }
  }, [customerId, accountId, payoutRequestId, accountIdentifier]);

  const handleExecuteClick = () => {
    setExecuteDialogOpen(true);
  };

  const handleExecuteClose = () => {
    setExecuteDialogOpen(false);
  };

  const handleExecutePayout = async () => {
    try {
      setExecuteLoading(true);
      
      await muralPayApi.executePayoutRequest(accountIdentifier, payoutRequestId!, customerId!);
      
      // Refresh the payout request data
      const response = await muralPayApi.getPayoutRequest(accountIdentifier, payoutRequestId!, customerId);
      
      // Handle the response format
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        const foundPayoutRequest = response.data.results.find(
          (pr: any) => pr.id === payoutRequestId
        );
        
        if (foundPayoutRequest) {
          setPayoutRequest(foundPayoutRequest);
        }
      } else {
        setPayoutRequest(response.data);
      }
      
      setExecuteDialogOpen(false);
    } catch (err: any) {
      console.error('Error executing payout request:', err);
      setError(err.message || 'Failed to execute payout request');
    } finally {
      setExecuteLoading(false);
    }
  };

  const getStatusChip = (status: string | undefined) => {
    // Handle undefined status
    if (!status) {
      return <Chip label="Unknown" color="default" size="small" />;
    }
    
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
    
    switch (status.toLowerCase()) {
      case 'executed':
      case 'completed':
        color = 'success';
        break;
      case 'awaiting_execution':
      case 'pending':
      case 'processing':
      case 'created':
        color = 'warning';
        break;
      case 'failed':
      case 'canceled':
        color = 'error';
        break;
    }
    
    return <Chip label={status} color={color} size="small" />;
  };

  if (loading) {
    return (
      <MainLayout title="Payout Request Details">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Payout Request Details">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </MainLayout>
    );
  }

  if (!payoutRequest) {
    return (
      <MainLayout title="Payout Request Details">
        <Alert severity="warning" sx={{ mt: 2 }}>
          Payout request not found
        </Alert>
      </MainLayout>
    );
  }

  // Get the first payout item (most requests have only one)
  const payoutItem = payoutRequest.payouts && payoutRequest.payouts.length > 0 ? payoutRequest.payouts[0] : null;

  return (
    <MainLayout title="Payout Request Details">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Payout Request Details
        </Typography>
        <Button
          variant="outlined"
          component={RouterLink}
          to={`/customers/${customerId}/accounts/${accountId}/payout-requests`}
          sx={{ mr: 2 }}
        >
          Back to Payout Requests
        </Button>
        {payoutRequest.status === 'AWAITING_EXECUTION' && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleExecuteClick}
          >
            Execute Payout
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Payout ID
            </Typography>
            <Typography variant="body1" gutterBottom>
              {payoutRequest.id}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            {getStatusChip(payoutRequest.status)}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Created
            </Typography>
            <Typography variant="body1" gutterBottom>
              {new Date(payoutRequest.createdAt).toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Last Updated
            </Typography>
            <Typography variant="body1" gutterBottom>
              {new Date(payoutRequest.updatedAt).toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              Description
            </Typography>
            <Typography variant="body1" gutterBottom>
              {payoutRequest.memo || 'No description provided'}
            </Typography>
          </Grid>
          {payoutRequest.transactionHash && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Transaction Hash
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ wordBreak: 'break-all' }}>
                {payoutRequest.transactionHash}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {payoutItem && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payout Details
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Amount
              </Typography>
              <Typography variant="h5" gutterBottom>
                {payoutItem.amount.tokenAmount.toLocaleString()} {payoutItem.amount.tokenSymbol}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Fiat Amount
              </Typography>
              <Typography variant="body1" gutterBottom>
                {payoutItem.details.fiatAmount.fiatAmount.toLocaleString()} {payoutItem.details.fiatAmount.fiatCurrencyCode}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Payout Type
              </Typography>
              <Typography variant="body1" gutterBottom>
                {payoutItem.details.type === 'fiat' ? 'Fiat Payout' : 'Crypto Payout'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Payout Status
              </Typography>
              <Box sx={{ mt: 1 }}>
                {getStatusChip(payoutItem.details.fiatPayoutStatus?.type)}
              </Box>
            </Grid>
            {payoutItem.details.fiatPayoutStatus?.completedAt && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Completed At
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(payoutItem.details.fiatPayoutStatus.completedAt).toLocaleString()}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Execute Payout Dialog */}
      <Dialog
        open={executeDialogOpen}
        onClose={handleExecuteClose}
      >
        <DialogTitle>Execute Payout Request</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to execute this payout request? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExecuteClose} disabled={executeLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleExecutePayout} 
            color="primary" 
            variant="contained"
            disabled={executeLoading}
          >
            {executeLoading ? <CircularProgress size={24} /> : 'Execute'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default PayoutRequestDetailPage;