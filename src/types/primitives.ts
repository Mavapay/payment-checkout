export const PaymentMethods = {
  BANKTRANSFER: "BANKTRANSFER",
  LIGHTNING: "LIGHTNING",
} as const;

export const TransactionCurrencies = {
  NGNKOBO: "NGNKOBO",
  BTCSAT: "BTCSAT",
  ZARCENT: "ZARCENT",
} as const;

export const SettlementCurrencies = {
  NGN: "NGN",
  ZAR: "ZAR",
  BTC: "BTC",
} as const;

export const SettlementCurrencyTransactionCurrencies = {
  [SettlementCurrencies.NGN]: TransactionCurrencies.NGNKOBO,
  [SettlementCurrencies.ZAR]: TransactionCurrencies.ZARCENT,
  [SettlementCurrencies.BTC]: TransactionCurrencies.BTCSAT,
} as const;

export const precisionByTransactionCurrency = {
  [TransactionCurrencies.NGNKOBO]: 1e2,
  [TransactionCurrencies.BTCSAT]: 1e8,
  [TransactionCurrencies.ZARCENT]: 1e2,
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
  SETTLED: "SETTLED",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export const ProcessingStatus = {
  SENT: "sent",
  CONFIRMING: "confirming",
  RECEIVED: "received",
} as const;
