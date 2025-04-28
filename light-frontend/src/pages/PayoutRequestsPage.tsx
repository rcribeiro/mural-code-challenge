import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';
import { muralPayApi } from '../services/api';

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

const PayoutRequestsPage: React.FC = () => {
  const { customerId, accountId } = useParams<{ customerId: string; accountId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<string | null>(null);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [accountName, setAccountName] = useState('');

  const accountIdentifier = process.env.REACT_APP_ACCOUNT_IDENTIFIER || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch account details to get the name
        const accountResponse = await muralPayApi.getAccount(accountIdentifier, accountId!, customerId as string);
        setAccountName(accountResponse.data.name);
        
        // Fetch payout requests
        const payoutsResponse = await muralPayApi.getPayoutRequests(accountIdentifier, accountId!, customerId);
        
        // Log the response for debugging
        console.log('Payouts response:', payoutsResponse.data);
        
        // Extract the results array from the response
        const payoutsData = payoutsResponse.data?.results || [];
        setPayoutRequests(payoutsData);
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch payout requests');
      } finally {
        setLoading(false);
      }
    };
    
    if (customerId && accountId) {
      fetchData();
    }
  }, [customerId, accountId, accountIdentifier]);

  const handleExecuteClick = (payoutId: string) => {
    setSelectedPayout(payoutId);
    setExecuteDialogOpen(true);
  };

  const handleExecuteClose = () => {
    setExecuteDialogOpen(false);
    setSelectedPayout(null);
  };

  const handleExecutePayout = async () => {
    if (!selectedPayout) return;
    
    try {
      setExecuteLoading(true);
      await muralPayApi.executePayoutRequest(accountIdentifier, accountId!, selectedPayout);
      
      // Refresh the payout requests
      const filter = { accountId: accountId };
      const payoutsResponse = await muralPayApi.getPayoutRequests(accountIdentifier, accountId!, customerId);
      setPayoutRequests(Array.isArray(payoutsResponse.data) 
        ? payoutsResponse.data 
        : (payoutsResponse.data?.payouts || []));
      
      setExecuteDialogOpen(false);
      setSelectedPayout(null);
    } catch (err: any) {
      setError(err.message || 'Failed to execute payout request');
    } finally {
      setExecuteLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
    
    switch (status.toLowerCase()) {
      case 'completed':
        color = 'success';
        break;
      case 'pending':
      case 'processing':
        color = 'warning';
        break;
      case 'failed':
      case 'cancelled':
        color = 'error';
        break;
    }
    
    return <Chip label={status} color={color} size="small" />;
  };

  return (
    <MainLayout title="Payout Requests">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Payout Requests for {accountName}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={RouterLink}
          to={`/customers/${customerId}/accounts/${accountId}/payout-requests/create`}
        >
          Create Payout Request
        </Button>
      </Box>

      <Button
        variant="outlined"
        component={RouterLink}
        to={`/customers/${customerId}/accounts/${accountId}`}
        sx={{ mb: 3 }}
      >
        Back to Account
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
              <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payoutRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No payout requests found. Create your first payout request.
                  </TableCell>
                </TableRow>
              ) : (
                payoutRequests.map((payout) => {
                  // Get the first payout item (most requests have only one)
                  const payoutItem = payout.payouts && payout.payouts.length > 0 ? payout.payouts[0] : null;
                  
                  return (
                    <TableRow key={payout.id}>
                      <TableCell>{new Date(payout.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{payout.memo || 'No description'}</TableCell>
                      <TableCell>
                        {/* Display recipient info if available */}
                        {payoutItem?.details?.type === 'fiat' ? 'Fiat Payout' : 'Crypto Payout'}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {payoutItem?.details?.fiatAndRailCode || ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {payoutItem ? 
                          `${payoutItem.amount.tokenAmount.toLocaleString()} ${payoutItem.amount.tokenSymbol}` : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>{getStatusChip(payout.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          component={RouterLink}
                          to={`/customers/${customerId}/accounts/${accountId}/payout-requests/${payout.id}`}
                          sx={{ mr: 1 }}
                        >
                          View
                        </Button>
                        {payout.status === 'AWAITING_EXECUTION' && (
                          <Button
                            variant="contained"
                            size="small"
                            color="primary"
                            onClick={() => handleExecuteClick(payout.id)}
                          >
                            Execute
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
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

export default PayoutRequestsPage;
