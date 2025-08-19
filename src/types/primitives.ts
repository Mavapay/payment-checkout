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
