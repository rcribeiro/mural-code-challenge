import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Grid as MuiGrid,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Grid = (props: any) => {
    const { item, ...other } = props;
    return <MuiGrid {...(item ? { item: true } : {})} {...other} />;
  };

const steps = ['Create Account', 'Verify Email'];

const RegisterPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [username, setUsername] = useState('');
  const { signUp, confirmSignUp } = useAuth();
  const navigate = useNavigate();

  const signUpFormik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      username: Yup.string().required('Username is required'),
      email: Yup.string().email('Invalid email address').required('Email is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Confirm password is required'),
    }),
    onSubmit: async (values) => {
      try {
        await signUp(values.username, values.password, values.email);
        setUsername(values.username);
        setActiveStep(1);
      } catch (err: any) {
        setError(err.message || 'Failed to sign up');
      }
    },
  });

  const confirmFormik = useFormik({
    initialValues: {
      code: '',
    },
    validationSchema: Yup.object({
      code: Yup.string().required('Verification code is required'),
    }),
    onSubmit: async (values) => {
      try {
        await confirmSignUp(username, values.code);
        navigate('/login');
      } catch (err: any) {
        setError(err.message || 'Failed to confirm sign up');
      }
    },
  });

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Mural Light - Sign Up
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ width: '100%', mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {activeStep === 0 ? (
            <Box component="form" onSubmit={signUpFormik.handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={signUpFormik.values.username}
                onChange={signUpFormik.handleChange}
                error={signUpFormik.touched.username && Boolean(signUpFormik.errors.username)}
                helperText={signUpFormik.touched.username && signUpFormik.errors.username}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={signUpFormik.values.email}
                onChange={signUpFormik.handleChange}
                error={signUpFormik.touched.email && Boolean(signUpFormik.errors.email)}
                helperText={signUpFormik.touched.email && signUpFormik.errors.email}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={signUpFormik.values.password}
                onChange={signUpFormik.handleChange}
                error={signUpFormik.touched.password && Boolean(signUpFormik.errors.password)}
                helperText={signUpFormik.touched.password && signUpFormik.errors.password}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={signUpFormik.values.confirmPassword}
                onChange={signUpFormik.handleChange}
                error={signUpFormik.touched.confirmPassword && Boolean(signUpFormik.errors.confirmPassword)}
                helperText={signUpFormik.touched.confirmPassword && signUpFormik.errors.confirmPassword}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={signUpFormik.isSubmitting}
              >
                Sign Up
              </Button>
              <Grid container justifyContent="flex-end">
                <Grid item>
                  <Link component={RouterLink} to="/login" variant="body2">
                    Already have an account? Sign in
                  </Link>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box component="form" onSubmit={confirmFormik.handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                We've sent a verification code to your email. Please enter it below to complete your registration.
              </Typography>
              <TextField
                margin="normal"
                required
                fullWidth
                id="code"
                label="Verification Code"
                name="code"
                autoFocus
                value={confirmFormik.values.code}
                onChange={confirmFormik.handleChange}
                error={confirmFormik.touched.code && Boolean(confirmFormik.errors.code)}
                helperText={confirmFormik.touched.code && confirmFormik.errors.code}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={confirmFormik.isSubmitting}
              >
                Verify
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;

