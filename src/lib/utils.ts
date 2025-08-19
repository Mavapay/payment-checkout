import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { TransactionCurrency } from "@/types/payment";
import { precisionByTransactionCurrency } from "@/types/primitives";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatAmountToHighestDenomination = (
  amount: number,
  currency: TransactionCurrency
) => {
  const precisionUnit = precisionByTransactionCurrency[currency];
  return amount / precisionUnit;
};

export const formatAmount = ({
  amount,
  locale,
  currency,
  minimumFractionDigits = 2,
}: {
  amount: number;
  locale: "en-NG" | "en-US";
  currency: TransactionCurrency;
  minimumFractionDigits?: number;
}) => {
  const formattedAmount = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits,
  }).format(amount);
  return formattedAmount;
};

export const copyToClipboard = async (value: string) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (e) {
    console.log("Failed to copy, using fallback", e);
    // Fallback for browsers that don't support clipboard API
    const textArea = document.createElement("textarea");
    textArea.value = value;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      console.log("Failed to copy:", e);
    }
    document.body.removeChild(textArea);
  }
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
