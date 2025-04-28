import React, { useCallback, useEffect, useState } from 'react';
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
  DialogActions,
  TextField,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import MainLayout from '../components/layout/MainLayout';
import { muralPayApi } from '../services/api';

interface Account {
  updatedAt: string | number | Date;
  isApiEnabled: any;
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

const AccountsPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customer, setCustomer] = useState<any>(null);

  const accountIdentifier = process.env.REACT_APP_ACCOUNT_IDENTIFIER || '';

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch customer details
      const customerResponse = await muralPayApi.getCustomer(accountIdentifier, customerId!);
      setCustomerName(customerResponse.data.name);
      
      // Fetch customer accounts
      const accountsResponse = await muralPayApi.getAccounts(accountIdentifier, customerId!);
      console.log('Accounts response:', accountsResponse.data);
      
      // Extract accounts array from the response
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
      
      setAccounts(accountsData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch customer data');
    } finally {
      setLoading(false);
    }
  }, [customerId, accountIdentifier]);
  
  useEffect(() => {
    if (customerId) {
      fetchAccounts();
    }
  }, [customerId, fetchAccounts]);

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Account name is required'),
      description: Yup.string(),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        if (!customerId) {
          throw new Error('Customer ID is required');
        }
        const accountData = {
          name: values.name,
          description: values.description,
          organizationId: customerId,
        };
        await muralPayApi.createAccount(accountIdentifier, customerId, accountData);
        resetForm();
        setOpenDialog(false);
        fetchAccounts();
      } catch (err: any) {
        setError(err.message || 'Failed to create account');
      }
    },  });

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    formik.resetForm();
  };

  const getStatusChip = (status: string) => {
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
    
    switch (status.toLowerCase()) {
      case 'active':
        color = 'success';
        break;
      case 'pending':
        color = 'warning';
        break;
      case 'inactive':
        color = 'error';
        break;
    }
    
    return <Chip label={status} color={color} size="small" />;
  };

  return (
    <MainLayout title="Accounts">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Accounts for {customerName}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Add Account
        </Button>
      </Box>

      <Button
        variant="outlined"
        component={RouterLink}
        to={`/customers/${customerId}`}
        sx={{ mb: 3 }}
      >
        Back to Customer
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
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>API Enabled</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No accounts found. Create your first account.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{getStatusChip(account.status)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={account.isApiEnabled ? "Enabled" : "Disabled"} 
                        color={account.isApiEnabled ? "success" : "default"} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{new Date(account.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(account.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        component={RouterLink}
                        to={`/customers/${customerId}/accounts/${account.id}`}
                        sx={{ mr: 1 }}
                      >
                        View
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        component={RouterLink}
                        to={`/customers/${customerId}/accounts/${account.id}/payout-requests`}
                      >
                        Payouts
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Account Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Account</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              margin="dense"
              id="name"
              name="name"
              label="Account Name"
              fullWidth
              variant="outlined"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
            />
            <TextField
              margin="dense"
              id="description"
              name="description"
              label="Account Description"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formik.values.description}
              onChange={formik.handleChange}
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={formik.touched.description && formik.errors.description}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </MainLayout>
  );
};

export default AccountsPage;
