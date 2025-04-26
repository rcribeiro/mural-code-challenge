// mural.enums.ts
export enum MuralAccountStatus {
    ACTIVE = 'ACTIVE',
    INITIALIZING = 'INITIALIZING',
  }
  
  export enum MuralDepositAccountStatus {
    ACTIVATED = 'ACTIVATED',
    DEACTIVATED = 'DEACTIVATED',
  }
  
  export enum MuralBlockchain {
    ETHEREUM = 'ETHEREUM',
    POLYGON = 'POLYGON',
    BASE = 'BASE',
    CELO = 'CELO',
  }
  
  export enum MuralCurrency {
    USD = 'USD',
    EUR = 'EUR',
    GBP = 'GBP'
  }
  
  export enum MuralPaymentRail {
    ACH = 'ACH',
    WIRE = 'WIRE',
    SEPA = 'SEPA',
    SWIFT = 'SWIFT'
  }

  export enum MuralKycStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    REJECTED = 'REJECTED'
  }

  export enum MuralTransferDestinationType {
    ACCOUNT = 'ACCOUNT',
    EXTERNAL = 'EXTERNAL'
  }

  export enum MuralTransferStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
  }

  export enum MuralPayoutStatus {
    AWAITING_EXECUTION = 'AWAITING_EXECUTION',
    CANCELED = 'CANCELED',
    PENDING = 'PENDING',
    EXECUTED = 'EXECUTED',
    FAILED = 'FAILED'
  }

  export enum MuralFiatPayoutStatusType {
    CREATED = 'created',
    PENDING = 'pending',
    ON_HOLD = 'on_hold',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELED = 'canceled'
  }

  export enum MuralPayoutDetailsType {
    FIAT = 'fiat',
    BLOCKCHAIN = 'blockchain'
  }

  export enum MuralRecipientType {
    INDIVIDUAL = 'individual',
    BUSINESS = 'business'
  }

  export enum MuralPayoutPurpose {
    VENDOR_PAYMENT = 'VENDOR_PAYMENT',
    PAYROLL = 'PAYROLL',
    TAX_PAYMENT = 'TAX_PAYMENT',
    RENT_RELEASE_PAYMENT = 'RENT_RELEASE_PAYMENT',
    SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT',
    PERSONAL_GIFT = 'PERSONAL_GIFT',
    FAMILY_SUPPORT = 'FAMILY_SUPPORT',
    CHARITABLE_DONATION = 'CHARITABLE_DONATION',
    EXPENSE_REIMBURSEMENT = 'EXPENSE_REIMBURSEMENT',
    BILL_UTILITY_PAYMENT = 'BILL_UTILITY_PAYMENT',
    TRAVEL_EXPENSES = 'TRAVEL_EXPENSES',
    INVESTMENT_CONTRIBUTION = 'INVESTMENT_CONTRIBUTION',
    CASH_WITHDRAWAL = 'CASH_WITHDRAWAL',
    REAL_STATE_PURCHASE = 'REAL_STATE_PURCHASE',
    OTHER = 'OTHER'
  }

export enum MuralAccountType {
    CHECKING  = 'CHECKING',
    SAVINGS = 'SAVINGS',
  }