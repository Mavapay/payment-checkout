import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { TransactionCurrency } from "@/types/payment";
import {
  precisionByTransactionCurrency,
  TransactionCurrencies,
} from "@/types/primitives";

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

export const copyToClipboard = async (value: string) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (e) {
    console.error("Failed to copy, using fallback", e);
    // Fallback for browsers that don't support clipboard API
    const textArea = document.createElement("textarea");
    textArea.value = value;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      console.error("Failed to copy:", e);
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

export const calculateTimeLeft = (expiresAt: string) => {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const difference = expiry - now;

  if (difference > 0) {
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return "0:00:00";
};
