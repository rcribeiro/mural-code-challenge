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
    Tabs,
    Tab,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
  } from '@mui/material';
import {
  Payment as PaymentIcon,
} from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';
import { muralPayApi } from '../services/api';

const Grid = (props: any) => {
  const { item, ...other } = props;
  return <MuiGrid {...(item ? { item: true } : {})} {...other} />;
};

interface Account {
  id: string;
  name: string;
  type?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  isApiEnabled?: boolean;
  accountDetails?: {
    balances?: Array<{
      tokenAmount: number;
      tokenSymbol: string;
    }>;
    walletDetails?: {
      walletAddress: string;
      blockchain: string;
    };
    depositAccount?: {
      id: string;
      status: string;
      currency: string;
    };
  };
}

// First, let's update our Transaction interface to match the actual structure
interface Transaction {
  id: string;
  hash: string;
  transactionExecutionDate: string;
  blockchain: string;
  amount: {
    tokenAmount: number;
    tokenSymbol: string;
  };
  transactionDetails?: {
    type: string;
    details?: {
      depositStatusInfo?: {
        type: string;
      };
    };
    payoutId?: string;
    payoutRequestId?: string;
  };
  memo?: string;
}

const AccountDetailPage: React.FC = () => {
  const { customerId, accountId } = useParams<{ customerId: string; accountId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const accountIdentifier = process.env.REACT_APP_ACCOUNT_IDENTIFIER || '';

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId || !accountId || !accountIdentifier) {
        setError('Missing required parameters');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First, try to get all accounts for this customer
        const accountsResponse = await muralPayApi.getAccounts(accountIdentifier, customerId);
        console.log('Accounts response:', accountsResponse.data);
        
        // Extract accounts array
        let accountsData: Account[] = [];
        if (Array.isArray(accountsResponse.data)) {
          accountsData = accountsResponse.data;
        } else if (accountsResponse.data && typeof accountsResponse.data === 'object') {
          if (Array.isArray(accountsResponse.data.accounts)) {
            accountsData = accountsResponse.data.accounts;
          } else if (Array.isArray(accountsResponse.data.data)) {
            accountsData = accountsResponse.data.data;
          } else if (Array.isArray(accountsResponse.data.items)) {
            accountsData = accountsResponse.data.items;
          } else if (Array.isArray(accountsResponse.data.results)) {
            accountsData = accountsResponse.data.results;
          }
        }
        
        // Find the specific account by ID
        const foundAccount = accountsData.find(acc => acc.id === accountId);
        
        if (foundAccount) {
          setAccount(foundAccount);
          console.log('Found account:', foundAccount);
        } else {
          // If not found in the list, try direct API call
          try {
            const accountResponse = await muralPayApi.getAccount(accountIdentifier, accountId, customerId);
            setAccount(accountResponse.data);
            console.log('Direct account response:', accountResponse.data);
          } catch (accountErr: any) {
            console.error('Error fetching specific account:', accountErr);
            setError(`Failed to fetch account details: ${accountErr.message}`);
          }
        }
        
        // Fetch transactions
        try {
          const transactionsResponse = await muralPayApi.getTransactions(accountIdentifier, accountId, customerId);
          console.log('Transactions response:', transactionsResponse.data);
          
          // Extract transactions from the response
          let transactionsData: Transaction[] = [];
          if (transactionsResponse.data && typeof transactionsResponse.data === 'object') {
            if (Array.isArray(transactionsResponse.data.results)) {
              transactionsData = transactionsResponse.data.results;
            } else if (Array.isArray(transactionsResponse.data.transactions)) {
              transactionsData = transactionsResponse.data.transactions;
            } else if (Array.isArray(transactionsResponse.data.data)) {
              transactionsData = transactionsResponse.data.data;
            } else if (Array.isArray(transactionsResponse.data.items)) {
              transactionsData = transactionsResponse.data.items;
            } else if (Array.isArray(transactionsResponse.data)) {
              transactionsData = transactionsResponse.data;
            }
          }
          
          setTransactions(transactionsData);
        } catch (transErr: any) {
          console.error('Error fetching transactions:', transErr);
          // Don't set error for transactions, just log it
        }
        
      } catch (err: any) {
        console.error('Error in fetchData:', err);
        setError(err.message || 'Failed to fetch account data');
      } finally {
        setLoading(false);
      }
    };    
    if (customerId && accountId) {
      fetchData();
    }
  }, [customerId, accountId, accountIdentifier]);

  // Add a function to determine transaction status based on transaction details
  const determineTransactionStatus = (transaction: Transaction): string => {
    // For deposit transactions
    if (transaction.transactionDetails?.type === 'deposit') {
      // If we have deposit status info, use that
      if (transaction.transactionDetails.details?.depositStatusInfo?.type) {
        return transaction.transactionDetails.details.depositStatusInfo.type.toUpperCase();
      }
      // Otherwise, assume completed since it's in the blockchain
      return 'COMPLETED';
    }
    
    // For payout transactions
    if (transaction.transactionDetails?.type === 'payout') {
      // If it has a hash and is in the blockchain, it's executed
      if (transaction.hash) {
        return 'EXECUTED';
      }
      // Otherwise, it's pending
      return 'PENDING';
    }
    
    // Default status for other transaction types
    return 'COMPLETED';
  };

  // And update the getStatusChip function to handle our new status values
  const getStatusChip = (status: string | undefined | null) => {
    // Default color and label
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
    let label = 'Unknown';
    
    // Only process if status is a non-empty string
    if (status && typeof status === 'string' && status.trim() !== '') {
      label = status;
      
      try {
        const statusLower = status.toLowerCase();
        
        if (statusLower === 'active' || 
            statusLower === 'completed' || 
            statusLower === 'executed') {
          color = 'success';
        } else if (statusLower === 'pending' || 
                  statusLower === 'processing' || 
                  statusLower === 'awaiting_execution') {
          color = 'warning';
        } else if (statusLower === 'inactive' || 
                  statusLower === 'failed' || 
                  statusLower === 'canceled') {
          color = 'error';
        }
      } catch (e) {
        console.error('Error processing status:', e);
        // Keep default values if there's an error
      }
    }
    
    return <Chip label={label} color={color} size="small" />;
  };

  if (loading) {
    return (
      <MainLayout title="Account Details">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Account Details">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          component={RouterLink}
          to={`/customers/${customerId}/accounts`}
          sx={{ mt: 2 }}
        >
          Back to Accounts
        </Button>
      </MainLayout>
    );
  }

  if (!account) {
    return (
      <MainLayout title="Account Details">
        <Alert severity="warning" sx={{ mt: 2 }}>
          Account not found
        </Alert>
        <Button
          variant="outlined"
          component={RouterLink}
          to={`/customers/${customerId}/accounts`}
          sx={{ mt: 2 }}
        >
          Back to Accounts
        </Button>
      </MainLayout>
    );
  }

  // Determine account type
  const accountType = account.type || 
    (account.accountDetails?.walletDetails?.blockchain ? 'Blockchain' : 'Standard');

  // Get balance information
  const balance = account.accountDetails?.balances && account.accountDetails.balances.length > 0
    ? {
        available: account.accountDetails.balances[0].tokenAmount,
        pending: 0,
        currency: account.accountDetails.balances[0].tokenSymbol
      }
    : undefined;

  return (
    <MainLayout title={`Account: ${account.name}`}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {account.name}
        </Typography>
        <Button
          variant="outlined"
          component={RouterLink}
          to={`/customers/${customerId}/accounts`}
          sx={{ mr: 2 }}
        >
          Back to Accounts
        </Button>
        <Button
          variant="contained"
          component={RouterLink}
          to={`/customers/${customerId}/accounts/${accountId}/payout-requests`}
        >
          Manage Payouts
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Account Type
                </Typography>
                <Typography variant="body1">
                  {accountType.charAt(0).toUpperCase() + accountType.slice(1)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Box>
                  {getStatusChip(account.status)}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {new Date(account.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Account ID
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                  {account.id}
                </Typography>
              </Grid>
              
              {account.accountDetails?.walletDetails && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Blockchain Details
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Blockchain
                    </Typography>
                    <Typography variant="body1">
                      {account.accountDetails.walletDetails.blockchain}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Wallet Address
                    </Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                      {account.accountDetails.walletDetails.walletAddress}
                    </Typography>
                  </Grid>
                </>
              )}
              
              {account.accountDetails?.depositAccount && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Deposit Account
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Currency
                    </Typography>
                    <Typography variant="body1">
                      {account.accountDetails.depositAccount.currency}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Box>
                      {getStatusChip(account.accountDetails.depositAccount.status)}
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Balance
            </Typography>
            {balance ? (
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h3" sx={{ mb: 2 }}>
                  {balance.available.toLocaleString()} {balance.currency}
                </Typography>
                {balance.pending > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Pending: {balance.pending.toLocaleString()} {balance.currency}
                  </Typography>
                )}
              </Box>
            ) : (
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Balance information not available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Transactions" />
          <Tab label="Payout Requests" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            Recent Transactions
          </Typography>
          
          {transactions.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No transactions found for this account.
              </Typography>
            </Paper>
          ) : (
            <Paper>
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction) => {
                      // Determine transaction status
                      const status = determineTransactionStatus(transaction);
                      
                      // Safely extract other values with fallbacks
                      const date = transaction.transactionExecutionDate || '';
                      const description = transaction.memo || 
                        (transaction.transactionDetails?.type === 'deposit' ? 'Deposit' : 'Payout') + 
                        (transaction.hash ? ` (${transaction.hash.substring(0, 8)}...)` : '');
                      const type = transaction.transactionDetails?.type || 'Unknown';
                      const amount = transaction.amount?.tokenAmount || 0;
                      const currency = transaction.amount?.tokenSymbol || '';
                      
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {date ? new Date(date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>{description}</TableCell>
                          <TableCell>{type.charAt(0).toUpperCase() + type.slice(1)}</TableCell>
                          <TableCell align="right">
                            {amount.toLocaleString()} {currency}
                          </TableCell>
                          <TableCell>
                            {getStatusChip(status)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          )}
        </>
      )}

      {tabValue === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Payout Requests
            </Typography>
            <Button
              variant="contained"
              startIcon={<PaymentIcon />}
              component={RouterLink}
              to={`/customers/${customerId}/accounts/${accountId}/payout-requests`}
            >
              View All Payout Requests
            </Button>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<PaymentIcon />}
            component={RouterLink}
            to={`/customers/${customerId}/accounts/${accountId}/payout-requests/create`}
            sx={{ mb: 3 }}
          >
            Create New Payout Request
          </Button>
        </>
      )}
    </MainLayout>
  );
};

export default AccountDetailPage;
