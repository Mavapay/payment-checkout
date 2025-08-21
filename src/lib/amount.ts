import { TransactionCurrency } from "@/types/payment";
import {
  precisionByTransactionCurrency,
  TransactionCurrencies,
} from "@/types/primitives";

export const formatAmountToHighestDenomination = (
  amount: number,
  currency: TransactionCurrency
) => {
  const precisionUnit = precisionByTransactionCurrency[currency];
  return amount / precisionUnit;
};

export const getCurrencySymbol = (currency: string): string => {
  const currencyMap: { [key: string]: string } = {
    NGNKOBO: "₦",
    BTCSAT: "₿",
    USDCENT: "$",
  };
  return currencyMap[currency] || currency;
};

export const getPaymentMethodName = (method: string): string => {
  const methodMap: { [key: string]: string } = {
    BANKTRANSFER: "Bank Transfer",
    LIGHTNING: "Lightning Invoice",
  };
  return methodMap[method] || method;
};

export const formatAmount = (
  amount: number,
  currency: string,
  symbol: string
) => {
  if (currency === TransactionCurrencies.NGNKOBO) {
    return `${symbol} ${amount.toLocaleString()}`;
  }
  return `${symbol} ${amount}`;
};
