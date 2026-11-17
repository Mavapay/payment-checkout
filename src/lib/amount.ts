import { ZAR_INSTANT_PAYOUT_FEE } from "@/config/process";
import { TransactionCurrency } from "@/types/payment";
import {
  precisionByTransactionCurrency,
  SettlementCurrencies,
  TransactionCurrencies,
} from "@/types/primitives";

export const formatAmountToHighestDenomination = (
  amount: number,
  currency: TransactionCurrency,
) => {
  const precisionUnit = precisionByTransactionCurrency[currency];
  return amount / precisionUnit;
};

export const getCurrencySymbol = (currency: string): string => {
  const currencyMap: { [key: string]: string } = {
    NGN: "₦",
    NGNKOBO: "₦",
    BTCSAT: "₿",
    BTC: "₿",
    USDCENT: "$",
    USD: "$",
    ZARCENT: "R",
    ZAR: "R",
    KES: "KSh",
    KESCENT: "KSh",
    USDT: "USDT",
    USDTUNIT: "USDT",
  };
  return currencyMap[currency] || currency;
};

export const getPaymentMethodName = (method: string): string => {
  const methodMap: { [key: string]: string } = {
    BANKTRANSFER: "Bank Transfer",
    LIGHTNING: "Lightning Invoice",
    MOBILEMONEY: "Mobile Money",
  };
  return methodMap[method] || method;
};

export const formatAmount = (
  amount: number,
  currency: string,
  symbol: string,
) => {
  if (
    currency === TransactionCurrencies.NGNKOBO ||
    currency === TransactionCurrencies.ZARCENT ||
    currency === TransactionCurrencies.USDCENT ||
    currency === TransactionCurrencies.KESCENT ||
    currency === TransactionCurrencies.USDTUNIT
  ) {
    return `${symbol} ${amount.toLocaleString()}`;
  }
  return `${symbol} ${amount}`;
};

const minorUnitsByCurrency: Record<string, number> = {
  NGN: precisionByTransactionCurrency[TransactionCurrencies.NGNKOBO],
  NGNKOBO: precisionByTransactionCurrency[TransactionCurrencies.NGNKOBO],
  KES: precisionByTransactionCurrency[TransactionCurrencies.KESCENT],
  KESCENT: precisionByTransactionCurrency[TransactionCurrencies.KESCENT],
  BTC: precisionByTransactionCurrency[TransactionCurrencies.BTCSAT],
  BTCSAT: precisionByTransactionCurrency[TransactionCurrencies.BTCSAT],
  USDT: precisionByTransactionCurrency[TransactionCurrencies.USDTUNIT],
  USDTUNIT: precisionByTransactionCurrency[TransactionCurrencies.USDTUNIT],
  USD: precisionByTransactionCurrency[TransactionCurrencies.USDCENT],
  USDCENT: precisionByTransactionCurrency[TransactionCurrencies.USDCENT],
  ZAR: precisionByTransactionCurrency[TransactionCurrencies.ZARCENT],
  ZARCENT: precisionByTransactionCurrency[TransactionCurrencies.ZARCENT],
};

export const parseBackendAmount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

export const minorUnitPrecision = (currency: string): number => {
  return minorUnitsByCurrency[currency] || 1;
};

export const minorToMajor = (
  value: unknown,
  currency: string,
): number | null => {
  const minor = parseBackendAmount(value);
  if (minor == null) {
    return null;
  }
  return minor / minorUnitPrecision(currency);
};

export const formatMajorAmount = (amount: number, currency: string): string => {
  if (currency === SettlementCurrencies.BTC || currency === "BTC") {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    }).format(amount);
    return `${formatted} BTC`;
  }

  if (currency === SettlementCurrencies.USDT || currency === "USDT") {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `USDT ${formatted}`;
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  const symbol = getCurrencySymbol(currency);
  if (symbol === currency) {
    return `${currency} ${formatted}`;
  }
  return `${symbol} ${formatted}`;
};

export const formatConfiguredAmount = (
  amount: unknown,
  paymentCurrency?: string,
): string | null => {
  if (!paymentCurrency) {
    return null;
  }
  const major = minorToMajor(amount, paymentCurrency);
  if (major == null) {
    return null;
  }
  return formatMajorAmount(major, paymentCurrency);
};

export const formatSettlementAmount = (
  minorAmount: unknown,
  settlementCurrency: string,
): string | null => {
  const major = minorToMajor(minorAmount, settlementCurrency);
  if (major == null) {
    return null;
  }
  if (settlementCurrency === SettlementCurrencies.BTC) {
    const minor = parseBackendAmount(minorAmount) ?? 0;
    return `${minor.toLocaleString("en-US")} SATS`;
  }
  return formatMajorAmount(major, settlementCurrency);
};

export const formatRate = ({
  sourceAmount,
  targetAmount,
  settlementCurrency,
  sourceSymbol,
  targetSymbol,
}: {
  sourceAmount: number;
  targetAmount: number;
  settlementCurrency: string;
  sourceSymbol: string;
  targetSymbol: string;
}) => {
  switch (settlementCurrency) {
    case SettlementCurrencies.NGN: {
      const formattedAmount = convertToTwoDecimalPlaces(
        sourceAmount / targetAmount,
      );
      return `${sourceSymbol} 1 = ${targetSymbol} ${formattedAmount}`;
    }
    case SettlementCurrencies.ZAR: {
      // We need to add the instant payout fee to the target amount to get the real rate
      const targetAmountWithInstantFee = targetAmount + ZAR_INSTANT_PAYOUT_FEE;
      const formattedAmount = convertToTwoDecimalPlaces(
        sourceAmount / targetAmountWithInstantFee,
      );
      return `${targetSymbol} 1 = ${sourceSymbol} ${formattedAmount}`;
    }
    case SettlementCurrencies.BTC: {
      const convertedTargetAmount =
        targetAmount /
        precisionByTransactionCurrency[TransactionCurrencies.BTCSAT];
      const formattedAmount = convertToTwoDecimalPlaces(
        sourceAmount / convertedTargetAmount,
      );
      return `${targetSymbol} 1 = ${sourceSymbol} ${formattedAmount}`;
    }
    default:
      const formattedAmount = convertToTwoDecimalPlaces(
        sourceAmount / targetAmount,
      );
      return `${sourceSymbol} 1 = ${targetSymbol} ${formattedAmount}`;
  }
};

export const convertToTwoDecimalPlaces = (amount: number) => {
  const formattedAmount = Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount.toFixed(2)));
  return formattedAmount;
};
