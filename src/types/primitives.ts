export const PaymentMethods = {
  BANKTRANSFER: "BANKTRANSFER",
  LIGHTNING: "LIGHTNING",
  MOBILEMONEY: "MOBILEMONEY",
} as const;

export const TransactionCurrencies = {
  NGNKOBO: "NGNKOBO",
  BTCSAT: "BTCSAT",
  ZARCENT: "ZARCENT",
  USDCENT: "USDCENT",
  KESCENT: "KESCENT",
  USDTCENT: "USDTCENT",
} as const;

export const SettlementCurrencies = {
  NGN: "NGN",
  ZAR: "ZAR",
  BTC: "BTC",
  USD: "USD",
  USDT: "USDT",
} as const;

export const PaymentCurrencies = {
  NGN: "NGN",
  KES: "KES",
  BTC: "BTC",
  USDT: "USDT",
  ZAR: "ZAR",
  USD: "USD",
} as const;

export const SettlementCurrencyTransactionCurrencies = {
  [SettlementCurrencies.NGN]: TransactionCurrencies.NGNKOBO,
  [SettlementCurrencies.ZAR]: TransactionCurrencies.ZARCENT,
  [SettlementCurrencies.BTC]: TransactionCurrencies.BTCSAT,
  [SettlementCurrencies.USD]: TransactionCurrencies.USDCENT,
  [SettlementCurrencies.USDT]: TransactionCurrencies.USDTCENT,
} as const;

export const precisionByTransactionCurrency = {
  [TransactionCurrencies.NGNKOBO]: 1e2,
  [TransactionCurrencies.BTCSAT]: 1e8,
  [TransactionCurrencies.ZARCENT]: 1e2,
  [TransactionCurrencies.USDCENT]: 1e2,
  [TransactionCurrencies.KESCENT]: 1e2,
  [TransactionCurrencies.USDTCENT]: 1e2,
} as const;

export const PaymentTypes = {
  BANKTRANSFER: "bank_transfer",
  LIGHTNING: "lightning",
  MOBILEMONEY: "mobile_money",
} as const;

export const storageKeys = {
  paymentData: "paymentData",
  selectedMethod: "selectedMethod",
  pendingCheckout: "pendingCheckout",
} as const;

export const ApiPaymentStatus = {
  PENDING: "PENDING",
  SETTLED: "SETTLED",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export const PromptStatuses = {
  INITIATING: "INITIATING",
  SENT: "SENT",
  TIMED_OUT: "TIMED_OUT",
  FAILED: "FAILED",
  UNKNOWN: "UNKNOWN",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCEEDED",
} as const;

export const CollectionPaymentStatuses = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
} as const;

export const CheckoutErrorCodes = {
  PROMPT_RETRY_TOO_EARLY: "PROMPT_RETRY_TOO_EARLY",
  REQUEST_ID_REUSED: "REQUEST_ID_REUSED",
  COLLECTION_UNCONFIRMED: "COLLECTION_UNCONFIRMED",
  PAYMENT_ALREADY_RECEIVED: "PAYMENT_ALREADY_RECEIVED",
  ORDER_FAILED: "ORDER_FAILED",
  LEGACY_COLLECTION_ADOPTED: "LEGACY_COLLECTION_ADOPTED",
} as const;

export const CheckoutPhases = {
  COLLECTING: "collecting",
  SUBMITTING: "submitting",
  PENDING: "pending",
  QUOTE_EXPIRED: "quote_expired",
  RECEIVED: "received",
  FAILED: "failed",
  NEEDS_RETRY: "needs_retry",
  REQUEST_ID_REUSED: "request_id_reused",
  SETTLED: "settled",
} as const;

export const ProcessingStatus = {
  SENT: "sent",
  CONFIRMING: "confirming",
  RECEIVED: "received",
} as const;

export const STATUS_POLL_INTERVAL_MS = 5000;

export const BLOCKING_PROMPT_STATUSES = [
  PromptStatuses.INITIATING,
  PromptStatuses.UNKNOWN,
  PromptStatuses.PROCESSING,
  PromptStatuses.SUCCEEDED,
] as const;
