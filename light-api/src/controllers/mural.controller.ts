import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { get, post, param, requestBody, HttpErrors, RestBindings, Request } from '@loopback/rest';
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

  // Account endpoints
  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/accounts')
  async getMuralAccounts(
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<MuralAccountsResponse> {
    try {
      const organizationId = request.headers['on-behalf-of'] as string;
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getAccounts(organizationId);
    } catch (error) {
      debug('Error in getMuralAccounts:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to list Mural accounts: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/accounts/{accountId}')
  async getMuralAccount(
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
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to get Mural account: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/accounts')
  async createMuralAccount(
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
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to create Mural account: ${error.message}`);
    }
  }

  // Organization endpoints
  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/organizations/{organizationId}')
  async getMuralOrganization(
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @param.path.string('organizationId') organizationId: string,
  ): Promise<MuralOrganization> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getOrganization(organizationId);
    } catch (error) {
      debug('Error in getMuralOrganization:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to get Mural organization: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/organizations')
  async createMuralOrganization(
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: MuralCreateOrganizationRequest,
  ): Promise<MuralOrganization> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.createOrganization(data);
    } catch (error) {
      debug('Error in createMuralOrganization:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to create Mural organization: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/organizations/{organizationId}/kyc-link')
  async getMuralOrganizationKycLink(
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @param.path.string('organizationId') organizationId: string,
  ): Promise<MuralKycLinkResponse> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getOrganizationKycLink(organizationId);
    } catch (error) {
      debug('Error in getMuralOrganizationKycLink:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to get Mural organization KYC link: ${error.message}`);
    }
  }

  // Payout endpoints
  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/payout')
  async createMuralPayoutRequest(
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
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to create Mural payout request: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/payouts/payout/{payoutRequestId}')
  async getMuralPayoutRequest(
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
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to get Mural payout request: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/search')
  async searchMuralPayoutRequests(
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
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to search Mural payout requests: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @get('/mural/{accountIdentifier}/payouts/bank-details')
  async getMuralBankDetails(
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
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to get Mural bank details: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/fees/token-to-fiat')
  async getMuralPayoutFeesForTokenAmount(
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: TokenFeeRequest[],
  ): Promise<TokenPayoutFeeSuccess | TokenPayoutFeeError> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getPayoutFeesForTokenAmount(data);
    } catch (error) {
      debug('Error in getMuralPayoutFeesForTokenAmount:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to calculate Mural token fee: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/fees/fiat-to-token')
  async getMuralPayoutFeesForFiatAmount(
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: FiatFeeRequest[],
  ): Promise<FiatPayoutFeeSuccess | FiatPayoutFeeError> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      return await muralProvider.getPayoutFeesForFiatAmount(data);
    } catch (error) {
      debug('Error in getMuralPayoutFeesForFiatAmount:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to calculate Mural fiat fee: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/payout/{payoutRequestId}/execute')
  async executeMuralPayoutRequest(
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
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to execute Mural payout request: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/payouts/payout/{payoutRequestId}/cancel')
  async cancelMuralPayoutRequest(
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
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to cancel Mural payout request: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/organizations/search')
  async getMuralOrganizations(
    @param.path.string('accountIdentifier') accountIdentifier: string,
    @requestBody() data: { filter?: any; limit?: number; nextId?: string },
  ): Promise<any> {
    try {
      const muralProvider = await this.getMuralProvider(accountIdentifier);
      const { filter, limit, nextId } = data;
      return await muralProvider.getOrganizations(filter, limit, nextId);
    } catch (error) {
      debug('Error in getMuralOrganizations:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to get Mural organizations: ${error.message}`);
    }
  }

  @authenticate('cognito')
  @post('/mural/{accountIdentifier}/transactions/search/account/{accountId}')
  async searchMuralTransactions(
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
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to search Mural transactions: ${error.message}`);
    }
  }
}
