import React, { useCallback, useEffect, useState } from 'react';
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
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  InputAdornment
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import MainLayout from '../components/layout/MainLayout';
import { muralPayApi } from '../services/api';
import debounce from 'lodash/debounce';

interface Customer {
  id: string;
  type: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  kycStatus: string;
  createdAt: string;
  updatedAt: string;
}

const CustomersPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const accountIdentifier = process.env.REACT_APP_ACCOUNT_IDENTIFIER || '';

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      
      const customersData = await muralPayApi.getAllCustomers(accountIdentifier);
      
      const processedCustomers = customersData.map((customer: any) => ({
        ...customer,
        name: customer.type === 'individual' 
          ? `${customer.firstName} ${customer.lastName}`
          : customer.name || customer.businessName
      }));
      
      setCustomers(processedCustomers);
      setFilteredCustomers(processedCustomers);
      setTotalCount(processedCustomers.length);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [accountIdentifier]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Efficient search with debounce
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      if (!term.trim()) {
        setFilteredCustomers(customers);
        setTotalCount(customers.length);
        return;
      }
      
      const lowerTerm = term.toLowerCase();
      const filtered = customers.filter(customer => 
        (customer.name?.toLowerCase().includes(lowerTerm) ||
         customer.email?.toLowerCase().includes(lowerTerm) ||
         customer.firstName?.toLowerCase().includes(lowerTerm) ||
         customer.lastName?.toLowerCase().includes(lowerTerm))
      );
      
      setFilteredCustomers(filtered);
      setTotalCount(filtered.length);
      setPage(0); // Reset to first page when searching
    }, 300),
    [customers]
  );

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const formik = useFormik({
    initialValues: {
      type: 'business',
      businessName: '',
      firstName: '',
      lastName: '',
      email: '',
    },
    validationSchema: Yup.object({
      type: Yup.string().required('Type is required'),
      businessName: Yup.string().when(['type'], ([type], schema) => {
        return type === 'business' ? schema.required('Business name is required') : schema;
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
        let customerData;
        
        if (values.type === 'business') {
          customerData = {
            type: 'business',
            businessName: values.businessName,
            email: values.email,
          };
        } else {
          customerData = {
            type: 'individual',
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
          };
        }
        
        await muralPayApi.createCustomer(accountIdentifier, customerData);
        resetForm();
        setOpenDialog(false);
        fetchCustomers();
      } catch (err: any) {
        setError(err.message || 'Failed to create customer');
      }
    },
  });

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    formik.resetForm();
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getKycStatusChip = (status: string | { type: string }) => {
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
    let displayStatus = typeof status === 'string' ? status : status.type;
    
    if (typeof status === 'object' && status !== null) {
      if (status.type === 'approved') {
        color = 'success';
        displayStatus = 'Approved';
      } else if (status.type === 'pending') {
        color = 'warning';
        displayStatus = 'Pending';
      } else if (status.type === 'rejected') {
        color = 'error';
        displayStatus = 'Rejected';
      } else if (status.type === 'inactive') {
        color = 'default';
        displayStatus = 'Inactive';
      } else {
        displayStatus = status.type || 'Unknown';
      }
    } else if (typeof status === 'string') {
      switch (status.toUpperCase()) {
        case 'COMPLETED':
        case 'APPROVED':
          color = 'success';
          break;
        case 'IN_PROGRESS':
        case 'PENDING':
          color = 'warning';
          break;
        case 'REJECTED':
          color = 'error';
          break;
        case 'NOT_STARTED':
          color = 'default';
          break;
      }
    }
    
    return <Chip label={displayStatus} color={color} size="small" />;
  };
  
  const paginatedCustomers = filteredCustomers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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

      {/* Search Box */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by name or email..."
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading ? (
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
                  <TableCell>Email</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>KYC Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Updated At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCustomers.length > 0 ? (
                  paginatedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={customer.type.charAt(0).toUpperCase() + customer.type.slice(1)} 
                          color={customer.type === 'business' ? 'primary' : 'secondary'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{getKycStatusChip(customer.kycStatus)}</TableCell>
                      <TableCell>
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(customer.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          component={RouterLink}
                          to={`/customers/${customer.id}`}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {searchTerm ? 'No customers match your search' : 'No customers found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel id="type-label">Customer Type</InputLabel>
              <Select
                labelId="type-label"
                id="type"
                name="type"
                value={formik.values.type}
                onChange={formik.handleChange}
                label="Customer Type"
              >
                <MenuItem value="business">Business</MenuItem>
                <MenuItem value="individual">Individual</MenuItem>
              </Select>
            </FormControl>

            {formik.values.type === 'business' ? (
              <TextField
                margin="dense"
                id="businessName"
                name="businessName"
                label="Business Name"
                type="text"
                fullWidth
                variant="outlined"
                value={formik.values.businessName}
                onChange={formik.handleChange}
                error={formik.touched.businessName && Boolean(formik.errors.businessName)}
                helperText={formik.touched.businessName && formik.errors.businessName}
                sx={{ mb: 2 }}
              />
            ) : (
              <>
                <TextField
                  margin="dense"
                  id="firstName"
                  name="firstName"
                  label="First Name"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                  helperText={formik.touched.firstName && formik.errors.firstName}
                  sx={{ mb: 2 }}
                />
                <TextField
                  margin="dense"
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                  helperText={formik.touched.lastName && formik.errors.lastName}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            <TextField
              margin="dense"
              id="email"
              name="email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? <CircularProgress size={24} /> : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </MainLayout>
  );
};

export default CustomersPage;
