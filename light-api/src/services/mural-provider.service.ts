import axios, { AxiosInstance } from 'axios';
import { HttpErrors } from '@loopback/rest';
import debugFactory from 'debug';
import {
  MuralAccount,
  MuralAccountsResponse,
  MuralCreateAccountRequest,
  MuralOrganization,
  MuralCreateOrganizationRequest,
  MuralKycLinkResponse,
  MuralCreatePayoutRequest,
  MuralPayoutResponse,
  BankDetailsResponse,
  TokenFeeRequest,
  TokenPayoutFeeSuccess,
  TokenPayoutFeeError,
  FiatFeeRequest,
  FiatPayoutFeeSuccess,
  FiatPayoutFeeError,
  PayoutStatusFilter,
  PayoutSearchResponse,
  MuralTransactionSearchResponse
} from './mural.interfaces';
import { MuralServiceProvider } from './mural-service-provider.interface';

const debug = debugFactory('api-core:service:mural-provider');

export class MuralProvider implements MuralServiceProvider {
  private httpClient: AxiosInstance;
  private baseUrl: string = '';
  private apiKey: string = '';
  private transferApiKey: string = '';

  constructor() {
    // Empty constructor - will be initialized with specific credentials later
  }

  initialize(config: { baseUrl: string; apiKey: string; transferApiKey?: string }): void {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.transferApiKey = config.transferApiKey || '';

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Mural provider requires baseUrl and apiKey');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  private getHeaders(organizationId?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['on-behalf-of'] = organizationId;
    }
    return headers;
  }

  // Account operations
  async getAccounts(organizationId?: string): Promise<MuralAccountsResponse> {
    try {
      const response = await this.httpClient.get('/api/accounts', {
        headers: this.getHeaders(organizationId)
      });

      // Check if the response is an array and wrap it in an object if needed
      if (Array.isArray(response.data)) {
        return { accounts: response.data };
      }

      return response.data;
    } catch (error) {
      debug('Error in getAccounts():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async getAccount(accountId: string, organizationId?: string): Promise<MuralAccount> {
    try {
      const response = await this.httpClient.get(`/api/accounts/${accountId}`, {
        headers: this.getHeaders(organizationId)
      });
      return response.data;
    } catch (error) {
      debug('Error in getAccount():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async createAccount(
    name: string,
    description?: string,
    organizationId?: string
  ): Promise<MuralAccount> {
    try {
      const createAccountRequest: MuralCreateAccountRequest = {
        name,
        description
      };

      const response = await this.httpClient.post('/api/accounts', createAccountRequest, {
        headers: this.getHeaders(organizationId)
      });
      return response.data;
    } catch (error) {
      debug('Error in createAccount():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  // Organization operations
  async getOrganization(organizationId: string): Promise<MuralOrganization> {
    try {
      const response = await this.httpClient.get(`/api/organizations/${organizationId}`);
      return response.data;
    } catch (error) {
      debug('Error in getOrganization():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async createOrganization(
    organizationRequest: MuralCreateOrganizationRequest
  ): Promise<MuralOrganization> {
    try {
      // For business organization requests, map businessName to name as expected by the API
      let requestData = { ...organizationRequest };
      if (organizationRequest.type === 'business' && 'businessName' in organizationRequest) {
        requestData = {
          ...organizationRequest,
          type: 'business',
          businessName: organizationRequest.businessName
        };
      }

      const response = await this.httpClient.post('/api/organizations', requestData);
      return response.data;
    } catch (error) {
      debug('Error in createOrganization():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async getOrganizationKycLink(organizationId: string): Promise<MuralKycLinkResponse> {
    try {
      const response = await this.httpClient.get(`/api/organizations/${organizationId}/kyc-link`);
      return response.data;
    } catch (error) {
      debug('Error in getOrganizationKycLink():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  // Payout operations
  async createPayoutRequest(
    request: MuralCreatePayoutRequest,
    organizationId?: string
  ): Promise<MuralPayoutResponse> {
    try {
      const headers: Record<string, string> = {};
      if (organizationId) {
        headers['on-behalf-of'] = organizationId;
      }

      const response = await this.httpClient.post('/api/payouts/payout', request, {
        headers
      });

      // Return the entire response if it doesn't have a payouts array
      if (!response.data || !Array.isArray(response.data.payouts)) {
        return response.data;
      }

      // If there's a payouts array with at least one element, return the first one
      if (response.data.payouts.length > 0) {
        return response.data.payouts[0];
      }

      // Fallback case
      return response.data;
    } catch (error) {
      debug('Error in createPayoutRequest():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async getPayoutRequest(
    payoutRequestId: string,
    organizationId?: string
  ): Promise<MuralPayoutResponse> {
    try {
      const response = await this.httpClient.get(`/api/payouts/payout/${payoutRequestId}`, {
        headers: this.getHeaders(organizationId)
      });
      return response.data;
    } catch (error) {
      debug('Error in getPayoutRequest():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async searchPayoutRequests(
    filter: PayoutStatusFilter,
    limit?: number,
    nextId?: string,
    organizationId?: string
  ): Promise<PayoutSearchResponse> {
    try {
      const response = await this.httpClient.post('/api/payouts/search', filter, {
        headers: this.getHeaders(organizationId),
        params: {
          limit,
          nextId
        }
      });
      return response.data;
    } catch (error) {
      debug('Error in searchPayoutRequests():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async getBankDetails(fiatCurrencyAndRail: string[]): Promise<BankDetailsResponse> {
    try {
      // Create URLSearchParams to properly handle repeated query parameters
      const params = new URLSearchParams();

      // Add each currency/rail as a separate parameter with the same name
      fiatCurrencyAndRail.forEach(value => {
        params.append('fiatCurrencyAndRail', value);
      });

      const response = await this.httpClient.get('/api/payouts/bank-details', {
        params
      });
      return response.data;
    } catch (error) {
      debug('Error in getBankDetails():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async getPayoutFeesForTokenAmount(
    tokenFeeRequests: TokenFeeRequest[]
  ): Promise<TokenPayoutFeeSuccess | TokenPayoutFeeError> {
    try {
      const requestBody = { tokenFeeRequests };
      const response = await this.httpClient.post('/api/payouts/fees/token-to-fiat', requestBody);
      return response.data;
    } catch (error) {
      debug('Error in getPayoutFeesForTokenAmount():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async getPayoutFeesForFiatAmount(
    fiatFeeRequests: FiatFeeRequest[],
  ): Promise<FiatPayoutFeeSuccess | FiatPayoutFeeError> {
    try {
      const requestBody = { fiatFeeRequests };
      const response = await this.httpClient.post('/api/payouts/fees/fiat-to-token', requestBody);
      return response.data;
    } catch (error) {
      debug('Error in getPayoutFeesForFiatAmount():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async executePayoutRequest(
    payoutRequestId: string,
    organizationId?: string
  ): Promise<MuralPayoutResponse> {
    try {
      if (!this.transferApiKey) {
        throw new Error('Transfer API key is required to execute payout requests');
      }

      const headers = this.getHeaders(organizationId);
      headers['transfer-api-key'] = this.transferApiKey;

      const response = await this.httpClient.post(
        `/api/payouts/payout/${payoutRequestId}/execute`,
        {},
        { headers }
      );
      return response.data;
    } catch (error) {
      debug('Error in executePayoutRequest():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async cancelPayoutRequest(
    payoutRequestId: string,
    organizationId?: string
  ): Promise<MuralPayoutResponse> {
    try {
      if (!this.transferApiKey) {
        throw new Error('Transfer API key is required to cancel payout requests');
      }

      const headers = this.getHeaders(organizationId);
      headers['transfer-api-key'] = this.transferApiKey;

      const response = await this.httpClient.post(
        `/api/payouts/payout/${payoutRequestId}/cancel`,
        {},
        { headers }
      );
      return response.data;
    } catch (error) {
      debug('Error in cancelPayoutRequest():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  async getOrganizations(
    filter?: any,
    limit?: number,
    nextId?: string
  ): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/organizations/search', filter || {}, {
        params: {
          limit,
          nextId
        }
      });
      return response.data;
    } catch (error) {
      debug('Error in getOrganizations():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  // Add this method to the MuralProvider class
  async searchTransactions(
    accountId: string,
    limit?: number,
    nextId?: string,
    organizationId?: string
  ): Promise<MuralTransactionSearchResponse> {
    try {
      const response = await this.httpClient.post(
        `/api/transactions/search/account/${accountId}`,
        {}, // Empty body for POST request
        {
          headers: this.getHeaders(organizationId),
          params: {
            limit,
            nextId
          }
        }
      );
      return response.data;
    } catch (error) {
      debug('Error in searchTransactions():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  private handleAxiosError(error: any): void {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      debug('Error response status:', error.response.status);
      debug('Error response data:', error.response.data);

      const status = error.response.status;
      const message = error.response.data?.message || 'Unknown Mural API error';

      if (status === 401 || status === 403) {
        throw new HttpErrors.Forbidden('Authentication failed with Mural API');
      } else if (status === 404) {
        throw new HttpErrors.NotFound('Resource not found in Mural API');
      } else if (status === 429 || 
                (status === 500 && 
                 error.response?.data?.message?.includes('ThrottlerException'))) {
        
        // Get retry-after time from headers if available
        const retryAfter = error.response.headers['retry-after-api'] || '30';
        
        // Create a custom error with rate limit information
        const rateLimitError = new Error('Rate limit exceeded') as Error & { 
          status: number; 
          headers: Record<string, string>;
          code: string;
        };
        rateLimitError.status = 429;
        rateLimitError.code = 'RATE_LIMIT_EXCEEDED';
        rateLimitError.headers = {
          'Retry-After': retryAfter,
          'X-Rate-Limit-Exceeded': 'true'
        };
        
        throw rateLimitError;
      } else {
        throw new HttpErrors.InternalServerError(`Mural API error: ${message}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      debug('No response received from Mural API');
      throw new HttpErrors.ServiceUnavailable('No response received from Mural API');
    } else {
      // Something happened in setting up the request that triggered an Error
      debug('Error setting up request to Mural API:', error.message);
      throw new HttpErrors.InternalServerError(`Error setting up request to Mural API: ${error.message}`);
    }
  }
}
