import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid as MuiGrid,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';
import { muralPayApi } from '../services/api';

const Grid = (props: any) => {
  const { item, ...other } = props;
  return <MuiGrid {...(item ? { item: true } : {})} {...other} />;
};

interface Customer {
  id: string;
  type: 'individual' | 'business';
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;

  createdAt: string;
  updatedAt: string;
  kycStatus?: {
    type: string;
  };
}

interface Account {
  id: string;
  name: string;
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

const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tabValue, setTabValue] = useState(0);

  const accountIdentifier = process.env.REACT_APP_ACCOUNT_IDENTIFIER || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch customer details
        const customerResponse = await muralPayApi.getCustomer(accountIdentifier, customerId!);
        setCustomer(customerResponse.data);
        
        // Fetch customer accounts using the proxy endpoint
        const accountsData = await muralPayApi.getAllAccounts(accountIdentifier, customerId!);
        console.log('Accounts response:', accountsData);
        
        // Set the accounts directly from the returned data
        setAccounts(accountsData || []);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch customer data');
      } finally {
        setLoading(false);
      }
    };
    
    if (customerId) {
      fetchData();
    }
  }, [customerId, accountIdentifier]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Get customer display name based on type
  const getCustomerName = (customer: Customer): string => {
    if (customer.type === 'business') {
      return customer.name || 'Unnamed Business';
    } else {
      // For individual customers, combine first and last name
      return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unnamed Individual';
    }
  };

  // Get KYC status display
  const getKycStatus = (customer: Customer): string => {
    return customer.kycStatus?.type || 'unknown';
  };

  // Get KYC status chip color
  const getKycStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Format account status for display
  const formatStatus = (status: string): string => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <MainLayout title="Customer Details">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Customer Details">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </MainLayout>
    );
  }

  if (!customer) {
    return (
      <MainLayout title="Customer Details">
        <Alert severity="warning" sx={{ mt: 2 }}>
          Customer not found
        </Alert>
      </MainLayout>
    );
  }

  const customerName = getCustomerName(customer);
  const kycStatus = getKycStatus(customer);
  const kycStatusColor = getKycStatusColor(kycStatus);

  return (
    <MainLayout title={`Customer: ${customerName}`}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {customerName}
        </Typography>
        <Button
          variant="outlined"
          component={RouterLink}
          to="/customers"
          sx={{ mr: 2 }}
        >
          Back to Customers
        </Button>
      </Box>

      <Paper sx={{ mb: 4, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Customer Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{customer.email || 'Not provided'}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Type
            </Typography>
            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
              {customer.type}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              KYC Status
            </Typography>
            <Chip 
              label={kycStatus} 
              color={kycStatusColor} 
              size="small" 
              sx={{ textTransform: 'capitalize' }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Created
            </Typography>
            <Typography variant="body1">
              {new Date(customer.createdAt).toLocaleDateString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Last Updated
            </Typography>
            <Typography variant="body1">
              {new Date(customer.updatedAt).toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Accounts" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Accounts
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={RouterLink}
              to={`/customers/${customerId}/accounts`}
            >
              Create Account
            </Button>
          </Box>

          {accounts.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No accounts found for this customer.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                component={RouterLink}
                to={`/customers/${customerId}/accounts`}
                sx={{ mt: 2 }}
              >
                Create First Account
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {accounts.map((account) => (
                <Grid item xs={12} md={6} lg={4} key={account.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <AccountBalanceIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">{account.name}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Status: {account.status}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        API Enabled: {account.isApiEnabled ? 'Yes' : 'No'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Created: {new Date(account.createdAt).toLocaleDateString()}
                      </Typography>
                      
                      {/* Display balance if available */}
                      {account.accountDetails?.balances && account.accountDetails.balances.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Balance
                          </Typography>
                          {account.accountDetails.balances.map((balance, index) => (
                            <Typography key={index} variant="body2">
                              {balance.tokenAmount} {balance.tokenSymbol}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                    <Divider />
                    <CardActions>
                      <Button
                        size="small"
                        component={RouterLink}
                        to={`/customers/${customerId}/accounts/${account.id}`}
                      >
                        View Details
                      </Button>
                      <Button
                        size="small"
                        component={RouterLink}
                        to={`/customers/${customerId}/accounts/${account.id}/payout-requests`}
                      >
                        Payout Requests
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </MainLayout>
  );
};

export default CustomerDetailPage;
