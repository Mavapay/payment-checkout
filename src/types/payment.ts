import {
  ApiPaymentStatus,
  ProcessingStatus,
  PaymentMethods,
  PaymentTypes,
  TransactionCurrencies,
} from "./primitives";

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  icon?: string;
}

// Real API Response structure
export interface ApiPaymentLinkDetails {
  id: string;
  name: string;
  description: string;
  callbackUrl: string;
  paymentLinkOrderId: string;
  paymentMethods: string[];
  settlementCurrency: TransactionCurrency;
  account: {
    name: string;
    logo: string;
  };
  LIGHTNING?: {
    invoice: string;
    amount: number;
    targetAmount: number;
    expiresAt: string;
  };
  BANKTRANSFER?: {
    ngnAccountName: string;
    ngnBankName: string;
    ngnBankAccountNumber: string;
    amount: number;
    targetAmount: number;
    expiresAt: string;
  };
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
  // Keep these for internal use but don't display in UI
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

export interface PaymentData {
  id: string;
  merchantName: string;
  merchantLogo: string;
  description: string;
  amount: number;
  settlementCurrency: TransactionCurrency;
  expiresAt: string;
  paymentMethods: PaymentMethod[];
  selectedMethod?: PaymentMethod;
  bankTransferDetails?: BankTransferDetails;
  lightningInvoiceDetails?: LightningInvoiceDetails;
  status: ApiPaymentStatusType;
  orderId: string;
  paymentLinkId: string;
  callbackUrl: string;
}

export interface ApiResponse<T> {
  status: "ok" | "error" | "success";
  data: T;
  message?: string;
}

export type PaymentMethodType =
  (typeof PaymentMethods)[keyof typeof PaymentMethods];

export type TransactionCurrency =
  (typeof TransactionCurrencies)[keyof typeof TransactionCurrencies];

export type PaymentType = (typeof PaymentTypes)[keyof typeof PaymentTypes];

export type ApiPaymentStatusType =
  (typeof ApiPaymentStatus)[keyof typeof ApiPaymentStatus];

export type ProcessingStatusType =
  (typeof ProcessingStatus)[keyof typeof ProcessingStatus];
