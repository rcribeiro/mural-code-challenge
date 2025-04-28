import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import MainLayout from '../components/layout/MainLayout';
import { muralPayApi } from '../services/api';

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

const CustomersPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [customerType, setCustomerType] = useState<'individual' | 'business'>('individual');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accountIdentifier = process.env.REACT_APP_ACCOUNT_IDENTIFIER || 'light';

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await muralPayApi.getCustomers(accountIdentifier);
      
      if (Array.isArray(response.data)) {
        setCustomers(response.data);
      } 
      else if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.customers)) {
          setCustomers(response.data.customers);
        } else if (Array.isArray(response.data.data)) {
          setCustomers(response.data.data);
        } else if (Array.isArray(response.data.items)) {
          setCustomers(response.data.items);
        } else if (Array.isArray(response.data.results)) {
          setCustomers(response.data.results);
        } else {
          console.error('Unexpected API response structure:', response.data);
          setCustomers([]);
          setError('Unexpected data format received from API');
        }
      } else {
        console.error('Invalid API response:', response.data);
        setCustomers([]);
        setError('Invalid data received from API');
      }
      
    } catch (err: any) {
      console.error('API Error:', err);
      setError(err.message || 'Failed to fetch customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const getCustomerName = (customer: Customer): string => {
    if (customer.type === 'business') {
      return customer.name || 'Unnamed Business';
    } else {
      return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unnamed Individual';
    }
  };

  const getKycStatus = (customer: Customer): string => {
    return customer.kycStatus?.type || 'unknown';
  };

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

  const formik = useFormik({
    initialValues: {
      type: 'individual',
      name: '',
      firstName: '',
      lastName: '',
      email: '',
    },
    validationSchema: Yup.object({
      type: Yup.string().required('Type is required'),
      name: Yup.string().when(['type'], (type, schema) => {
        return type[0] === 'business' ? schema.required('Business name is required') : schema;
  }),
  firstName: Yup.string().when(['type'], ([type], schema) => {
    return type === 'individual' ? schema.required('First name is required') : schema;
  }),
      lastName: Yup.string().when(['type'], ([type], schema) => {
        return type === 'individual' ? schema.required('Last name is required') : schema;
      }),
      email: Yup.string().email('Invalid email address').required('Email is required'),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        setIsSubmitting(true);
        setError(null);
        
        let customerData;
        
        if (values.type === 'business') {
          customerData = {
            type: values.type,
            businessName: values.name,
            email: values.email,
          };
        } else {
          customerData = {
            type: values.type,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
          };
        }

        console.log('Creating customer with data:', customerData);
        await muralPayApi.createCustomer(accountIdentifier, customerData);
        
        resetForm();
        setOpenDialog(false);
        fetchCustomers();
      } catch (err: any) {
        console.error('Error creating customer:', err);
        setError(err.response?.data?.message || err.message || 'Failed to create customer');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    formik.resetForm();
    setError(null);
  };

  const handleTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const type = event.target.value as 'individual' | 'business';
    setCustomerType(type);
    formik.setFieldValue('type', type);
  };

  return (
    <MainLayout title="Customers">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Customers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Add Customer
        </Button>
      </Box>

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
                <TableCell>Type</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>KYC Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No customers found. Create your first customer.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{getCustomerName(customer)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={customer.type === 'business' ? 'Business' : 'Individual'} 
                        color={customer.type === 'business' ? 'primary' : 'secondary'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getKycStatus(customer)} 
                        color={getKycStatusColor(getKycStatus(customer))} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        component={RouterLink}
                        to={`/customers/${customer.id}`}
                        size="small"
                        color="primary"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="customer-type-label">Customer Type</InputLabel>
              <Select
                labelId="customer-type-label"
                id="type"
                name="type"
                value={formik.values.type}
                onChange={(e) => {
                  handleTypeChange(e as any);
                }}
                label="Customer Type"
              >
                <MenuItem value="individual">Individual</MenuItem>
                <MenuItem value="business">Business</MenuItem>
              </Select>
            </FormControl>
            
            {formik.values.type === 'business' ? (
              <TextField
                fullWidth
                margin="normal"
                id="name"
                name="name"
                label="Business Name"
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
              />
            ) : (
              <>
                <TextField
                  fullWidth
                  margin="normal"
                  id="firstName"
                  name="firstName"
                  label="First Name"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                  helperText={formik.touched.firstName && formik.errors.firstName}
                />
                <TextField
                  fullWidth
                  margin="normal"
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                  helperText={formik.touched.lastName && formik.errors.lastName}
                />
              </>
            )}
            
            <TextField
              fullWidth
              margin="normal"
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isSubmitting || !formik.isValid}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </MainLayout>
  );
};

export default CustomersPage;
