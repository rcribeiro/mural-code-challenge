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
  TablePagination,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
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
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [nextId, setNextId] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isServerSearching, setIsServerSearching] = useState(false);

  const accountIdentifier = process.env.REACT_APP_ACCOUNT_IDENTIFIER || 'light';

  const fetchCustomers = async (reset = false) => {
    try {
      setLoading(true);
      
      // Reset pagination if requested
      if (reset) {
        setPage(0);
        setNextId(undefined);
        setAllCustomers([]);
      }
      
      // Create filter object for search
      const filter: any = {};
      if (searchTerm && isServerSearching) {
        // Add search filters for name, email, etc.
        filter.$or = [
          { name: { $contains: searchTerm } },
          { firstName: { $contains: searchTerm } },
          { lastName: { $contains: searchTerm } },
          { email: { $contains: searchTerm } }
        ];
      }
      
      const response = await muralPayApi.getCustomers(
        accountIdentifier, 
        filter, 
        rowsPerPage, 
        reset ? undefined : nextId
      );
      
      let newCustomers: Customer[] = [];
      let newNextId: string | undefined = undefined;
      let count = 0;
      
      if (Array.isArray(response.data)) {
        newCustomers = response.data;
        count = response.headers['x-total-count'] ? parseInt(response.headers['x-total-count'], 10) : newCustomers.length;
      } 
      else if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.customers)) {
          newCustomers = response.data.customers;
          newNextId = response.data.nextId;
          count = response.data.totalCount || response.data.count || newCustomers.length;
        } else if (Array.isArray(response.data.data)) {
          newCustomers = response.data.data;
          newNextId = response.data.nextId || response.data.next;
          count = response.data.totalCount || response.data.count || newCustomers.length;
        } else if (Array.isArray(response.data.items)) {
          newCustomers = response.data.items;
          newNextId = response.data.nextId;
          count = response.data.totalCount || response.data.count || newCustomers.length;
        } else if (Array.isArray(response.data.results)) {
          newCustomers = response.data.results;
          newNextId = response.data.nextId;
          count = response.data.totalCount || response.data.count || newCustomers.length;
        } else {
          console.error('Unexpected API response structure:', response.data);
          newCustomers = [];
          setError('Unexpected data format received from API');
        }
      } else {
        console.error('Invalid API response:', response.data);
        newCustomers = [];
        setError('Invalid data received from API');
      }
      
      // If we have a nextId, we know there are more records than what we received
      if (newNextId && count <= newCustomers.length) {
        count = newCustomers.length + 1; // At minimum, there's at least one more
      }
      
      setTotalCount(count);
      
      // Update state with new data
      if (reset) {
        setAllCustomers(newCustomers);
      } else {
        // Ensure we don't duplicate customers by checking IDs
        const existingIds = new Set(allCustomers.map(c => c.id));
        const uniqueNewCustomers = newCustomers.filter(c => !existingIds.has(c.id));
        setAllCustomers(prev => [...prev, ...uniqueNewCustomers]);
      }
      
      setNextId(newNextId);
      setHasMore(!!newNextId && newCustomers.length > 0);
      
    } catch (err: any) {
      console.error('API Error:', err);
      setError(err.message || 'Failed to fetch customers');
      setAllCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect to update displayed customers based on pagination
  useEffect(() => {
    if (isSearching && !isServerSearching) {
      // When searching client-side, use the search results
      const start = page * rowsPerPage;
      const end = start + rowsPerPage;
      setCustomers(searchResults.slice(start, Math.min(end, searchResults.length)));
    } else {
      // When not searching or server-side searching, use the paginated results from API
      const start = page * rowsPerPage;
      const end = start + rowsPerPage;
      setCustomers(allCustomers.slice(start, Math.min(end, allCustomers.length)));
      
      // If we're near the end of our loaded data and there's more to fetch, load more
      if (allCustomers.length <= (page + 1) * rowsPerPage && hasMore && !loading) {
        fetchCustomers(false);
      }
    }
  }, [page, rowsPerPage, allCustomers, searchResults, isSearching, isServerSearching, hasMore, loading]);

  // Initial data fetch
  useEffect(() => {
    fetchCustomers(true);
  }, [rowsPerPage]);

  // Handle search
  useEffect(() => {
    if (searchTerm && !isServerSearching) {
      setIsSearching(true);
      // Simple client-side search through already loaded customers
      const results = allCustomers.filter(customer => {
        const name = getCustomerName(customer).toLowerCase();
        const email = (customer.email || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        
        return name.includes(term) || email.includes(term);
      });
      
      setSearchResults(results);
      setPage(0); // Reset to first page when searching
    } else if (!searchTerm) {
      setIsSearching(false);
      setSearchResults([]);
    }
  }, [searchTerm, allCustomers, isServerSearching]);

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
        fetchCustomers(true);
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

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    fetchCustomers(true);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    if (isServerSearching) {
      // If we're using server-side search, reset when the search term changes
      setIsServerSearching(false);
    }
  };

  const handleServerSearch = () => {
    setIsServerSearching(true);
    fetchCustomers(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
    setIsServerSearching(false);
    fetchCustomers(true);
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

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          label="Search customers"
          variant="outlined"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 500, mr: 2 }}
        />
        <Button 
          variant="outlined" 
          onClick={handleServerSearch}
          disabled={loading || !searchTerm}
          sx={{ mr: 1 }}
        >
          Search
        </Button>
        {(isSearching || isServerSearching) && (
          <Button 
            variant="outlined" 
            onClick={handleClearSearch}
            color="secondary"
          >
            Clear
          </Button>
        )}
      </Box>

      {loading && customers.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
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
                      {searchTerm ? 'No customers found matching your search.' : 'No customers found. Create your first customer.'}
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
                {loading && customers.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={isSearching ? searchResults.length : totalCount || allCustomers.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
            }
          />
        </>
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
