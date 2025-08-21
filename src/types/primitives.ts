export const PaymentMethods = {
  BANKTRANSFER: "BANKTRANSFER",
  LIGHTNING: "LIGHTNING",
} as const;

export const TransactionCurrencies = {
  NGNKOBO: "NGNKOBO",
  BTCSAT: "BTCSAT",
} as const;

export const precisionByTransactionCurrency = {
  [TransactionCurrencies.NGNKOBO]: 1e2,
  [TransactionCurrencies.BTCSAT]: 1e8,
} as const;

export const PaymentTypes = {
  BANKTRANSFER: "bank_transfer",
  LIGHTNING: "lightning",
} as const;

export const storageKeys = {
  paymentData: "paymentData",
  selectedMethod: "selectedMethod",
} as const;

export const ApiPaymentStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export const ProcessingStatus = {
  SENT: "sent",
  CONFIRMING: "confirming",
  RECEIVED: "received",
} as const;
