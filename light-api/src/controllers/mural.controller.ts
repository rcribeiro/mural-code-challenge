import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { get, post, param, requestBody, HttpErrors, RestBindings, Request, Response } from '@loopback/rest';
import { ProviderFactoryService } from '../services/provider-factory.service';
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
} from '../services/mural.interfaces';

const debug = debugFactory('api-core:controller:mural');

export class MuralController {
  constructor(
    @inject('services.ProviderFactoryService')
    private providerFactory: ProviderFactoryService,
  ) { }

  // Helper method to get Mural provider
  private async getMuralProvider(accountIdentifier: string) {
    try {
      return await this.providerFactory.getMuralProvider(
        accountIdentifier,
      );
    } catch (error) {
      debug('Error getting Mural provider:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to initialize Mural provider: ${error.message}`);
    }
  }

  // Helper method to handle rate limit errors
  private handleRateLimitError(error: any, response: Response): never {
    if (error.code === 'RATE_LIMIT_EXCEEDED' || 
        (error.status === 429) || 
        (error.message && error.message.includes('Rate limit exceeded'))) {
      
      // Add the rate limit headers to the response
      if (error.headers) {
        if (error.headers['Retry-After']) {
          response.set('Retry-After', error.headers['Retry-After']);
        }
        if (error.headers['X-Rate-Limit-Exceeded']) {
          response.set('X-Rate-Limit-Exceeded', error.headers['X-Rate-Limit-Exceeded']);
        }
      }
      
      // Throw a rate limit error that will be caught by the framework
      const httpError = new HttpErrors.TooManyRequests('Rate limit exceeded');
      httpError.headers = error.headers;
      throw httpError;
    }
    
    // For other errors, throw the original error or a generic error
    if (error instanceof HttpErrors.HttpError) {
      throw error;
    }
    throw new HttpErrors.InternalServerError(`Mural API error: ${error.message}`);
  }

  // Account endpoints
  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/accounts')
  async getMuralAccounts(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<MuralAccountsResponse> {
    try {
      const organizationId = request.headers['on-behalf-of'] as string;
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      const result = await muralProvider.getAccounts(organizationId);
      return result;
    } catch (error) {
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/accounts/{accountId}')
  async getMuralAccount(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @param.path.string('accountId') accountId: string,
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<MuralAccount> {
    try {
      const organizationId = request.headers['on-behalf-of'] as string;
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getAccount(accountId, organizationId);
    } catch (error) {
      debug('Error in getMuralAccount:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/accounts')
  async createMuralAccount(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: MuralCreateAccountRequest,
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<MuralAccount> {
    try {
      const organizationId = request.headers['on-behalf-of'] as string;
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.createAccount(data.name, data.description, organizationId);
    } catch (error) {
      debug('Error in createMuralAccount:', error);
      this.handleRateLimitError(error, response);
    }
  }

  // Organization endpoints
  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/organizations/{organizationId}')
  async getMuralOrganization(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @param.path.string('organizationId') organizationId: string,
  ): Promise<MuralOrganization> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getOrganization(organizationId);
    } catch (error) {
      debug('Error in getMuralOrganization:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/organizations')
  async createMuralOrganization(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: MuralCreateOrganizationRequest,
  ): Promise<MuralOrganization> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.createOrganization(data);
    } catch (error) {
      debug('Error in createMuralOrganization:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/organizations/{organizationId}/kyc-link')
  async getMuralOrganizationKycLink(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @param.path.string('organizationId') organizationId: string,
  ): Promise<MuralKycLinkResponse> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getOrganizationKycLink(organizationId);
    } catch (error) {
      debug('Error in getMuralOrganizationKycLink:', error);
      this.handleRateLimitError(error, response);
    }
  }

  // Payout endpoints
  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/payout')
  async createMuralPayoutRequest(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: MuralCreatePayoutRequest,
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<MuralPayoutResponse> {
    try {
      const organizationId = request.headers['on-behalf-of'] as string;
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.createPayoutRequest(data, organizationId);
    } catch (error) {
      debug('Error in createMuralPayoutRequest:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/payouts/payout/{payoutRequestId}')
  async getMuralPayoutRequest(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @param.path.string('payoutRequestId') payoutRequestId: string,
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<MuralPayoutResponse> {
    try {
      const organizationId = request.headers['on-behalf-of'] as string;
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getPayoutRequest(payoutRequestId, organizationId);
    } catch (error) {
      debug('Error in getMuralPayoutRequest:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/search')
  async searchMuralPayoutRequests(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: { filter: PayoutStatusFilter; limit?: number; nextId?: string },
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<PayoutSearchResponse> {
    try {
      const organizationId = request.headers['on-behalf-of'] as string;
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      const { filter, limit, nextId } = data;
      return await muralProvider.searchPayoutRequests(filter, limit, nextId, organizationId);
    } catch (error) {
      debug('Error in searchMuralPayoutRequests:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/payouts/bank-details')
  async getMuralBankDetails(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @param.query.string('fiatCurrencyAndRail') fiatCurrencyAndRail: string | string[],
  ): Promise<BankDetailsResponse> {
    try {
      // Ensure fiatCurrencyAndRail is always an array
      const currencyRailArray = Array.isArray(fiatCurrencyAndRail) 
        ? fiatCurrencyAndRail 
        : [fiatCurrencyAndRail];
    
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getBankDetails(currencyRailArray);
    } catch (error) {
      debug('Error in getMuralBankDetails:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/fees/token-to-fiat')
  async getMuralPayoutFeesForTokenAmount(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: TokenFeeRequest[],
  ): Promise<TokenPayoutFeeSuccess | TokenPayoutFeeError> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getPayoutFeesForTokenAmount(data);
    } catch (error) {
      debug('Error in getMuralPayoutFeesForTokenAmount:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/fees/fiat-to-token')
  async getMuralPayoutFeesForFiatAmount(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: FiatFeeRequest[],
  ): Promise<FiatPayoutFeeSuccess | FiatPayoutFeeError> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getPayoutFeesForFiatAmount(data);
    } catch (error) {
      debug('Error in getMuralPayoutFeesForFiatAmount:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/payout/{payoutRequestId}/execute')
  async executeMuralPayoutRequest(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @param.path.string('payoutRequestId') payoutRequestId: string,
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<MuralPayoutResponse> {
    try {
      const organizationId = request.headers['on-behalf-of'] as string;
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.executePayoutRequest(payoutRequestId, organizationId);
    } catch (error) {
      debug('Error in executeMuralPayoutRequest:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/payout/{payoutRequestId}/cancel')
  async cancelMuralPayoutRequest(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @param.path.string('payoutRequestId') payoutRequestId: string,
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<MuralPayoutResponse> {
    try {
      const organizationId = request.headers['on-behalf-of'] as string;
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.cancelPayoutRequest(payoutRequestId, organizationId);
    } catch (error) {
      debug('Error in cancelMuralPayoutRequest:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/organizations/search')
  async getMuralOrganizations(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: { filter?: any; limit?: number; nextId?: string },
  ): Promise<any> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      const { filter, limit, nextId } = data;
      return await muralProvider.getOrganizations(filter, limit, nextId);
    } catch (error) {
      debug('Error in getMuralOrganizations:', error);
      this.handleRateLimitError(error, response);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/transactions/search/account/{accountId}')
  async searchMuralTransactions(
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @param.path.string('accountId') accountId: string,
    @inject(RestBindings.Http.REQUEST) request: Request,
    @param.query.number('limit') limit?: number,
    @param.query.string('nextId') nextId?: string,
  ): Promise<MuralTransactionSearchResponse> {
    try {
      const organizationId = request.headers['on-behalf-of'] as string;
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.searchTransactions(accountId, limit, nextId, organizationId);
    } catch (error) {
      debug('Error in searchMuralTransactions:', error);
      this.handleRateLimitError(error, response);
    }
  }
}
