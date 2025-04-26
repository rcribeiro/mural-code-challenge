import { MuralAccountStatus, MuralAccountType, MuralBlockchain, MuralCurrency, MuralDepositAccountStatus, MuralPayoutPurpose, MuralPaymentRail } from './mural.enums';

// Base interfaces
export interface PaginationResponse {
  nextId?: string;
  total: number;
}

export interface ErrorResponse {
  message: string;
  code?: string;
}

// Account interfaces
export interface MuralWalletDetails {
  blockchain: MuralBlockchain;
  walletAddress: string;
}

export interface MuralBalance {
  tokenAmount: number;
  tokenSymbol: string;
}

export interface MuralDepositAccount {
  id: string;
  status: MuralDepositAccountStatus;
  currency: MuralCurrency;
  bankBeneficiaryName: string;
  bankBeneficiaryAddress: string;
  bankName: string;
  bankAddress: string;
  bankRoutingNumber: string;
  bankAccountNumber: string;
  paymentRails: MuralPaymentRail[];
}

export interface MuralAccountDetails {
  walletDetails: MuralWalletDetails;
  balances: MuralBalance[];
  depositAccount: MuralDepositAccount;
}

export interface MuralAccount {
  organizationId?: string;
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isApiEnabled: boolean;
  status: MuralAccountStatus;
  accountDetails?: MuralAccountDetails;
}

export interface MuralCreateAccountRequest {
  name: string;
  description?: string;
}

export interface MuralAccountsResponse {
  accounts?: MuralAccount[];
}

// Currency capability status types
export interface MuralCurrencyStatusEnabled {
  type: 'enabled';
}

export interface MuralCurrencyStatusDisabled {
  type: 'disabled';
  reason?: string;
  details?: string;
}

export interface MuralCurrencyStatusTermsOfService {
  type: 'termsOfService';
  details: string;
}

export interface MuralCurrencyCapability {
  fiatAndRailCode: string;
  currencyCode: string;
  depositStatus: MuralCurrencyStatus;
  payOutStatus: MuralCurrencyStatus;
}

// Base organization interface
export interface MuralBaseOrganization {
  id: string;
  createdAt: string;
  updatedAt: string;
  kycStatus: MuralKycStatus; // Changed from 'status: string' to 'kycStatus: MuralKycStatus'
  currencyCapabilities: MuralCurrencyCapability[];
}

// Define the possible KYC status types
export type MuralKycStatus = 
  | MuralInactiveStatus
  | MuralPendingStatus
  | MuralApprovedStatus
  | MuralErrorStatus
  | MuralRejectedStatus;

// Define each status type
export interface MuralInactiveStatus {
  type: 'inactive';
}

export interface MuralPendingStatus {
  type: 'pending';
}

export interface MuralApprovedStatus {
  type: 'approved';
}

export interface MuralErrorStatus {
  type: 'error';
  details: string;
}

export interface MuralRejectedStatus {
  type: 'rejected';
  reason: string;
}

// Also define the currency capability status types
export type MuralCurrencyStatus = 
  | MuralTermsOfServiceStatus
  | MuralAwaitingKycStatus
  | MuralEnabledStatus
  | MuralRejectedCurrencyStatus
  | MuralRestrictedStatus;

export interface MuralTermsOfServiceStatus {
  type: 'termsOfService';
  details: string;
}

export interface MuralAwaitingKycStatus {
  type: 'awaitingKYC';
  details: string;
}

export interface MuralEnabledStatus {
  type: 'enabled';
}

export interface MuralRejectedCurrencyStatus {
  type: 'rejected';
  reason: string;
  details: string;
}

export interface MuralRestrictedStatus {
  type: 'disabled';
  reason: string;
  details: string;
}

// Update the MuralCurrencyCapability interface
export interface MuralCurrencyCapability {
  fiatAndRailCode: string;
  currencyCode: string;
  depositStatus: MuralCurrencyStatus;
  payOutStatus: MuralCurrencyStatus;
}

// Individual organization response
export interface MuralIndividualOrganization extends MuralBaseOrganization {
  type: 'individual';
  firstName: string;
  lastName: string;
}

// Business organization response
export interface MuralBusinessOrganization extends MuralBaseOrganization {
  type: 'business';
  name: string;
}

// Union type for organization responses
export type MuralOrganization = MuralIndividualOrganization | MuralBusinessOrganization;

// Base interface for organization requests
export interface MuralBaseOrganizationRequest {
  type: string;
}

// Individual organization request
export interface MuralIndividualOrganizationRequest extends MuralBaseOrganizationRequest {
  type: 'individual';
  firstName: string;
  lastName: string;
  email: string;
}

// Business organization request
export interface MuralBusinessOrganizationRequest extends MuralBaseOrganizationRequest {
  type: 'business';
  businessName: string;
}

// Physical address interface for delegated KYC
export interface MuralPhysicalAddress {
  address1: string;
  address2?: string;
  country: string;
  state: string;
  city: string;
  zip: string;
}

// Delegated KYC Business organization request
export interface MuralDelegatedKycBusinessOrganizationRequest extends MuralBaseOrganizationRequest {
  type: 'delegatedKycBusiness';
  physicalAddress: MuralPhysicalAddress;
  email: string;
  taxId: string;
  formationDate: string; // Format: yyyy-MM-dd
  businessName: string;
}

// Delegated KYC Individual organization request
export interface MuralDelegatedKycIndividualOrganizationRequest extends MuralBaseOrganizationRequest {
  type: 'delegatedKycIndividual';
  physicalAddress: MuralPhysicalAddress;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  taxId: string;
  dateOfBirth: string; // Format: yyyy-MM-dd
  nationality: string; // ISO 3166-1 (three-character) country code
}

// Union type for all organization request types
export type MuralCreateOrganizationRequest = 
  | MuralIndividualOrganizationRequest 
  | MuralBusinessOrganizationRequest 
  | MuralDelegatedKycBusinessOrganizationRequest 
  | MuralDelegatedKycIndividualOrganizationRequest;

export interface MuralKycLinkResponse {
  url: string;
  expiresAt: string;
}

// Transfer interfaces
export interface MuralTransferFee {
  fiatCurrencyCode: string;
  fiatAmount: string;
  tokenAmount: string;
  feeAmount: string;
  exchangeRate: string;
}

export interface MuralExternalDestination {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}

export interface MuralCreateTransferRequest {
  sourceAccountId: string;
  destinationType: 'ACCOUNT' | 'EXTERNAL';
  destinationAccountId?: string;
  externalDestination?: MuralExternalDestination;
  amount: string;
  currency: string;
  memo?: string;
  callbackUrl?: string;
}

export type MuralTransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'FAILED';

export interface MuralTransferRequest {
  id: string;
  sourceAccountId: string;
  destinationType: 'ACCOUNT' | 'EXTERNAL';
  destinationAccountId?: string;
  externalDestination?: MuralExternalDestination;
  amount: string;
  currency: string;
  memo?: string;
  status: MuralTransferStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface MuralTransferRequestsResponse {
  transferRequests: MuralTransferRequest[];
}

// Payout interfaces
export interface TokenAmount {
  tokenAmount: number;
  tokenSymbol: string;
}

export interface FiatAmount {
  fiatAmount: number;
  fiatCurrencyCode: string;
}

export type PayoutStatus = 'AWAITING_EXECUTION' | 'CANCELED' | 'PENDING' | 'EXECUTED' | 'FAILED';
export type FiatPayoutStatusType = 'created' | 'pending' | 'on_hold' | 'completed' | 'failed' | 'canceled';

export interface FiatPayoutStatus {
  type: FiatPayoutStatusType;
}

export interface FiatPayoutDetails {
  type: 'fiat';
  fiatAndRailCode: string;
  fiatPayoutStatus: FiatPayoutStatus;
  fiatAmount: FiatAmount;
  transactionFee: TokenAmount;
  exchangeFeePercentage: number;
  exchangeRate: number;
  feeTotal: TokenAmount;
}

export interface BlockchainPayoutDetails {
  type: 'blockchain';
  blockchain: MuralBlockchain;
  walletAddress: string;
  status: PayoutStatus;
}

export interface RecipientPayoutDetail {
  id: string;
  createdAt: string;
  updatedAt: string;
  amount: TokenAmount;
  details: FiatPayoutDetails | BlockchainPayoutDetails;
}

export interface MuralPayoutResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceAccountId: string;
  transactionHash?: string;
  memo?: string;
  status: PayoutStatus;
  recipientsPayoutDetails: RecipientPayoutDetail[];
}

export interface PhysicalAddress {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface IndividualRecipientInfo {
  type: 'individual';
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  physicalAddress: PhysicalAddress;
}

export interface BusinessRecipientInfo {
  type: 'business';
  name: string;
  email: string;
  physicalAddress: PhysicalAddress;
}

export interface FiatPayoutDetailsRequest {
  type: 'fiat';
  bankName: string;
  bankAccountOwner: string;
  fiatAndRailDetails: {
    type: string;
    symbol: string;
    accountType: MuralAccountType;
    bankAccountNumber: string;
    bankRoutingNumber: string;
    // Other fields as needed
    [key: string]: string | undefined;
  };
}

export interface BlockchainPayoutDetailsRequest {
  type: 'blockchain';
  walletDetails: {
    blockchain: MuralBlockchain;
    walletAddress: string;
  }
  address: string;
}

export interface PayoutItem {
  amount: TokenAmount;
  payoutDetails: FiatPayoutDetailsRequest | BlockchainPayoutDetailsRequest;
  recipientInfo: IndividualRecipientInfo | BusinessRecipientInfo;
  supportingDetails?: {
    supportingDocument?: string; // Base64 encoded
    payoutPurpose?: MuralPayoutPurpose;
  };
}

export interface MuralCreatePayoutRequest {
  sourceAccountId: string;
  memo?: string;
  payouts: PayoutItem[];
}

export interface BankDetailsResponse {
  bankDetails: {
    [fiatAndRailCode: string]: {
      bankNames: string[];
    };
  };
}

export interface TokenFeeRequest {
  amount: TokenAmount;
  fiatAndRailCode: string;
}

export interface TokenPayoutFeeSuccess {
  type: 'success';
  exchangeRate: number;
  exchangeFeePercentage: number;
  fiatAndRailCode: string;
  transactionFee: TokenAmount;
  minTransactionValue?: TokenAmount;
  estimatedFiatAmount: FiatAmount;
  tokenAmount: TokenAmount;
}

export interface TokenPayoutFeeError {
  type: 'error';
  tokenAmount: TokenAmount;
  message: string;
  fiatAndRailCode: string;
}

export interface FiatFeeRequest {
  fiatAmount: number;
  tokenSymbol: string;
  fiatAndRailCode: string;
}

export interface FiatPayoutFeeSuccess {
  type: 'success';
  exchangeRate: number;
  exchangeFeePercentage: number;
  fiatAndRailCode: string;
  transactionFee: TokenAmount;
  minTransactionValue?: TokenAmount;
  estimatedTokenAmountRequired: TokenAmount;
  fiatAmount: FiatAmount;
}

export interface FiatPayoutFeeError {
  type: 'error';
  message: string;
  fiatAndRailCode: string;
  tokenSymbol: string;
}

export interface PayoutStatusFilter {
  type: 'payoutStatus';
  statuses: PayoutStatus[];
}

export interface PayoutSearchResponse extends PaginationResponse {
  results: MuralPayoutResponse[];
}

export interface MuralTransactionAmount {
  tokenAmount: number;
  tokenSymbol: string;
}

export interface MuralFiatAmount {
  fiatAmount: number;
  fiatCurrencyCode: string;
}

export interface MuralUnknownCounterpartyInfo {
  type: 'unknown';
}

export interface MuralNamedCounterpartyInfo {
  type: 'counterparty';
  name: string;
}

export type MuralCounterpartyInfo = MuralUnknownCounterpartyInfo | MuralNamedCounterpartyInfo;

export interface MuralPayoutTransactionDetails {
  type: 'payout';
  payoutRequestId: string;
  payoutId: string;
}

export interface MuralWireSenderMetadata {
  type: 'wire';
  wireRoutingNumber: string;
  senderName: string;
  bankName: string;
  bankBeneficiaryName: string;
  imad: string;
}

export interface MuralAchSenderMetadata {
  type: 'ach';
  achRoutingNumber: string;
  senderName: string;
  bankName: string;
}

export interface MuralDepositAwaitingFundsStatus {
  type: 'awaitingFunds';
  initiatedAt: string;
}

export interface MuralDepositCompletedStatus {
  type: 'completed';
  initiatedAt: string;
  completedAt: string;
}

export interface MuralFiatAmount {
  fiatCurrencyCode: string;
  fiatAmount: number;
}

export interface MuralFiatDepositMetadata {
  type: 'fiat';
  depositId: string;
  createdAt: string;
  sentFiatAmount: MuralFiatAmount;
  senderMetadata?: MuralAchSenderMetadata | MuralWireSenderMetadata;
  depositStatusInfo: MuralDepositAwaitingFundsStatus | MuralDepositCompletedStatus;
}

export interface MuralBlockchainDepositMetadata {
  type: 'blockchain';
  address: string;
  blockchain: MuralBlockchain;
}

export interface MuralDepositTransactionDetails {
  type: 'deposit';
  details: MuralFiatDepositMetadata;
}

export type MuralTransactionDetails = MuralPayoutTransactionDetails | MuralDepositTransactionDetails;

export interface MuralTransaction {
  id: string;
  hash: string;
  transactionExecutionDate: string;
  blockchain: string;
  amount: {
    tokenAmount: number;
    tokenSymbol: string;
  };
  accountId: string;
  memo: string;
  counterpartyInfo: {
    type: string;
  };
  transactionDetails: MuralDepositTransactionDetails;
}

export interface MuralTransactionSearchResponse extends PaginationResponse {
  results: MuralTransaction[];
}
