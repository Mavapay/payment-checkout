export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  icon?: string;
}

export interface ApiPaymentData {
  id: string;
  exchangeRate: number;
  usdToTargetCurrencyRate: number;
  sourceToTargetCurrencyRate: number;
  sourceCurrency: string;
  targetCurrency: string;
  transactionFeesInSourceCurrency: number;
  transactionFeesInTargetCurrency: number;
  amountInSourceCurrency: number;
  amountInTargetCurrency: number;
  paymentMethod: PaymentMethodType;
  expiry: string;
  isValid: boolean;
  invoice: string;
  hash: string;
  totalAmountInSourceCurrency: number;
  customerInternalFee: number;
  bankName: string;
  ngnBankAccountNumber: string;
  ngnAccountName: string;
  orderId: string;
  merchantName: string;
}

export interface BankTransferDetails {
  bankName: string;
  accountNumber: string;
  amount: number;
  currency: string;
  expiresAt: string;
  // Keep these for internal use but don't display in UI
  accountName?: string;
  orderId?: string;
}

export interface PaymentData {
  id: string;
  merchantName: string;
  merchantLogo: string;
  description: string;
  amount: number;
  totalAmount: number;
  fees: number;
  currency: string;
  targetCurrency: string;
  expiresAt: string;
  paymentMethods: PaymentMethod[];
  selectedMethod?: PaymentMethod;
  bankTransferDetails?: BankTransferDetails;
  status: "pending" | "completed" | "expired" | "cancelled";
  orderId: string;
  exchangeRate: number;
  hash: string;
}

export interface ApiResponse<T> {
  status: "ok" | "error";
  data: T;
  message?: string;
}

export const PaymentMethods = {
  BANKTRANSFER: "BANKTRANSFER",
  LIGHTNING: "LIGHTNING",
} as const;

export type PaymentMethodType =
  (typeof PaymentMethods)[keyof typeof PaymentMethods];
