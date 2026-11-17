import { getCurrencySymbol } from "@/lib/amount";
import {
  ApiPaymentData,
  ApiPaymentLinkDetails,
  MobileMoneyDetails,
  PaymentData,
  PaymentMethod,
  PaymentMethodType,
  BankTransferDetails,
  LightningInvoiceDetails,
  NormalizedCheckoutDetails,
} from "@/types/payment";
import type { MobileMoneyView } from "@/lib/checkout-machine";
import {
  ApiPaymentStatus,
  PaymentMethods,
  precisionByTransactionCurrency,
  SettlementCurrencies,
  SettlementCurrencyTransactionCurrencies,
  TransactionCurrencies,
} from "@/types/primitives";

import { minorToMajor, parseBackendAmount } from "./amount";

const methodPresentation: Record<
  string,
  { id: string; name: string; type: PaymentMethodType }
> = {
  [PaymentMethods.BANKTRANSFER]: {
    id: "bank_transfer",
    name: "Bank Transfer",
    type: PaymentMethods.BANKTRANSFER,
  },
  [PaymentMethods.LIGHTNING]: {
    id: "lightning_invoice",
    name: "Lightning Invoice",
    type: PaymentMethods.LIGHTNING,
  },
  [PaymentMethods.MOBILEMONEY]: {
    id: "mobile_money",
    name: "Mobile Money",
    type: PaymentMethods.MOBILEMONEY,
  },
};

export const listEnabledPaymentMethods = (
  methods: string[] | undefined,
): PaymentMethod[] => {
  if (!methods) {
    return [];
  }
  const enabled: PaymentMethod[] = [];
  methods.forEach((method) => {
    const presentation = methodPresentation[method];
    if (!presentation) {
      return;
    }
    enabled.push({
      id: presentation.id,
      name: presentation.name,
      type: presentation.type,
    });
  });
  return enabled;
};

const toDisplayTargetAmount = (
  rawTargetAmount: number,
  settlementCurrency: string,
) => {
  if (settlementCurrency === SettlementCurrencies.BTC) {
    return rawTargetAmount;
  }

  const transactionCurrency =
    SettlementCurrencyTransactionCurrencies[
      settlementCurrency as keyof typeof SettlementCurrencyTransactionCurrencies
    ];

  if (!transactionCurrency) {
    return rawTargetAmount;
  }

  return rawTargetAmount / precisionByTransactionCurrency[transactionCurrency];
};

const selectMethod = (
  availablePaymentMethods: PaymentMethod[],
  details: ApiPaymentLinkDetails,
  requestedPaymentMethod?: PaymentMethodType,
): PaymentMethod | undefined => {
  if (requestedPaymentMethod) {
    const requested = availablePaymentMethods.find(
      (method) => method.type === requestedPaymentMethod,
    );
    if (requested) {
      return requested;
    }
  }

  const lightningMethod = availablePaymentMethods.find(
    (method) => method.type === PaymentMethods.LIGHTNING,
  );
  const bankTransferMethod = availablePaymentMethods.find(
    (method) => method.type === PaymentMethods.BANKTRANSFER,
  );

  if (details.LIGHTNING && lightningMethod) {
    return lightningMethod;
  }
  if (details.BANKTRANSFER && bankTransferMethod) {
    return bankTransferMethod;
  }
  return availablePaymentMethods[0];
};

const mobileMoneyFromDetails = (
  details: ApiPaymentLinkDetails,
): MobileMoneyDetails | undefined => {
  if (!details.paymentMethods?.includes(PaymentMethods.MOBILEMONEY)) {
    return undefined;
  }
  if (!details.MOBILEMONEY && !details.paymentMethods.includes(PaymentMethods.MOBILEMONEY)) {
    return undefined;
  }

  const mobile = details.MOBILEMONEY;
  const paymentCurrency = details.paymentCurrency;
  const configuredAmount =
    paymentCurrency && details.amount !== undefined
      ? minorToMajor(details.amount, paymentCurrency) ?? undefined
      : undefined;

  if (!mobile && configuredAmount === undefined && !paymentCurrency) {
    return undefined;
  }

  return {
    requiresPaymentSource: mobile?.requiresPaymentSource ?? true,
    sourceCurrency: mobile?.sourceCurrency || paymentCurrency || "KES",
    configuredAmount,
    paymentCurrency,
    amount:
      mobile?.amount !== undefined
        ? minorToMajor(mobile.amount, mobile.sourceCurrency || "KES") ?? undefined
        : undefined,
    targetAmount:
      mobile?.targetAmount !== undefined
        ? minorToMajor(mobile.targetAmount, details.settlementCurrency) ?? undefined
        : undefined,
    expiresAt: mobile?.expiresAt,
    quoteExpiresAt: mobile?.quoteExpiresAt,
    requestId: mobile?.requestId,
    attemptId: mobile?.attemptId,
    quoteId: mobile?.quoteId,
    internalOrderId: mobile?.orderId,
    paymentStatus: mobile?.paymentStatus,
    promptStatus: mobile?.promptStatus,
    canRetry: mobile?.canRetry,
    retryAllowedAt: mobile?.retryAllowedAt,
    serverTime: mobile?.serverTime,
  };
};

export const transformPaymentLink = (
  apiData: ApiPaymentData,
  requestedPaymentMethod?: PaymentMethodType,
  merchantLogo?: string,
): PaymentData => {
  const details = apiData.paymentLinkDetails;
  const availablePaymentMethods = listEnabledPaymentMethods(details.paymentMethods);
  const selectedMethod = selectMethod(
    availablePaymentMethods,
    details,
    requestedPaymentMethod,
  );

  const bankTransferDetails: BankTransferDetails | undefined = details.BANKTRANSFER
    ? {
        bankName: details.BANKTRANSFER.ngnBankName,
        accountNumber: details.BANKTRANSFER.ngnBankAccountNumber,
        accountName: details.BANKTRANSFER.ngnAccountName,
        amount:
          (parseBackendAmount(details.BANKTRANSFER.amount) ?? 0) /
          precisionByTransactionCurrency[TransactionCurrencies.NGNKOBO],
        targetAmount: toDisplayTargetAmount(
          parseBackendAmount(details.BANKTRANSFER.targetAmount) ?? 0,
          details.settlementCurrency,
        ),
        currencySymbol: getCurrencySymbol(TransactionCurrencies.NGNKOBO),
        currency: TransactionCurrencies.NGNKOBO,
        expiresAt: details.BANKTRANSFER.expiresAt,
      }
    : undefined;

  const lightningMinor = details.LIGHTNING
    ? parseBackendAmount(details.LIGHTNING.amount) ?? 0
    : 0;
  const lightningInvoiceDetails: LightningInvoiceDetails | undefined =
    details.LIGHTNING
      ? {
          invoice: details.LIGHTNING.invoice,
          amount:
            lightningMinor /
            precisionByTransactionCurrency[TransactionCurrencies.BTCSAT],
          targetAmount: toDisplayTargetAmount(
            parseBackendAmount(details.LIGHTNING.targetAmount) ?? 0,
            details.settlementCurrency,
          ),
          currencySymbol: getCurrencySymbol(TransactionCurrencies.BTCSAT),
          currency: details.settlementCurrency,
          satsAmount: lightningMinor,
          expiresAt: details.LIGHTNING.expiresAt,
          qrCodeData: details.LIGHTNING.invoice,
        }
      : undefined;

  const mobileMoneyDetails = mobileMoneyFromDetails(details);
  const configuredAmount =
    details.paymentCurrency && details.amount !== undefined
      ? minorToMajor(details.amount, details.paymentCurrency) ?? undefined
      : undefined;

  const amount = (() => {
    if (selectedMethod?.type === PaymentMethods.MOBILEMONEY) {
      return mobileMoneyDetails?.amount ?? configuredAmount ?? 0;
    }
    if (selectedMethod?.type === PaymentMethods.LIGHTNING) {
      return lightningMinor;
    }
    return (
      (parseBackendAmount(details.BANKTRANSFER?.amount) ?? 0) /
      precisionByTransactionCurrency[TransactionCurrencies.NGNKOBO]
    );
  })();

  const expiresAt = (() => {
    if (selectedMethod?.type === PaymentMethods.MOBILEMONEY) {
      return mobileMoneyDetails?.expiresAt || mobileMoneyDetails?.quoteExpiresAt || "";
    }
    if (selectedMethod?.type === PaymentMethods.LIGHTNING) {
      return details.LIGHTNING?.expiresAt || "";
    }
    return details.BANKTRANSFER?.expiresAt || "";
  })();

  const orderId = details.paymentLinkOrderId || "";

  return {
    id: details.id,
    name: details.name,
    merchantName: details.account.name,
    merchantLogo: details.account.logo || merchantLogo || "",
    description: details.description,
    amount,
    configuredAmount,
    paymentCurrency: details.paymentCurrency,
    settlementCurrency: details.settlementCurrency,
    expiresAt,
    paymentMethods: availablePaymentMethods,
    selectedMethod,
    bankTransferDetails,
    lightningInvoiceDetails,
    mobileMoneyDetails,
    paymentLinkId: orderId,
    status: ApiPaymentStatus.PENDING,
    orderId,
    callbackUrl: details.callbackUrl,
  };
};

export const applyBankRefresh = (next: PaymentData): PaymentData => {
  return {
    ...next,
    bankTransferDetails: next.bankTransferDetails
      ? { ...next.bankTransferDetails }
      : undefined,
    orderId: next.orderId,
    paymentLinkId: next.paymentLinkId,
    expiresAt: next.expiresAt,
    amount: next.amount,
  };
};

export const mergeViewIntoPayment = (
  current: PaymentData,
  view: MobileMoneyView,
): PaymentData => {
  return {
    ...current,
    amount: view.payableMajor ?? current.amount,
    expiresAt: view.quoteExpiresAt || current.expiresAt,
    orderId: view.pollOrderId || current.orderId,
    paymentLinkId: view.pollOrderId || current.paymentLinkId,
    mobileMoneyDetails: {
      requiresPaymentSource: true,
      sourceCurrency:
        view.sourceCurrency || current.mobileMoneyDetails?.sourceCurrency || "KES",
      configuredAmount:
        current.mobileMoneyDetails?.configuredAmount ?? current.configuredAmount,
      paymentCurrency:
        current.mobileMoneyDetails?.paymentCurrency ?? current.paymentCurrency,
      amount: view.payableMajor ?? current.mobileMoneyDetails?.amount,
      targetAmount: view.targetMajor ?? current.mobileMoneyDetails?.targetAmount,
      expiresAt: view.quoteExpiresAt || current.mobileMoneyDetails?.expiresAt,
      quoteExpiresAt: view.quoteExpiresAt,
      requestId: view.submission?.requestId,
      attemptId: view.attemptId ?? current.mobileMoneyDetails?.attemptId,
      quoteId: view.quoteId ?? current.mobileMoneyDetails?.quoteId,
      internalOrderId:
        view.internalOrderId ?? current.mobileMoneyDetails?.internalOrderId,
      paymentStatus: view.paymentStatus,
      promptStatus: view.promptStatus,
      canRetry: view.canRetry,
      retryAllowedAt: view.retryAllowedAt,
      serverTime: view.serverTime,
      clockReceivedAt: view.clockReceivedAt,
    },
  };
};

export const mergeMobileMoneyCheckout = (
  current: PaymentData,
  checkout: NormalizedCheckoutDetails,
  receivedAt: number,
): PaymentData => {
  return {
    ...current,
    amount: checkout.payableMajor,
    expiresAt: checkout.quoteExpiresAt || checkout.expiresAt || current.expiresAt,
    orderId: checkout.paymentLinkOrderId,
    paymentLinkId: checkout.paymentLinkOrderId,
    status: ApiPaymentStatus.PENDING,
    mobileMoneyDetails: {
      requiresPaymentSource: true,
      sourceCurrency: checkout.sourceCurrency,
      configuredAmount: current.mobileMoneyDetails?.configuredAmount ?? current.configuredAmount,
      paymentCurrency: current.mobileMoneyDetails?.paymentCurrency ?? current.paymentCurrency,
      amount: checkout.payableMajor,
      targetAmount: checkout.targetMajor,
      expiresAt: checkout.expiresAt,
      quoteExpiresAt: checkout.quoteExpiresAt,
      requestId: checkout.requestId,
      attemptId: checkout.attemptId,
      quoteId: checkout.quoteId,
      internalOrderId: checkout.internalOrderId,
      paymentStatus: checkout.paymentStatus,
      promptStatus: checkout.promptStatus,
      canRetry: checkout.canRetry,
      retryAllowedAt: checkout.retryAllowedAt,
      serverTime: checkout.serverTime,
      clockReceivedAt: receivedAt,
    },
  };
};
