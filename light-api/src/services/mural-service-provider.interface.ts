import {
    MuralAccount,
    MuralAccountsResponse,
    MuralCreateAccountRequest,
    MuralOrganization,
    MuralCreateOrganizationRequest,
    MuralKycLinkResponse,
    MuralCreatePayoutRequest,
    MuralPayoutResponse,
    PayoutStatusFilter,
    PayoutSearchResponse,
    BankDetailsResponse,
    TokenFeeRequest,
    TokenPayoutFeeSuccess,
    TokenPayoutFeeError,
    FiatFeeRequest,
    FiatPayoutFeeSuccess,
    FiatPayoutFeeError,
    MuralTransactionSearchResponse
  } from './mural.interfaces';
  
  export interface MuralServiceProvider {
    initialize(config: {
      baseUrl: string;
      apiKey: string;
      transferApiKey: string;
      organizationId?: string;
    }): void;
  
    // Account operations
    getAccount(accountId: string, organizationId?: string): Promise<MuralAccount>;
    getAccounts(organizationId?: string): Promise<MuralAccountsResponse>;
    createAccount(name: string, description?: string, organizationId?: string): Promise<MuralAccount>;
  
    // Organization operations
    getOrganization(organizationId: string): Promise<MuralOrganization>;
    getOrganizations(filter?: any, limit?: number, nextId?: string): Promise<any>;
    createOrganization(organizationRequest: MuralCreateOrganizationRequest): Promise<MuralOrganization>;
    getOrganizationKycLink(organizationId: string): Promise<MuralKycLinkResponse>;
  
    // Payout operations
    createPayoutRequest(payoutRequest: MuralCreatePayoutRequest, organizationId?: string): Promise<MuralPayoutResponse>;
    getPayoutRequest(payoutRequestId: string, organizationId?: string): Promise<MuralPayoutResponse>;
    searchPayoutRequests(filter: PayoutStatusFilter, limit?: number, nextId?: string, organizationId?: string): Promise<PayoutSearchResponse>;
    getBankDetails(fiatCurrencyAndRail: string[]): Promise<BankDetailsResponse>;
    getPayoutFeesForTokenAmount(tokenFeeRequest: TokenFeeRequest[]): Promise<TokenPayoutFeeSuccess | TokenPayoutFeeError>;
    getPayoutFeesForFiatAmount(fiatFeeRequest: FiatFeeRequest[]): Promise<FiatPayoutFeeSuccess | FiatPayoutFeeError>;
    executePayoutRequest(payoutRequestId: string): Promise<MuralPayoutResponse>;
    cancelPayoutRequest(payoutRequestId: string, organizationId?: string): Promise<MuralPayoutResponse>;
    searchTransactions(
      accountId: string,
      limit?: number,
      nextId?: string,
      organizationId?: string
    ): Promise<MuralTransactionSearchResponse>;
  
  }
  