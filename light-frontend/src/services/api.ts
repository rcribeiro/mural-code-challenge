import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { fetchAuthSession } from '@aws-amplify/auth';
import { config } from '../config';
import { notifyRateLimit } from '../components/common/RateLimitAlert';
import throttle from 'lodash/throttle';

// Create axios instance for our backend API
const api = axios.create({
  baseURL: config.api.baseUrl,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    // No current user signed in
    console.error('Auth error:', error);
  }
  return config;
});

// Define throttle options
const throttleOptions = { leading: true, trailing: false };

// Add response interceptor for rate limiting
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Check for rate limiting errors (429 or 500 with ThrottlerException)
    const isRateLimited =
      error.response?.status === 429 ||
      (error.response?.status === 500 &&
        ((error.response?.data &&
          typeof error.response.data === 'object' &&
          'message' in error.response.data &&
          typeof error.response.data.message === 'string' &&
          error.response.data.message.includes('ThrottlerException')) ||
          (typeof error.response?.data === 'string' &&
            error.response?.data.includes('ThrottlerException'))));

    console.log('Rate limit check:', {
      status: error.response?.status,
      isRateLimited,
      message: typeof error.response?.data === 'object' && error.response?.data ?
        (error.response.data as { message?: string }).message : error.response?.data
    });

    if (isRateLimited && !originalRequest._retry) {
      originalRequest._retry = true;

      // Get retry-after time from headers if available, or use a default
      const retryAfter = error.response?.headers?.['retry-after'] ||
        error.response?.headers?.['retry-after-api'] ||
        '3';
      const retryDelay = parseInt(retryAfter, 10) * 1000 || 3000;

      // Notify the UI about rate limiting with the retry time in seconds
      notifyRateLimit(true, retryDelay / 1000);

      console.log(`Rate limited. Retrying after ${Math.round(retryDelay)}ms...`);

      return new Promise((resolve) => {
        setTimeout(() => {
          // Reset the rate limit notification
          notifyRateLimit(false);
          resolve(api(originalRequest));
        }, retryDelay);
      });
    }

    return Promise.reject(error);
  });

// Helper function to handle API responses with error handling and retries
const apiRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  maxRetries = 3
): Promise<AxiosResponse<T>> => {
  let retries = 0;
  let lastError: any;

  while (retries < maxRetries) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;

      // Check for rate limiting errors
      const isRateLimited =
        error.response?.status === 429 ||
        (error.response?.status === 500 &&
          ((error.response?.data &&
            typeof error.response.data === 'object' &&
            'message' in error.response.data &&
            typeof error.response.data.message === 'string' &&
            error.response.data.message.includes('ThrottlerException')) ||
            (typeof error.response?.data === 'string' &&
              error.response?.data.includes('ThrottlerException'))));

      if (isRateLimited) {
        // Show rate limit notification
        notifyRateLimit(true);

        // Get retry-after time from headers if available, or use exponential backoff
        const retryAfter = error.response?.headers?.['retry-after'] ||
          error.response?.headers?.['retry-after-api'];

        let delay = retryAfter ? parseInt(retryAfter, 10) * 1000 :
          Math.pow(2, retries) * 1000 + Math.random() * 1000;

        console.log(`Rate limited. Retry ${retries + 1}/${maxRetries} after ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Reset notification after delay
        notifyRateLimit(false);

        retries++;
      } else {
        // For other errors, don't retry
        throw error;
      }
    }
  }

  // If we've exhausted all retries
  throw lastError;
};

// Add these pagination helper types
interface PaginatedResponse<T> {
  results: T[];
  nextId?: string;
  total?: number;
}

// API functions for Mural Pay
export const muralPayApi = {
  // Organization (Customer) endpoints
  createCustomer: throttle((accountIdentifier: string, data: any) =>
    apiRequest(() => api.post(`/mural/${accountIdentifier}/organizations`, data)),
    1000, throttleOptions),

  getCustomers: throttle((accountIdentifier: string, filter?: any, limit: number = 100, nextId?: string) =>
    apiRequest(() => api.post(`/mural/${accountIdentifier}/organizations/search`, { filter, limit, nextId })),
    1000, throttleOptions),

  getAllCustomers: throttle(async (accountIdentifier: string, maxItems = 100) => {
    let allCustomers: any[] = [];
    let nextId: string | undefined = undefined;
    const limit = 20; // Fetch 20 at a time

    do {
      const response = await apiRequest(() =>
        api.post(`/mural/${accountIdentifier}/organizations/search`, {
          filter: {},
          limit,
          nextId
        })
      );

      const data = response.data;
      if (data.results && Array.isArray(data.results)) {
        allCustomers = [...allCustomers, ...data.results];
      }

      nextId = data.nextId;

      // Stop if we've reached the maximum number of items or there are no more results
      if (!nextId || allCustomers.length >= maxItems) {
        break;
      }
    } while (nextId);

    // Trim to max items if needed
    return allCustomers.slice(0, maxItems);
  }, 1000, throttleOptions),

  getCustomer: throttle((accountIdentifier: string, organizationId: string) =>
    apiRequest(() => api.post(`/mural/${accountIdentifier}/organizations/${organizationId}`)),
    1000, throttleOptions),

  getCustomerKycLink: throttle((accountIdentifier: string, organizationId: string) =>
    apiRequest(() => api.post(`/mural/${accountIdentifier}/organizations/${organizationId}/kyc-link`)),
    1000, throttleOptions),

  // Account endpoints
  createAccount: throttle((accountIdentifier: string, organizationId: string, data: any) =>
    apiRequest(() => api.post(`/mural/${accountIdentifier}/accounts`, data, {
      headers: { 'on-behalf-of': organizationId }
    })),
    1000, throttleOptions),

  getAccounts: throttle((accountIdentifier: string, organizationId?: string) =>
    apiRequest(() => api.post(`/mural/${accountIdentifier}/accounts/list-accounts`, {
      headers: organizationId ? { 'on-behalf-of': organizationId } : undefined
    })),
    1000, throttleOptions),

  getAllAccounts: throttle(async (accountIdentifier: string, organizationId?: string, maxItems = 100) => {
    try {
      // Use the proxy endpoint that doesn't require the on-behalf-of header
      const response = await apiRequest(() =>
        api.get(`/mural/${accountIdentifier}/accounts/proxy/${organizationId || 'none'}`)
      );

      let accounts = [];
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        accounts = response.data.accounts;
      } else if (Array.isArray(response.data)) {
        accounts = response.data;
      }

      return accounts.slice(0, maxItems);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }, 1000, throttleOptions),

  getAccount: throttle((accountIdentifier: string, accountId: string, organizationId?: string) =>
    apiRequest(() => api.get(`/mural/${accountIdentifier}/accounts/proxy/single/${accountId}/${organizationId || 'none'}`)),
    1000, throttleOptions),

  // Transaction endpoints
  getTransactions: throttle((accountIdentifier: string, accountId: string, limit: number = 100, nextId?: string, organizationId?: string) =>
    apiRequest(() => api.post(`/mural/${accountIdentifier}/transactions/search/account/${accountId}`,
      { limit, nextId },
      {
        headers: organizationId ? { 'on-behalf-of': organizationId } : undefined
      }
    )),
    1000, throttleOptions),

  getAllTransactions: throttle(async (accountIdentifier: string, accountId: string, organizationId?: string, maxItems = 100) => {
    try {
      // Use the proxy endpoint that doesn't require the on-behalf-of header
      const response = await apiRequest(() =>
        api.get(`/mural/${accountIdentifier}/transactions/proxy/${accountId}/${organizationId || 'none'}`, {
          params: {
            limit: maxItems
          }
        })
      );

      // Extract transactions from the response
      const data = response.data;
      const transactions = Array.isArray(data) ? data :
        (data.results || data.transactions || []);

      return transactions.slice(0, maxItems);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }, 1000, throttleOptions),

  // Payout request endpoints
  createPayoutRequest: throttle((accountIdentifier: string, accountId: string, data: any, organizationId?: string) =>
    apiRequest(() => api.post(`/mural/${accountIdentifier}/payouts/payout`, data, {
      headers: organizationId ? { 'on-behalf-of': organizationId } : undefined
    })),
    1000, throttleOptions),

  // Update the executePayoutRequest method in the muralPayApi object
  executePayoutRequest: throttle((accountIdentifier: string, payoutRequestId: string, organizationId: string) =>
    apiRequest(() => api.post(`/mural/${accountIdentifier}/payouts/execute-proxy`, {
      payoutRequestId,
      organizationId
    })),
    1000, throttleOptions),

  getAllPayoutRequests: throttle(async (accountIdentifier: string, accountId: string, organizationId?: string, maxItems: number = 100) => {
    // Use the proxy endpoint that doesn't require the on-behalf-of header
    const response = await apiRequest(() =>
      api.get(`/mural/${accountIdentifier}/payouts/proxy/${accountId}/${organizationId || 'none'}`, {
        params: { limit: maxItems }
      })
    );

    // Extract results from the response
    const data = response.data;
    const results = Array.isArray(data) ? data :
      (data.results || data.payouts || data.items || []);

    return results.slice(0, maxItems);
  }, 1000, throttleOptions),

  getPayoutRequest: throttle((accountIdentifier: string, payoutRequestId: string, organizationId?: string) =>
    apiRequest(() => api.get(`/mural/${accountIdentifier}/payouts/proxy/${payoutRequestId}/${organizationId || 'none'}`)),
    1000, throttleOptions),
};

// External API integration - Currency Exchange Rates
export const exchangeRateApi = {
  getExchangeRates: throttle(() => axios.get(config.externalApi.baseUrl),
    60000, throttleOptions), // Throttle to once per minute
};
