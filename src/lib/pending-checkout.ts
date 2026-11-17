import { MobileMoneyView } from "@/lib/checkout-machine";
import { storage } from "@/lib/storage";
import { PayerPayload } from "@/types/payment";
import { CheckoutPhases, storageKeys } from "@/types/primitives";

export interface PendingCheckoutRecord {
  paymentLinkId: string;
  requestId: string;
  paymentSource: PayerPayload;
  paymentLinkOrderId?: string;
  quoteId?: string;
  attemptId?: string;
  internalOrderId?: string;
  canRetry?: boolean;
  retryAllowedAt?: string;
  quoteExpiresAt?: string;
  serverTime?: string;
  clockReceivedAt?: number;
  promptStatus?: string;
  paymentStatus?: string;
  payableMajor?: number;
  targetMajor?: number;
  sourceCurrency?: string;
  phase: string;
}

type PendingStore = Record<string, PendingCheckoutRecord>;

const readStore = async (): Promise<PendingStore> => {
  const stored = await storage.getItem<PendingStore>(storageKeys.pendingCheckout);
  return stored || {};
};

export const readPendingCheckout = async (
  paymentLinkId: string,
): Promise<PendingCheckoutRecord | null> => {
  const stored = await readStore();
  return stored[paymentLinkId] || null;
};

export const writePendingCheckout = async (
  record: PendingCheckoutRecord,
): Promise<void> => {
  const stored = await readStore();
  stored[record.paymentLinkId] = record;
  await storage.setItem(storageKeys.pendingCheckout, stored);
};

export const clearPendingCheckout = async (paymentLinkId: string): Promise<void> => {
  const stored = await readStore();
  delete stored[paymentLinkId];
  await storage.setItem(storageKeys.pendingCheckout, stored);
};

export const pendingFromView = (
  paymentLinkId: string,
  view: MobileMoneyView,
): PendingCheckoutRecord | null => {
  if (!view.submission?.requestId || !view.submission.paymentSource.phoneNumber) {
    return null;
  }
  return {
    paymentLinkId,
    requestId: view.submission.requestId,
    paymentSource: {
      phoneNumber: view.submission.paymentSource.phoneNumber,
      firstName: view.submission.paymentSource.firstName,
      lastName: view.submission.paymentSource.lastName,
    },
    paymentLinkOrderId: view.pollOrderId || undefined,
    quoteId: view.quoteId,
    attemptId: view.attemptId,
    internalOrderId: view.internalOrderId,
    canRetry: view.canRetry,
    retryAllowedAt: view.retryAllowedAt,
    quoteExpiresAt: view.quoteExpiresAt,
    serverTime: view.serverTime,
    clockReceivedAt: view.clockReceivedAt,
    promptStatus: view.promptStatus,
    paymentStatus: view.paymentStatus,
    payableMajor: view.payableMajor,
    targetMajor: view.targetMajor,
    sourceCurrency: view.sourceCurrency,
    phase: view.phase,
  };
};

export const viewPhaseFromPending = (
  record: PendingCheckoutRecord,
): MobileMoneyView["phase"] => {
  if (
    record.promptStatus === "SUCCEEDED" ||
    record.paymentStatus === "SUCCEEDED" ||
    record.phase === CheckoutPhases.RECEIVED
  ) {
    return CheckoutPhases.RECEIVED;
  }
  if (record.phase === CheckoutPhases.FAILED) {
    return CheckoutPhases.FAILED;
  }
  if (record.phase === CheckoutPhases.QUOTE_EXPIRED) {
    return CheckoutPhases.QUOTE_EXPIRED;
  }
  if (record.paymentLinkOrderId) {
    return CheckoutPhases.PENDING;
  }
  return CheckoutPhases.NEEDS_RETRY;
};
