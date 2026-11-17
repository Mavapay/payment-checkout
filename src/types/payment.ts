import {
  ApiPaymentStatus,
  CheckoutErrorCodes,
  CheckoutPhases,
  ProcessingStatus,
  PromptStatuses,
  PaymentMethods,
  PaymentTypes,
  TransactionCurrencies,
  SettlementCurrencies,
} from "./primitives";

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  icon?: string;
}

export type BackendAmount = number | string;

export interface ApiMobileMoneyDetails {
  requiresPaymentSource?: boolean;
  sourceCurrency?: string;
  amount?: BackendAmount;
  targetAmount?: BackendAmount;
  expiresAt?: string;
  requestId?: string;
  attemptId?: string;
  quoteId?: string;
  orderId?: string;
  paymentStatus?: string;
  promptStatus?: string;
  canRetry?: boolean;
  retryAllowedAt?: string;
  quoteExpiresAt?: string;
  serverTime?: string;
  paymentLinkOrderId?: string;
}

export interface ApiPaymentLinkDetails {
  id: string;
  name: string;
  description: string;
  callbackUrl: string;
  paymentLinkOrderId?: string;
  paymentMethods: string[];
  settlementCurrency: SettlementCurrency;
  paymentCurrency?: string;
  amount?: BackendAmount;
  account: {
    name: string;
    logo: string;
  };
  LIGHTNING?: {
    invoice: string;
    amount: BackendAmount;
    targetAmount: BackendAmount;
    expiresAt: string;
  };
  BANKTRANSFER?: {
    ngnAccountName: string;
    ngnBankName: string;
    ngnBankAccountNumber: string;
    amount: BackendAmount;
    targetAmount: BackendAmount;
    expiresAt: string;
  };
  MOBILEMONEY?: ApiMobileMoneyDetails;
}

export interface ApiPaymentData {
  paymentLinkDetails: ApiPaymentLinkDetails;
}

export interface BankTransferDetails {
  bankName: string;
  accountNumber: string;
  amount: number;
  targetAmount: number;
  currencySymbol: string;
  currency: string;
  expiresAt: string;
  accountName?: string;
  orderId?: string;
}

export interface LightningInvoiceDetails {
  invoice: string;
  amount: number;
  targetAmount: number;
  currencySymbol: string;
  currency: string;
  satsAmount: number;
  expiresAt: string;
  qrCodeData: string;
}

export interface MobileMoneyDetails {
  requiresPaymentSource: boolean;
  sourceCurrency: string;
  configuredAmount?: number;
  paymentCurrency?: string;
  amount?: number;
  targetAmount?: number;
  expiresAt?: string;
  quoteExpiresAt?: string;
  requestId?: string;
  attemptId?: string;
  quoteId?: string;
  internalOrderId?: string;
  paymentStatus?: string;
  promptStatus?: string;
  canRetry?: boolean;
  retryAllowedAt?: string;
  serverTime?: string;
  clockReceivedAt?: number;
}

export interface PaymentData {
  id: string;
  name?: string;
  merchantName: string;
  merchantLogo: string;
  description: string;
  amount: number;
  configuredAmount?: number;
  paymentCurrency?: string;
  settlementCurrency: SettlementCurrency;
  expiresAt: string;
  paymentMethods: PaymentMethod[];
  selectedMethod?: PaymentMethod;
  bankTransferDetails?: BankTransferDetails;
  lightningInvoiceDetails?: LightningInvoiceDetails;
  mobileMoneyDetails?: MobileMoneyDetails;
  status: ApiPaymentStatusType;
  orderId: string;
  paymentLinkId: string;
  callbackUrl: string;
}

export interface ApiResponse<T> {
  status: "ok" | "error" | "success";
  data: T;
  message?: string;
  code?: string;
  retryAfterSeconds?: number;
  cancelled?: boolean;
}

export type PaymentMethodType =
  (typeof PaymentMethods)[keyof typeof PaymentMethods];

export type TransactionCurrency =
  (typeof TransactionCurrencies)[keyof typeof TransactionCurrencies];

export type SettlementCurrency =
  (typeof SettlementCurrencies)[keyof typeof SettlementCurrencies];

export type PaymentType = (typeof PaymentTypes)[keyof typeof PaymentTypes];

export type ApiPaymentStatusType =
  (typeof ApiPaymentStatus)[keyof typeof ApiPaymentStatus];

export type ProcessingStatusType =
  (typeof ProcessingStatus)[keyof typeof ProcessingStatus];

export type PromptStatus = (typeof PromptStatuses)[keyof typeof PromptStatuses];

export type CheckoutErrorCode =
  (typeof CheckoutErrorCodes)[keyof typeof CheckoutErrorCodes];

export type CheckoutPhase = (typeof CheckoutPhases)[keyof typeof CheckoutPhases];

export interface PayerPayload {
  phoneNumber: string;
  firstName: string;
  lastName: string;
}

export interface CheckoutSubmission {
  requestId: string;
  paymentSource: PayerPayload;
}

export interface CollectionMetadata {
  requestId?: string;
  attemptId?: string;
  quoteId?: string;
  internalOrderId?: string;
  paymentStatus?: string;
  promptStatus?: string;
  canRetry?: boolean;
  retryAllowedAt?: string;
  quoteExpiresAt?: string;
  serverTime?: string;
  paymentLinkOrderId?: string;
}

export interface PaymentStatusData {
  status: ApiPaymentStatusType;
  collection?: CollectionMetadata;
}

export interface NormalizedCheckoutDetails {
  paymentLinkOrderId: string;
  sourceCurrency: string;
  payableMinor: number;
  payableMajor: number;
  targetMinor: number;
  targetMajor: number;
  expiresAt?: string;
  requestId?: string;
  attemptId?: string;
  quoteId?: string;
  internalOrderId?: string;
  paymentStatus?: string;
  promptStatus?: string;
  canRetry?: boolean;
  retryAllowedAt?: string;
  quoteExpiresAt?: string;
  serverTime?: string;
}

export interface NormalizedCheckoutError {
  httpStatus?: number;
  code?: string;
  message: string;
  userMessage: string;
  retryAfterSeconds?: number;
  paymentLinkOrderId?: string;
  collection?: CollectionMetadata;
  network: boolean;
  reuseRequest: boolean;
  resumePolling: boolean;
  cancelled?: boolean;
}
