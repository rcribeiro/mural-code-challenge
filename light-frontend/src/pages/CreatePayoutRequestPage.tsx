import React, { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Grid as MuiGrid,
  MenuItem,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Card,
  CardContent,
  CardHeader,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useFormik, FormikProvider, FieldArray } from 'formik';
import * as Yup from 'yup';
import MainLayout from '../components/layout/MainLayout';
import { muralPayApi } from '../services/api';

const Grid = (props: any) => {
  const { item, ...other } = props;
  return <MuiGrid {...(item ? { item: true } : {})} {...other} />;
};

const steps = ['Enter Payout Details', 'Review', 'Confirmation'];

// Define the payout types
const PAYOUT_TYPES = {
  FIAT: 'fiat',
  BLOCKCHAIN: 'blockchain',
};

// Define the recipient types
const RECIPIENT_TYPES = {
  INDIVIDUAL: 'individual',
  BUSINESS: 'business',
};

// Define the blockchain options
const BLOCKCHAIN_OPTIONS = [
  { value: 'ETHEREUM', label: 'Ethereum' },
  { value: 'POLYGON', label: 'Polygon' },
  { value: 'SOLANA', label: 'Solana' },
  { value: 'AVALANCHE', label: 'Avalanche' },
];

// Define the currency options
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
];

// Define the token options
const TOKEN_OPTIONS = [
  { value: 'USDC', label: 'USDC' },
  { value: 'USDT', label: 'USDT' },
  { value: 'ETH', label: 'ETH' },
];

// Define country options
const COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
];

// Define US state options
const US_STATE_OPTIONS = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
];

// Define interfaces for our form types
interface PayoutFormValues {
  sourceAccountId?: string;
  memo: string;
  payouts: PayoutItem[];
}

interface PayoutItem {
  amount: {
    tokenAmount: string;
    tokenSymbol: string;
  };
  payoutDetails: {
    type: string;
    bankName?: string;
    bankAccountOwner?: string;
    fiatAndRailDetails?: {
      type: string;
      symbol: string;
      accountType: string; // Add this field
      bankAccountNumber: string;
      bankRoutingNumber: string;
    };
    walletDetails?: {
      walletAddress: string;
      blockchain: string;
    };
  };
  recipientInfo: {
    type: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
    dateOfBirth?: string;
    physicalAddress: {
      address1: string;
      address2?: string | null; // Update to allow null
      country: string;
      state: string;
      city: string;
      zip: string;
    };
  };
}

// Create a default empty payout object
const createEmptyPayout = (): PayoutItem => ({
  amount: {
    tokenAmount: '',
    tokenSymbol: 'USDC',
  },
  payoutDetails: {
    type: PAYOUT_TYPES.FIAT,
    bankName: '',
    bankAccountOwner: '',
    fiatAndRailDetails: {
      type: 'usd',
      symbol: 'USD',
      accountType: 'CHECKING',
      bankAccountNumber: '',
      bankRoutingNumber: '',
    },
    walletDetails: {
      walletAddress: '',
      blockchain: 'ETHEREUM',
    },
  },
  recipientInfo: {
    type: RECIPIENT_TYPES.INDIVIDUAL,
    firstName: '',
    lastName: '',
    name: '',
    email: '',
    dateOfBirth: '',
    physicalAddress: {
      address1: '',
      address2: undefined,
      country: 'US',
      state: 'NY',
      city: '',
      zip: '',
    },
  },
});


const CreatePayoutRequestPage: React.FC = () => {
  const { customerId, accountId } = useParams<{ customerId: string; accountId: string }>();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutRequestId, setPayoutRequestId] = useState<string | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const accountIdentifier = process.env.REACT_APP_ACCOUNT_IDENTIFIER || '';

  // Validation schema for the form
const validationSchema = Yup.object({
  memo: Yup.string().required('Memo is required'),
  payouts: Yup.array().of(
    Yup.object({
      amount: Yup.object({
        tokenAmount: Yup.number()
          .required('Amount is required')
          .positive('Amount must be positive'),
        tokenSymbol: Yup.string().required('Token is required'),
      }),
      payoutDetails: Yup.object({
        type: Yup.string().required('Payout type is required'),
        // Conditionally validate fields based on payout type
        bankName: Yup.string().when(['type'], ([type], schema) => 
          type === PAYOUT_TYPES.FIAT 
            ? schema.required('Bank name is required')
            : schema.notRequired()
        ),
        bankAccountOwner: Yup.string().when(['type'], ([type], schema) => 
          type === PAYOUT_TYPES.FIAT 
            ? schema.required('Bank account owner is required')
            : schema.notRequired()
        ),
        fiatAndRailDetails: Yup.object().when(['type'], ([type], schema) => 
          type === PAYOUT_TYPES.FIAT 
            ? schema.shape({
                type: Yup.string().required('Currency type is required'),
                symbol: Yup.string().required('Currency symbol is required'),
                bankAccountNumber: Yup.string().required('Bank account number is required'),
                bankRoutingNumber: Yup.string().required('Bank routing number is required'),
              })
            : schema.notRequired()
        ),
        walletDetails: Yup.object().when(['type'], ([type], schema) => 
          type === PAYOUT_TYPES.BLOCKCHAIN 
            ? schema.shape({
                walletAddress: Yup.string().required('Wallet address is required'),
                blockchain: Yup.string().required('Blockchain is required'),
              })
            : schema.notRequired()
        ),
      }),
      recipientInfo: Yup.object({
        type: Yup.string().required('Recipient type is required'),
        // Individual fields
        firstName: Yup.string().when(['type'], ([type], schema) => 
          type === RECIPIENT_TYPES.INDIVIDUAL 
            ? schema.required('First name is required')
            : schema.notRequired()
        ),
        lastName: Yup.string().when(['type'], ([type], schema) => 
          type === RECIPIENT_TYPES.INDIVIDUAL 
            ? schema.required('Last name is required')
            : schema.notRequired()
        ),
        dateOfBirth: Yup.string().when(['type'], ([type], schema) => 
          type === RECIPIENT_TYPES.INDIVIDUAL 
            ? schema.required('Date of birth is required')
            : schema.notRequired()
        ),
        // Business fields
        name: Yup.string().when(['type'], ([type], schema) => 
          type === RECIPIENT_TYPES.BUSINESS 
            ? schema.required('Business name is required')
            : schema.notRequired()
        ),
        // Common fields
        email: Yup.string().email('Invalid email').required('Email is required'),
        physicalAddress: Yup.object({
          address1: Yup.string().required('Address line 1 is required'),
          country: Yup.string().required('Country is required'),
          state: Yup.string().required('State is required'),
          city: Yup.string().required('City is required'),
          zip: Yup.string().required('ZIP code is required'),
        }),
      }),
    })
  ).min(1, 'At least one payout is required'),
});

  const formik = useFormik<PayoutFormValues>({
    initialValues: {
      sourceAccountId: accountId,
      memo: '',
      payouts: [createEmptyPayout()],
    },
    validationSchema,
    onSubmit: async (values) => {
      if (activeStep === 0) {
        setActiveStep(1); // Move to review step
        return;
      }
      
      if (activeStep === 1) {
        try {
          setLoading(true);
          setError(null);
          
          // Format the data for the API
          const payoutData = {
            sourceAccountId: values.sourceAccountId,
            memo: values.memo,
            payouts: values.payouts.map(payout => {
              // Create a deep copy of the payout to avoid modifying the original
              const payoutCopy = JSON.parse(JSON.stringify(payout));
              
              // Convert tokenAmount to number
              payoutCopy.amount.tokenAmount = Number(payoutCopy.amount.tokenAmount);
              
              // Handle payout type-specific fields
              if (payoutCopy.payoutDetails.type === PAYOUT_TYPES.FIAT) {
                // For FIAT payouts, remove blockchain fields and ensure accountType is set
                if (payoutCopy.payoutDetails.walletDetails) {
                  const { walletDetails, ...restPayoutDetails } = payoutCopy.payoutDetails;
                  payoutCopy.payoutDetails = restPayoutDetails;
                }
                
                // Ensure accountType is set
                if (!payoutCopy.payoutDetails.fiatAndRailDetails.accountType) {
                  payoutCopy.payoutDetails.fiatAndRailDetails.accountType = 'CHECKING';
                }
              } else {
                // For BLOCKCHAIN payouts, remove fiat fields
                if (payoutCopy.payoutDetails.fiatAndRailDetails) {
                  const { bankName, bankAccountOwner, fiatAndRailDetails, ...restPayoutDetails } = payoutCopy.payoutDetails;
                  payoutCopy.payoutDetails = restPayoutDetails;
                }
              }
              
              // Handle recipient type-specific fields
              if (payoutCopy.recipientInfo.type === RECIPIENT_TYPES.INDIVIDUAL) {
                // For INDIVIDUAL recipients, remove business fields
                if (payoutCopy.recipientInfo.name) {
                  const { name, ...restRecipientInfo } = payoutCopy.recipientInfo;
                  payoutCopy.recipientInfo = restRecipientInfo;
                }
              } else {
                // For BUSINESS recipients, remove individual fields
                if (payoutCopy.recipientInfo.firstName) {
                  const { firstName, lastName, dateOfBirth, ...restRecipientInfo } = payoutCopy.recipientInfo;
                  payoutCopy.recipientInfo = restRecipientInfo;
                }
              }
              
              // Handle empty address2 field - remove it if it's empty
              if (payoutCopy.recipientInfo.physicalAddress.address2 === '') {
                delete payoutCopy.recipientInfo.physicalAddress.address2;
              }
              
              return payoutCopy;
            }),
          };
          
          const response = await muralPayApi.createPayoutRequest(accountIdentifier, accountId!, payoutData, customerId);
          setPayoutRequestId(response.data.id);
          setActiveStep(2); // Move to confirmation step
        } catch (err: any) {
          console.error('Error creating payout request:', err);
          setError(err.message || 'Failed to create payout request');
        } finally {
          setLoading(false);
        }
      }
    },
  });

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTabIndex(newValue);
  };

  const handleExecutePayout = async () => {
    if (!payoutRequestId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await muralPayApi.executePayoutRequest(accountIdentifier, payoutRequestId!, customerId!);
      
      // Navigate to payout requests page
      navigate(`/customers/${customerId}/accounts/${accountId}/payout-requests`);
    } catch (err: any) {
      setError(err.message || 'Failed to execute payout request');
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Create Payout Request">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create Payout Request
        </Typography>
        <Button
          variant="outlined"
          component={RouterLink}
          to={`/customers/${customerId}/accounts/${accountId}/payout-requests`}
          sx={{ mr: 2 }}
        >
          Back to Payout Requests
        </Button>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {activeStep === 0 && (
          <FormikProvider value={formik}>
            <form onSubmit={formik.handleSubmit}>
              <Typography variant="h6" gutterBottom>
                Payout Request Details
              </Typography>
              
              <TextField
                fullWidth
                id="memo"
                name="memo"
                label="Memo / Description"
                value={formik.values.memo}
                onChange={formik.handleChange}
                error={formik.touched.memo && Boolean(formik.errors.memo)}
                helperText={formik.touched.memo && formik.errors.memo}
                sx={{ mb: 3 }}
              />
              
              <Typography variant="h6" gutterBottom>
                Payouts
              </Typography>
              
              <FieldArray name="payouts">
                {({ push, remove }) => (
                  <>
                    {formik.values.payouts.map((payout, index) => (
                      <Card key={index} sx={{ mb: 3 }}>
                        <CardHeader
                          title={`Payout #${index + 1}`}
                          action={
                            formik.values.payouts.length > 1 ? (
                              <IconButton onClick={() => remove(index)}>
                                <DeleteIcon />
                              </IconButton>
                            ) : null
                          }
                        />
                        <CardContent>
                          <Tabs value={activeTabIndex} onChange={handleTabChange} sx={{ mb: 2 }}>
                            <Tab label="Amount" />
                            <Tab label="Payout Method" />
                            <Tab label="Recipient" />
                          </Tabs>
                          
                          {/* Amount Tab */}
                          {activeTabIndex === 0 && (
                            <Grid container spacing={2}>
                              {/* Add this field for the amount */}
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  id={`payouts.${index}.amount.tokenAmount`}
                                  name={`payouts.${index}.amount.tokenAmount`}
                                  label="Amount"
                                  type="number"
                                  value={formik.values.payouts[index].amount.tokenAmount}
                                  onChange={formik.handleChange}
                                  error={
                                    formik.touched.payouts?.[index]?.amount?.tokenAmount &&
                                    Boolean((formik.errors.payouts?.[index] as any)?.amount?.tokenAmount)
                                  }
                                  helperText={
                                    formik.touched.payouts?.[index]?.amount?.tokenAmount &&
                                    (formik.errors.payouts?.[index] as any)?.amount?.tokenAmount
                                  }
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                  <InputLabel id={`payouts-${index}-account-type-label`}>Account Type</InputLabel>
                                  <Select
                                    labelId={`payouts-${index}-account-type-label`}
                                    id={`payouts.${index}.payoutDetails.fiatAndRailDetails.accountType`}
                                    name={`payouts.${index}.payoutDetails.fiatAndRailDetails.accountType`}
                                    value={formik.values.payouts[index].payoutDetails.fiatAndRailDetails?.accountType || 'CHECKING'}
                                    onChange={formik.handleChange}
                                  >
                                    <MenuItem value="CHECKING">Checking</MenuItem>
                                    <MenuItem value="SAVINGS">Savings</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                  <InputLabel id={`payouts-${index}-token-symbol-label`}>Token</InputLabel>
                                  <Select
                                    labelId={`payouts-${index}-token-symbol-label`}
                                    id={`payouts.${index}.amount.tokenSymbol`}
                                    name={`payouts.${index}.amount.tokenSymbol`}
                                    value={formik.values.payouts[index].amount.tokenSymbol}
                                    onChange={formik.handleChange}
                                    error={
                                      formik.touched.payouts?.[index]?.amount?.tokenSymbol &&
                                      Boolean((formik.errors.payouts?.[index] as any)?.amount?.tokenSymbol)
                                    }
                                  >
                                    {TOKEN_OPTIONS.map(option => (
                                      <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                  {formik.touched.payouts?.[index]?.amount?.tokenSymbol &&
                                   (formik.errors.payouts?.[index] as any)?.amount?.tokenSymbol && (
                                    <FormHelperText error>
                                      {(formik.errors.payouts?.[index] as any)?.amount?.tokenSymbol}
                                    </FormHelperText>
                                  )}
                                </FormControl>
                              </Grid>
                            </Grid>
                          )}
                          
                          {/* Payout Method Tab */}
                          {activeTabIndex === 1 && (
                            <>
                              <FormControl fullWidth sx={{ mb: 3 }}>
                                <InputLabel id={`payouts-${index}-type-label`}>Payout Type</InputLabel>
                                <Select
                                  labelId={`payouts-${index}-type-label`}
                                  id={`payouts.${index}.payoutDetails.type`}
                                  name={`payouts.${index}.payoutDetails.type`}
                                  value={formik.values.payouts[index].payoutDetails.type}
                                  onChange={formik.handleChange}
                                >
                                  <MenuItem value={PAYOUT_TYPES.FIAT}>Bank Transfer (Fiat)</MenuItem>
                                  <MenuItem value={PAYOUT_TYPES.BLOCKCHAIN}>Blockchain Transfer</MenuItem>
                                </Select>
                              </FormControl>
                              
                              {formik.values.payouts[index].payoutDetails.type === PAYOUT_TYPES.FIAT ? (
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.payoutDetails.bankName`}
                                      name={`payouts.${index}.payoutDetails.bankName`}
                                      label="Bank Name"
                                      value={formik.values.payouts[index].payoutDetails.bankName}
                                      onChange={formik.handleChange}
                                      error={
                                        formik.touched.payouts?.[index]?.payoutDetails?.bankName &&
                                        Boolean((formik.errors.payouts?.[index] as any)?.payoutDetails?.bankName)
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.payoutDetails?.bankName &&
                                        (formik.errors.payouts?.[index] as any)?.payoutDetails?.bankName
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.payoutDetails.bankAccountOwner`}
                                      name={`payouts.${index}.payoutDetails.bankAccountOwner`}
                                      label="Bank Account Owner"
                                      value={formik.values.payouts[index].payoutDetails.bankAccountOwner}
                                      onChange={formik.handleChange}
                                      error={
                                        formik.touched.payouts?.[index]?.payoutDetails?.bankAccountOwner &&
                                        Boolean((formik.errors.payouts?.[index] as any)?.payoutDetails?.bankAccountOwner)
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.payoutDetails?.bankAccountOwner &&
                                        (formik.errors.payouts?.[index] as any)?.payoutDetails?.bankAccountOwner
                                      }
                                    />
                                  </Grid>
                                  
                                  <Grid item xs={12}>
                                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                                      Bank Account Details
                                    </Typography>
                                  </Grid>
                                  
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.payoutDetails.fiatAndRailDetails.bankAccountNumber`}
                                      name={`payouts.${index}.payoutDetails.fiatAndRailDetails.bankAccountNumber`}
                                      label="Account Number"
                                      value={formik.values.payouts[index].payoutDetails.fiatAndRailDetails?.bankAccountNumber}
                                      onChange={formik.handleChange}
                                      error={
                                        Boolean(
                                          formik.touched.payouts?.[index]?.payoutDetails?.fiatAndRailDetails && 
                                          typeof formik.touched.payouts?.[index]?.payoutDetails?.fiatAndRailDetails === 'object' &&
                                          (formik.errors.payouts?.[index] as any)?.payoutDetails?.fiatAndRailDetails?.bankAccountNumber
                                        )
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.payoutDetails?.fiatAndRailDetails && 
                                        typeof formik.touched.payouts?.[index]?.payoutDetails?.fiatAndRailDetails === 'object' ?
                                        (formik.errors.payouts?.[index] as any)?.payoutDetails?.fiatAndRailDetails?.bankAccountNumber : ''
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.payoutDetails.fiatAndRailDetails.bankRoutingNumber`}
                                      name={`payouts.${index}.payoutDetails.fiatAndRailDetails.bankRoutingNumber`}
                                      label="Routing Number"
                                      value={formik.values.payouts[index].payoutDetails.fiatAndRailDetails?.bankRoutingNumber}
                                      onChange={formik.handleChange}
                                      error={
                                        Boolean(
                                          formik.touched.payouts?.[index]?.payoutDetails?.fiatAndRailDetails && 
                                          typeof formik.touched.payouts?.[index]?.payoutDetails?.fiatAndRailDetails === 'object' &&
                                          (formik.errors.payouts?.[index] as any)?.payoutDetails?.fiatAndRailDetails?.bankRoutingNumber
                                        )
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.payoutDetails?.fiatAndRailDetails && 
                                        typeof formik.touched.payouts?.[index]?.payoutDetails?.fiatAndRailDetails === 'object' ?
                                        (formik.errors.payouts?.[index] as any)?.payoutDetails?.fiatAndRailDetails?.bankRoutingNumber : ''
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                      <InputLabel id={`payouts-${index}-currency-label`}>Currency</InputLabel>
                                      <Select
                                        labelId={`payouts-${index}-currency-label`}
                                        id={`payouts.${index}.payoutDetails.fiatAndRailDetails.symbol`}
                                        name={`payouts.${index}.payoutDetails.fiatAndRailDetails.symbol`}
                                        value={formik.values.payouts[index].payoutDetails.fiatAndRailDetails?.symbol}
                                        onChange={formik.handleChange}
                                      >
                                        {CURRENCY_OPTIONS.map(option => (
                                          <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </Grid>
                                </Grid>
                              ) : (
                                <Grid container spacing={2}>
                                  <Grid item xs={12}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.payoutDetails.walletDetails.walletAddress`}
                                      name={`payouts.${index}.payoutDetails.walletDetails.walletAddress`}
                                      label="Wallet Address"
                                      value={formik.values.payouts[index].payoutDetails.walletDetails?.walletAddress}
                                      onChange={formik.handleChange}
                                      error={
                                        Boolean(
                                          formik.touched.payouts?.[index]?.payoutDetails?.walletDetails && 
                                          typeof formik.touched.payouts?.[index]?.payoutDetails?.walletDetails === 'object' &&
                                          (formik.errors.payouts?.[index] as any)?.payoutDetails?.walletDetails?.walletAddress
                                        )
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.payoutDetails?.walletDetails && 
                                        typeof formik.touched.payouts?.[index]?.payoutDetails?.walletDetails === 'object' ?
                                        (formik.errors.payouts?.[index] as any)?.payoutDetails?.walletDetails?.walletAddress : ''
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                      <InputLabel id={`payouts-${index}-blockchain-label`}>Blockchain</InputLabel>
                                      <Select
                                        labelId={`payouts-${index}-blockchain-label`}
                                        id={`payouts.${index}.payoutDetails.walletDetails.blockchain`}
                                        name={`payouts.${index}.payoutDetails.walletDetails.blockchain`}
                                        value={formik.values.payouts[index].payoutDetails.walletDetails?.blockchain}
                                        onChange={formik.handleChange}
                                      >
                                        {BLOCKCHAIN_OPTIONS.map(option => (
                                          <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </Grid>
                                </Grid>
                              )}
                            </>
                          )}
                          
                          {/* Recipient Tab */}
                          {activeTabIndex === 2 && (
                            <>
                              <FormControl fullWidth sx={{ mb: 3 }}>
                                <InputLabel id={`payouts-${index}-recipient-type-label`}>Recipient Type</InputLabel>
                                <Select
                                  labelId={`payouts-${index}-recipient-type-label`}
                                  id={`payouts.${index}.recipientInfo.type`}
                                  name={`payouts.${index}.recipientInfo.type`}
                                  value={formik.values.payouts[index].recipientInfo.type}
                                  onChange={formik.handleChange}
                                >
                                  <MenuItem value={RECIPIENT_TYPES.INDIVIDUAL}>Individual</MenuItem>
                                  <MenuItem value={RECIPIENT_TYPES.BUSINESS}>Business</MenuItem>
                                </Select>
                              </FormControl>
                              
                              {formik.values.payouts[index].recipientInfo.type === RECIPIENT_TYPES.INDIVIDUAL ? (
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.recipientInfo.firstName`}
                                      name={`payouts.${index}.recipientInfo.firstName`}
                                      label="First Name"
                                      value={formik.values.payouts[index].recipientInfo.firstName}
                                      onChange={formik.handleChange}
                                      error={
                                        formik.touched.payouts?.[index]?.recipientInfo?.firstName &&
                                        Boolean((formik.errors.payouts?.[index] as any)?.recipientInfo?.firstName)
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.recipientInfo?.firstName &&
                                        (formik.errors.payouts?.[index] as any)?.recipientInfo?.firstName
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.recipientInfo.lastName`}
                                      name={`payouts.${index}.recipientInfo.lastName`}
                                      label="Last Name"
                                      value={formik.values.payouts[index].recipientInfo.lastName}
                                      onChange={formik.handleChange}
                                      error={
                                        formik.touched.payouts?.[index]?.recipientInfo?.lastName &&
                                        Boolean((formik.errors.payouts?.[index] as any)?.recipientInfo?.lastName)
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.recipientInfo?.lastName &&
                                        (formik.errors.payouts?.[index] as any)?.recipientInfo?.lastName
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.recipientInfo.email`}
                                      name={`payouts.${index}.recipientInfo.email`}
                                      label="Email"
                                      type="email"
                                      value={formik.values.payouts[index].recipientInfo.email}
                                      onChange={formik.handleChange}
                                      error={
                                        formik.touched.payouts?.[index]?.recipientInfo?.email &&
                                        Boolean((formik.errors.payouts?.[index] as any)?.recipientInfo?.email)
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.recipientInfo?.email &&
                                        (formik.errors.payouts?.[index] as any)?.recipientInfo?.email
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.recipientInfo.dateOfBirth`}
                                      name={`payouts.${index}.recipientInfo.dateOfBirth`}
                                      label="Date of Birth"
                                      type="date"
                                      InputLabelProps={{ shrink: true }}
                                      value={formik.values.payouts[index].recipientInfo.dateOfBirth}
                                      onChange={formik.handleChange}
                                      error={
                                        formik.touched.payouts?.[index]?.recipientInfo?.dateOfBirth &&
                                        Boolean((formik.errors.payouts?.[index] as any)?.recipientInfo?.dateOfBirth)
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.recipientInfo?.dateOfBirth &&
                                        (formik.errors.payouts?.[index] as any)?.recipientInfo?.dateOfBirth
                                      }
                                    />
                                  </Grid>
                                </Grid>
                              ) : (
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.recipientInfo.name`}
                                      name={`payouts.${index}.recipientInfo.name`}
                                      label="Business Name"
                                      value={formik.values.payouts[index].recipientInfo.name}
                                      onChange={formik.handleChange}
                                      error={
                                        formik.touched.payouts?.[index]?.recipientInfo?.name &&
                                        Boolean((formik.errors.payouts?.[index] as any)?.recipientInfo?.name)
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.recipientInfo?.name &&
                                        (formik.errors.payouts?.[index] as any)?.recipientInfo?.name
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      id={`payouts.${index}.recipientInfo.email`}
                                      name={`payouts.${index}.recipientInfo.email`}
                                      label="Email"
                                      type="email"
                                      value={formik.values.payouts[index].recipientInfo.email}
                                      onChange={formik.handleChange}
                                      error={
                                        formik.touched.payouts?.[index]?.recipientInfo?.email &&
                                        Boolean((formik.errors.payouts?.[index] as any)?.recipientInfo?.email)
                                      }
                                      helperText={
                                        formik.touched.payouts?.[index]?.recipientInfo?.email &&
                                        (formik.errors.payouts?.[index] as any)?.recipientInfo?.email
                                      }
                                    />
                                  </Grid>
                                </Grid>
                              )}
                              
                              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                                Physical Address
                              </Typography>
                              
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    id={`payouts.${index}.recipientInfo.physicalAddress.address1`}
                                    name={`payouts.${index}.recipientInfo.physicalAddress.address1`}
                                    label="Address Line 1"
                                    value={formik.values.payouts[index].recipientInfo.physicalAddress.address1}
                                    onChange={formik.handleChange}
                                    error={
                                      formik.touched.payouts?.[index]?.recipientInfo?.physicalAddress?.address1 &&
                                      Boolean((formik.errors.payouts?.[index] as any)?.recipientInfo?.physicalAddress?.address1)
                                    }
                                    helperText={
                                      formik.touched.payouts?.[index]?.recipientInfo?.physicalAddress?.address1 &&
                                      (formik.errors.payouts?.[index] as any)?.recipientInfo?.physicalAddress?.address1
                                    }
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    id={`payouts.${index}.recipientInfo.physicalAddress.address2`}
                                    name={`payouts.${index}.recipientInfo.physicalAddress.address2`}
                                    label="Address Line 2 (Optional)"
                                    value={formik.values.payouts[index].recipientInfo.physicalAddress.address2}
                                    onChange={formik.handleChange}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <FormControl fullWidth>
                                    <InputLabel id={`payouts-${index}-country-label`}>Country</InputLabel>
                                    <Select
                                      labelId={`payouts-${index}-country-label`}
                                      id={`payouts.${index}.recipientInfo.physicalAddress.country`}
                                      name={`payouts.${index}.recipientInfo.physicalAddress.country`}
                                      value={formik.values.payouts[index].recipientInfo.physicalAddress.country}
                                      onChange={formik.handleChange}
                                    >
                                      {COUNTRY_OPTIONS.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                          {option.label}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <FormControl fullWidth>
                                    <InputLabel id={`payouts-${index}-state-label`}>State</InputLabel>
                                    <Select
                                      labelId={`payouts-${index}-state-label`}
                                      id={`payouts.${index}.recipientInfo.physicalAddress.state`}
                                      name={`payouts.${index}.recipientInfo.physicalAddress.state`}
                                      value={formik.values.payouts[index].recipientInfo.physicalAddress.state}
                                      onChange={formik.handleChange}
                                    >
                                      {US_STATE_OPTIONS.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                          {option.label}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    id={`payouts.${index}.recipientInfo.physicalAddress.city`}
                                    name={`payouts.${index}.recipientInfo.physicalAddress.city`}
                                    label="City"
                                    value={formik.values.payouts[index].recipientInfo.physicalAddress.city}
                                    onChange={formik.handleChange}
                                    error={
                                      formik.touched.payouts?.[index]?.recipientInfo?.physicalAddress?.city &&
                                      Boolean((formik.errors.payouts?.[index] as any)?.recipientInfo?.physicalAddress?.city)
                                    }
                                    helperText={
                                      formik.touched.payouts?.[index]?.recipientInfo?.physicalAddress?.city &&
                                      (formik.errors.payouts?.[index] as any)?.recipientInfo?.physicalAddress?.city
                                    }
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    id={`payouts.${index}.recipientInfo.physicalAddress.zip`}
                                    name={`payouts.${index}.recipientInfo.physicalAddress.zip`}
                                    label="ZIP / Postal Code"
                                    value={formik.values.payouts[index].recipientInfo.physicalAddress.zip}
                                    onChange={formik.handleChange}
                                    error={
                                      formik.touched.payouts?.[index]?.recipientInfo?.physicalAddress?.zip &&
                                      Boolean((formik.errors.payouts?.[index] as any)?.recipientInfo?.physicalAddress?.zip)
                                    }
                                    helperText={
                                      formik.touched.payouts?.[index]?.recipientInfo?.physicalAddress?.zip &&
                                      (formik.errors.payouts?.[index] as any)?.recipientInfo?.physicalAddress?.zip
                                    }
                                  />
                                </Grid>
                              </Grid>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => push(createEmptyPayout())}
                      >
                        Add Another Payout
                      </Button>
                    </Box>
                  </>
                )}
              </FieldArray>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                {/* {!formik.isValid && (
                  <Box sx={{ color: 'error.main', mr: 2 }}>
                    <Typography variant="caption">
                      Form has validation errors. Check all fields.
                    </Typography>
                    <pre style={{ fontSize: '10px', maxHeight: '100px', overflow: 'auto' }}>
                      {JSON.stringify(formik.errors, null, 2)}
                    </pre>
                  </Box>
                )} */}
                
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!formik.isValid || formik.isSubmitting}
                >
                  Review
                </Button>
              </Box>
            </form>
          </FormikProvider>
        )}

        {activeStep === 1 && (
          <>
            <Typography variant="h6" gutterBottom>
              Review Payout Request
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" color="text.secondary">
                Memo / Description
              </Typography>
              <Typography variant="body1">
                {formik.values.memo}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Payouts
            </Typography>
            
            {formik.values.payouts.map((payout, index) => (
              <Card key={index} sx={{ mb: 3 }}>
                <CardHeader title={`Payout #${index + 1}`} />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Amount
                      </Typography>
                      <Typography variant="body1">
                        {payout.amount.tokenAmount} {payout.amount.tokenSymbol}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Payout Type
                      </Typography>
                      <Typography variant="body1">
                        {payout.payoutDetails.type === PAYOUT_TYPES.FIAT ? 'Bank Transfer (Fiat)' : 'Blockchain Transfer'}
                      </Typography>
                    </Grid>
                    
                    {payout.payoutDetails.type === PAYOUT_TYPES.FIAT ? (
                      <>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Bank Name
                          </Typography>
                          <Typography variant="body1">
                            {payout.payoutDetails.bankName}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Bank Account Owner
                          </Typography>
                          <Typography variant="body1">
                            {payout.payoutDetails.bankAccountOwner}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Account Number
                          </Typography>
                          <Typography variant="body1">
                            {payout.payoutDetails.fiatAndRailDetails?.bankAccountNumber}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Routing Number
                          </Typography>
                          <Typography variant="body1">
                            {payout.payoutDetails.fiatAndRailDetails?.bankRoutingNumber}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Currency
                          </Typography>
                          <Typography variant="body1">
                            {payout.payoutDetails.fiatAndRailDetails?.symbol}
                          </Typography>
                        </Grid>
                      </>
                    ) : (
                      <>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Wallet Address
                          </Typography>
                          <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                            {payout.payoutDetails.walletDetails?.walletAddress}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Blockchain
                          </Typography>
                          <Typography variant="body1">
                            {payout.payoutDetails.walletDetails?.blockchain}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Recipient Information
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Type
                      </Typography>
                      <Typography variant="body1">
                        {payout.recipientInfo.type === RECIPIENT_TYPES.INDIVIDUAL ? 'Individual' : 'Business'}
                      </Typography>
                    </Grid>
                    
                    {payout.recipientInfo.type === RECIPIENT_TYPES.INDIVIDUAL ? (
                      <>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Name
                          </Typography>
                          <Typography variant="body1">
                            {payout.recipientInfo.firstName} {payout.recipientInfo.lastName}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Email
                          </Typography>
                          <Typography variant="body1">
                            {payout.recipientInfo.email}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Date of Birth
                          </Typography>
                          <Typography variant="body1">
                            {payout.recipientInfo.dateOfBirth}
                          </Typography>
                        </Grid>
                      </>
                    ) : (
                      <>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Business Name
                          </Typography>
                          <Typography variant="body1">
                            {payout.recipientInfo.name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Email
                          </Typography>
                          <Typography variant="body1">
                            {payout.recipientInfo.email}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Address
                      </Typography>
                      <Typography variant="body1">
                        {payout.recipientInfo.physicalAddress.address1}
                        {payout.recipientInfo.physicalAddress.address2 && `, ${payout.recipientInfo.physicalAddress.address2}`}
                      </Typography>
                      <Typography variant="body1">
                        {payout.recipientInfo.physicalAddress.city}, {payout.recipientInfo.physicalAddress.state} {payout.recipientInfo.physicalAddress.zip}
                      </Typography>
                      <Typography variant="body1">
                        {payout.recipientInfo.physicalAddress.country}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button onClick={handleBack}>
                Back
              </Button>
              <Button
                type="button"
                variant="contained"
                onClick={() => formik.handleSubmit()}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Payout Request'}
              </Button>
            </Box>
          </>
        )}

        {activeStep === 2 && (
          <>
            <Typography variant="h6" gutterBottom>
              Payout Request Created Successfully
            </Typography>
            
            <Alert severity="success" sx={{ mb: 3 }}>
              Your payout request has been created with ID: {payoutRequestId}
            </Alert>
            
            <Typography variant="body1" paragraph>
              You can now execute this payout request to process the payment, or you can execute it later.
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                component={RouterLink}
                to={`/customers/${customerId}/accounts/${accountId}/payout-requests`}
              >
                View All Payout Requests
              </Button>
              <Button
                variant="contained"
                onClick={handleExecutePayout}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Execute Payout Now'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </MainLayout>
  );
};


// Helper function to create an empty payout object

export default CreatePayoutRequestPage;