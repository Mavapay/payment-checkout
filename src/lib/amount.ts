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
    NGNKOBO: "₦",
    BTCSAT: "₿",
    USDCENT: "$",
    ZARCENT: "R",
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
  symbol: string,
) => {
  if (
    currency === TransactionCurrencies.NGNKOBO ||
    currency === TransactionCurrencies.ZARCENT ||
    currency === TransactionCurrencies.USDCENT
  ) {
    return `${symbol} ${amount.toLocaleString()}`;
  }
  return `${symbol} ${amount}`;
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
