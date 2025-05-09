import axios, { AxiosError, AxiosInstance } from 'axios';
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
  MuralTransactionSearchResponse,
  MuralTransaction,
  MuralTosLinkResponse
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
    headers['transfer-api-key'] = this.transferApiKey;
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

  async getOrganizationTosLink(organizationId: string): Promise<MuralTosLinkResponse> {
    try {
      const res = await this.httpClient.get(
        `/api/organizations/${organizationId}/tos-link`,
      );
      return res.data;
    } catch (err) {
      debug('Error in getOrganizationTosLink():', err);
      this.handleAxiosError(err as AxiosError);
      throw err;
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
    organizationId: string
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

  // Add this method to the MuralProvider class to handle paginated requests efficiently
  async getPaginatedResults<T>(
    fetchFunction: (limit: number, nextId?: string) => Promise<{ results: T[], nextId?: string, total: number }>,
    pageSize: number = 100,
    maxItems: number = 1000
  ): Promise<T[]> {
    let allResults: T[] = [];
    let nextId: string | undefined = undefined;
    
    do {
      try {
        const response = await fetchFunction(pageSize, nextId);
        allResults = [...allResults, ...response.results];
        nextId = response.nextId;
        
        // Stop if we've reached the maximum number of items or there are no more results
        if (!nextId || allResults.length >= maxItems) {
          break;
        }
      } catch (error) {
        debug('Error in paginated request:', error);
        this.handleAxiosError(error);
        break;
      }
    } while (nextId);
    
    // Trim to max items if needed
    return allResults.slice(0, maxItems);
  }

  // Implementation for getAccounts with pagination
  async getAllAccounts(
    maxItems: number = 1000,
    organizationId?: string
  ): Promise<MuralAccount[]> {
    try {
      const response = await this.getAccounts(organizationId);
      
      // If the response already contains an array of accounts, return it
      if (response.accounts && Array.isArray(response.accounts)) {
        return response.accounts.slice(0, maxItems);
      }
      
      return [];
    } catch (error) {
      debug('Error in getAllAccounts():', error);
      this.handleAxiosError(error);
      throw error;
    }
  }

  // Implementation for searchPayoutRequests with pagination
  async getAllPayoutRequests(
    filter: PayoutStatusFilter,
    maxItems: number = 1000,
    organizationId?: string
  ): Promise<MuralPayoutResponse[]> {
    return this.getPaginatedResults<MuralPayoutResponse>(
      async (limit, nextId) => {
        const response = await this.searchPayoutRequests(filter, limit, nextId, organizationId);
        return response;
      },
      100, // page size
      maxItems
    );
  }

  // Implementation for getOrganizations with pagination
  async getAllOrganizations(
    filter?: any,
    maxItems: number = 1000
  ): Promise<MuralOrganization[]> {
    return this.getPaginatedResults<MuralOrganization>(
      async (limit, nextId) => {
        const response = await this.getOrganizations(filter, limit, nextId);
        return response;
      },
      100, // page size
      maxItems
    );
  }

  // Implementation for searchTransactions with pagination
  async getAllTransactions(
    accountId: string, 
    maxItems: number = 1000,
    organizationId?: string
  ): Promise<MuralTransaction[]> {
    return this.getPaginatedResults<MuralTransaction>(
      async (limit, nextId) => {
        const response = await this.searchTransactions(accountId, limit, nextId, organizationId);
        return response;
      },
      100, // page size
      maxItems
    );
  }

  private handleAxiosError(error: AxiosError): never {
    if (error.response) {
      const {status, data} = error.response;
      /*  Extract human-readable message  */
      const message: string =
        Array.isArray((data as any)?.details) && (data as any).details.length
          ? (data as any).details.join(', ')
          : (data as any)?.message || 'Unknown Mural error';

      /*  Attach raw payload for downstream logging if useful  */
      const base: Partial<Error> = {name: 'MuralError'};

      switch (status) {
        case 400: {
          const err = new HttpErrors.BadRequest(message);
          Object.assign(err, base, {details: (data as any)?.details});
          throw err;
        }
        case 401:
        case 403: {
          const err = new HttpErrors.Unauthorized(message);
          Object.assign(err, base);
          throw err;
        }
        case 404: {
          const err = new HttpErrors.NotFound(message);
          Object.assign(err, base);
          throw err;
        }
        default: {
          const err = new HttpErrors.InternalServerError(message);
          Object.assign(err, base);
          throw err;
        }
      }
    }

    /*  Network / unknown error – keep previous behaviour  */
    throw new HttpErrors.InternalServerError(`Mural API error: ${error.message}`);
  }
}
