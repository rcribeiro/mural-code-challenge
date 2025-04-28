export const config = {
  cognito: {
    userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  },
  api: {
    baseUrl: process.env.REACT_APP_API_URL || '',
    muralPayUrl: 'https://api-staging.muralpay.com', // Mural Pay Sandbox URL
  },
  // Additional public API for integration
  externalApi: {
    baseUrl: 'https://api.exchangerate-api.com/v4/latest/USD', // Currency exchange rate API
  }
};
