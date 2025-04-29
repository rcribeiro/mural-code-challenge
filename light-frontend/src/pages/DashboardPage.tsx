import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid as MuiGrid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Business as BusinessIcon,
  AccountBalance as AccountBalanceIcon,
  Payment as PaymentIcon,
  CurrencyExchange as CurrencyExchangeIcon,
  Person as PersonIcon,
  VerifiedUser as VerifiedUserIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import MainLayout from '../components/layout/MainLayout';
import { muralPayApi, exchangeRateApi } from '../services/api';

const Grid = (props: any) => {
  const { item, ...other } = props;
  return <MuiGrid {...(item ? { item: true } : {})} {...other} />;
};

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  date: string;
}

interface CustomerStats {
  total: number;
  business: number;
  individual: number;
  kycApproved: number;
}

interface Customer {
  kycStatus: any;
  id: string;
  type: 'individual' | 'business';
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
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
  };
}

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats>({
    total: 0,
    business: 0,
    individual: 0,
    kycApproved: 0,
  });
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [openCreateAccountDialog, setOpenCreateAccountDialog] = useState(false);
  const [openCreatePayoutDialog, setOpenCreatePayoutDialog] = useState(false);
  const [selectedCustomerAccounts, setSelectedCustomerAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();

  const accountIdentifier = process.env.REACT_APP_ACCOUNT_IDENTIFIER || '';

  // Helper function to get customer display name
  const getCustomerName = (customer: Customer): string => {
    if (customer.type === 'business') {
      return customer.name || 'Unnamed Business';
    } else {
      return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unnamed Individual';
    }
  };

  // Customer selection form for creating an account
  const customerSelectionFormik = useFormik({
    initialValues: {
      customerId: '',
    },
    validationSchema: Yup.object({
      customerId: Yup.string().required('Please select a customer'),
    }),
    onSubmit: (values) => {
      // Navigate to the accounts page for the selected customer
      navigate(`/customers/${values.customerId}/accounts`);
      setOpenCreateAccountDialog(false);
    },
  });

  // Payout creation form - two steps: customer selection, then account selection
  const payoutSelectionFormik = useFormik({
    initialValues: {
      customerId: '',
      accountId: '',
    },
    validationSchema: Yup.object({
      customerId: Yup.string().required('Please select a customer'),
      accountId: Yup.string().when('customerId', {
        is: (val: string) => Boolean(val && val.length > 0),
        then: () => Yup.string().required('Please select an account'),
        otherwise: () => Yup.string(),
      }),
    }),
    onSubmit: (values) => {
      // Navigate to create payout page with the selected customer and account
      navigate(`/customers/${values.customerId}/accounts/${values.accountId}/payout-requests/create`);
      setOpenCreatePayoutDialog(false);
      setActiveStep(0); // Reset step for next time
    },
  });

  // Fetch accounts for a selected customer
  const fetchCustomerAccounts = async (customerId: string) => {
    if (!customerId) return;
    
    try {
      setLoadingAccounts(true);
      setAccountsError(null);
      
      const response = await muralPayApi.getAccounts(accountIdentifier, customerId);
      
      let accountsData: Account[] = [];
      
      if (Array.isArray(response.data)) {
        accountsData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.accounts)) {
          accountsData = response.data.accounts;
        } else if (Array.isArray(response.data.data)) {
          accountsData = response.data.data;
        } else if (Array.isArray(response.data.items)) {
          accountsData = response.data.items;
        } else if (Array.isArray(response.data.results)) {
          accountsData = response.data.results;
        }
      }
      
      setSelectedCustomerAccounts(accountsData);
    } catch (err: any) {
      console.error('Error fetching customer accounts:', err);
      setAccountsError(err.message || 'Failed to fetch accounts');
      setSelectedCustomerAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Handle customer selection in payout dialog
  const handleCustomerChange = async (event: React.ChangeEvent<{ value: unknown }>) => {
    const customerId = event.target.value as string;
    payoutSelectionFormik.setFieldValue('customerId', customerId);
    payoutSelectionFormik.setFieldValue('accountId', ''); // Reset account selection
    if (customerId) {
      await fetchCustomerAccounts(customerId);
      setActiveStep(1); // Move to account selection step
    }
  };

  // Handle next step in payout dialog
  const handleNextStep = () => {
    if (activeStep === 0 && payoutSelectionFormik.values.customerId) {
      setActiveStep(1);
    }
  };

  // Handle back step in payout dialog
  const handleBackStep = () => {
    if (activeStep === 1) {
      setActiveStep(0);
    }
  };

  // Reset payout dialog state when closing
  const handleClosePayoutDialog = () => {
    setOpenCreatePayoutDialog(false);
    setActiveStep(0);
    payoutSelectionFormik.resetForm();
    setSelectedCustomerAccounts([]);
  };

  // Function to fetch all customers with pagination
  const fetchAllCustomers = async () => {
    try {
      let allCustomers: Customer[] = [];
      let nextId: string | undefined = undefined;
      let hasMore = true;
      
      // Keep fetching until we have all customers
      while (hasMore) {
        const response: { data: any } = await muralPayApi.getCustomers(accountIdentifier, {}, 100, nextId);
        
        let newCustomers: Customer[] = [];
        
        if (Array.isArray(response.data)) {
          newCustomers = response.data;
        } else if (response.data && typeof response.data === 'object') {
          if (Array.isArray(response.data.customers)) {
            newCustomers = response.data.customers;
            nextId = response.data.nextId;
          } else if (Array.isArray(response.data.data)) {
            newCustomers = response.data.data;
            nextId = response.data.nextId || response.data.next;          } else if (Array.isArray(response.data.items)) {
            newCustomers = response.data.items;
            nextId = response.data.nextId;
          } else if (Array.isArray(response.data.results)) {
            newCustomers = response.data.results;
            nextId = response.data.nextId;
          }
        }
        
        // Add new customers to our collection, avoiding duplicates
        const existingIds = new Set(allCustomers.map(c => c.id));
        const uniqueNewCustomers = newCustomers.filter(c => !existingIds.has(c.id));
        allCustomers = [...allCustomers, ...uniqueNewCustomers];
        
        // Check if we need to continue fetching
        hasMore = !!nextId && newCustomers.length > 0;
        
        // If we've fetched a lot of customers already, break to avoid infinite loops
        if (allCustomers.length > 1000) {
          console.warn('Stopped fetching customers after reaching 1000 records');
          break;
        }
      }
      
      return allCustomers;
    } catch (error) {
      console.error('Error fetching all customers:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all customers with pagination
        const customersData = await fetchAllCustomers();
        console.log('Dashboard fetched customers:', customersData.length);
        
        setCustomers(customersData);
        
        // Calculate stats
        const stats: CustomerStats = {
          total: customersData.length,
          business: customersData.filter(c => c.type === 'business').length,
          individual: customersData.filter(c => c.type === 'individual').length,
          kycApproved: customersData.filter(c => c.kycStatus?.type?.toLowerCase() === 'approved').length,
        };
        
        setCustomerStats(stats);
        
        // Fetch exchange rates (external API integration)
        const exchangeRatesResponse = await exchangeRateApi.getExchangeRates();
        setExchangeRates(exchangeRatesResponse.data);
        
        setLoading(false);
      } catch (err: any) {
        console.error('Dashboard error:', err);
        setError(err.message || 'Failed to fetch dashboard data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [accountIdentifier]);

  return (
    <MainLayout title="Dashboard">
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome to Mural Light
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your Mural Pay integrations and payments from one place.
            </Typography>
          </Box>
          
          <Grid container spacing={3}>
            {/* Customer Stats */}
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BusinessIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Customers</Typography>
                  </Box>
                  <Typography variant="h3">{customerStats.total}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    Total organizations
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip 
                      icon={<BusinessIcon />} 
                      label={`${customerStats.business} Business`} 
                      color="primary" 
                      size="small" 
                      variant="outlined"
                    />
                    <Chip 
                      icon={<PersonIcon />} 
                      label={`${customerStats.individual} Individual`} 
                      color="secondary" 
                      size="small" 
                      variant="outlined"
                    />
                  </Stack>
                  <Chip 
                    icon={<VerifiedUserIcon />} 
                    label={`${customerStats.kycApproved} KYC Approved`} 
                    color="success" 
                    size="small" 
                    variant="outlined"
                  />
                </CardContent>
                <Divider />
                <CardActions>
                  <Button
                    size="small"
                    component={RouterLink}
                    to="/customers"
                  >
                    View All
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            {/* Exchange Rates */}
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CurrencyExchangeIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Exchange Rates</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Base: {exchangeRates?.base}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {exchangeRates?.rates?.EUR && (
                      <Typography variant="body2">
                        EUR: {exchangeRates.rates.EUR.toFixed(2)}
                      </Typography>
                    )}
                    {exchangeRates?.rates?.GBP && (
                      <Typography variant="body2">
                        GBP: {exchangeRates.rates.GBP.toFixed(2)}
                      </Typography>
                    )}
                    {exchangeRates?.rates?.CAD && (
                      <Typography variant="body2">
                        CAD: {exchangeRates.rates.CAD.toFixed(2)}
                      </Typography>
                    )}
                    {exchangeRates?.rates?.BRL && (
                      <Typography variant="body2">
                        BRL: {exchangeRates.rates.BRL.toFixed(2)}
                      </Typography>
                    )}
                    {exchangeRates?.rates?.JPY && (
                      <Typography variant="body2">
                        JPY: {exchangeRates.rates.JPY.toFixed(2)}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Updated: {exchangeRates?.date}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Quick Actions */}
            <Grid item xs={12} md={6} lg={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<BusinessIcon />}
                        component={RouterLink}
                        to="/customers"
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        Manage Customers
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<AccountBalanceIcon />}
                        onClick={() => setOpenCreateAccountDialog(true)}
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        Create Account
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<PaymentIcon />}
                        onClick={() => setOpenCreatePayoutDialog(true)}
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        Create Payout
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
                <Divider />
                <CardActions>
                  <Button
                    size="small"
                    component={RouterLink}
                    to="/customers"
                  >
                    View All
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Customer Selection Dialog for Creating Account */}
      <Dialog 
        open={openCreateAccountDialog} 
        onClose={() => setOpenCreateAccountDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={customerSelectionFormik.handleSubmit}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccountBalanceIcon sx={{ mr: 1 }} />
              Select Customer for New Account
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph sx={{ mt: 1 }}>
              To create a new account, please select the customer who will own this account.
            </Typography>
            
            <FormControl 
              fullWidth 
              sx={{ mt: 2 }}
              error={customerSelectionFormik.touched.customerId && Boolean(customerSelectionFormik.errors.customerId)}
            >
              <InputLabel id="customer-select-label">Customer</InputLabel>
              <Select
                labelId="customer-select-label"
                id="customerId"
                name="customerId"
                value={customerSelectionFormik.values.customerId}
                onChange={customerSelectionFormik.handleChange}
                label="Customer"
              >
                {customers.length === 0 ? (
                  <MenuItem disabled value="">
                    No customers available
                  </MenuItem>
                ) : (
                  customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {getCustomerName(customer)} {customer.email ? `(${customer.email})` : ''}
                    </MenuItem>
                  ))
                )}
              </Select>
              {customerSelectionFormik.touched.customerId && customerSelectionFormik.errors.customerId && (
                <FormHelperText>{customerSelectionFormik.errors.customerId}</FormHelperText>
              )}
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreateAccountDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              startIcon={<AddIcon />}
              disabled={!customerSelectionFormik.values.customerId || customerSelectionFormik.isSubmitting}
            >
              Continue
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Customer and Account Selection Dialog for Creating Payout */}
      <Dialog 
        open={openCreatePayoutDialog} 
        onClose={handleClosePayoutDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PaymentIcon sx={{ mr: 1 }} />
            Create New Payout
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 3 }}>
            <Step>
              <StepLabel>Select Customer</StepLabel>
            </Step>
            <Step>
              <StepLabel>Select Account</StepLabel>
            </Step>
          </Stepper>

          <form id="payout-selection-form" onSubmit={payoutSelectionFormik.handleSubmit}>
            {activeStep === 0 ? (
              <FormControl 
                fullWidth 
                error={payoutSelectionFormik.touched.customerId && Boolean(payoutSelectionFormik.errors.customerId)}
              >
                <InputLabel id="payout-customer-select-label">Customer</InputLabel>
                <Select
                  labelId="payout-customer-select-label"
                  id="customerId"
                  name="customerId"
                  value={payoutSelectionFormik.values.customerId}
                  onChange={(e) => handleCustomerChange(e as any)}
                  label="Customer"
                >
                  {customers.length === 0 ? (
                    <MenuItem disabled value="">
                      No customers available
                    </MenuItem>
                  ) : (
                    customers.map((customer) => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {getCustomerName(customer)} {customer.email ? `(${customer.email})` : ''}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {payoutSelectionFormik.touched.customerId && payoutSelectionFormik.errors.customerId && (
                  <FormHelperText>{payoutSelectionFormik.errors.customerId}</FormHelperText>
                )}
              </FormControl>
            ) : (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Customer: {
                    customers.find(c => c.id === payoutSelectionFormik.values.customerId) ? 
                    getCustomerName(customers.find(c => c.id === payoutSelectionFormik.values.customerId)!) : 
                    'Unknown'
                  }
                </Typography>
                
                {loadingAccounts ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : accountsError ? (
                  <Alert severity="error" sx={{ my: 2 }}>
                    {accountsError}
                  </Alert>
                ) : selectedCustomerAccounts.length === 0 ? (
                  <Alert severity="info" sx={{ my: 2 }}>
                    No accounts found for this customer. Please create an account first.
                  </Alert>
                ) : (
                  <FormControl 
                    fullWidth 
                    sx={{ mt: 2 }}
                    error={payoutSelectionFormik.touched.accountId && Boolean(payoutSelectionFormik.errors.accountId)}
                  >
                    <InputLabel id="payout-account-select-label">Account</InputLabel>
                    <Select
                      labelId="payout-account-select-label"
                      id="accountId"
                      name="accountId"
                      value={payoutSelectionFormik.values.accountId}
                      onChange={payoutSelectionFormik.handleChange}
                      label="Account"
                    >
                      {selectedCustomerAccounts.map((account) => (
                        <MenuItem key={account.id} value={account.id}>
                          {account.name} {account.accountDetails?.balances && account.accountDetails.balances.length > 0 ? 
                            `(${account.accountDetails.balances[0].tokenAmount} ${account.accountDetails.balances[0].tokenSymbol})` : 
                            ''}
                        </MenuItem>
                      ))}
                    </Select>
                    {payoutSelectionFormik.touched.accountId && payoutSelectionFormik.errors.accountId && (
                      <FormHelperText>{payoutSelectionFormik.errors.accountId}</FormHelperText>
                    )}
                  </FormControl>
                )}
              </>
            )}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePayoutDialog}>
            Cancel
          </Button>
          
          {activeStep === 1 && (
            <Button onClick={handleBackStep}>
              Back
            </Button>
          )}
          
          {activeStep === 0 ? (
            <Button 
              onClick={handleNextStep}
              variant="contained" 
              disabled={!payoutSelectionFormik.values.customerId}
              endIcon={<ArrowForwardIcon />}
            >
              Next
            </Button>
          ) : (
            <Button 
              type="submit"
              form="payout-selection-form"
              variant="contained" 
              startIcon={<PaymentIcon />}
              disabled={
                !payoutSelectionFormik.values.accountId || 
                payoutSelectionFormik.isSubmitting || 
                selectedCustomerAccounts.length === 0
              }
            >
              Create Payout
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default DashboardPage;
