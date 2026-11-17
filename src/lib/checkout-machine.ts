import {
  CheckoutPhase,
  CheckoutSubmission,
  CollectionMetadata,
  NormalizedCheckoutDetails,
  NormalizedCheckoutError,
  PayerPayload,
} from "@/types/payment";
import {
  ApiPaymentStatus,
  CheckoutPhases,
  PromptStatuses,
} from "@/types/primitives";

import { remainingMs, serverClockOffsetMs } from "./clock";
import {
  isBlockingPromptStatus,
  isCurrentAttempt,
  laterRetryAllowedAt,
  StatusEvent,
} from "./collection";

export interface MobileMoneyView {
  phase: CheckoutPhase;
  submission: CheckoutSubmission | null;
  pollGeneration: number;
  pollOrderId: string;
  appliedSeq: number;
  settled: boolean;
  quoteExpired: boolean;
  paymentAlreadyReceived: boolean;
  orderFailed: boolean;
  canRetry: boolean;
  retryAllowedAt?: string;
  quoteExpiresAt?: string;
  serverTime?: string;
  clockReceivedAt?: number;
  promptStatus?: string;
  paymentStatus?: string;
  userMessage: string | null;
  payableMajor?: number;
  targetMajor?: number;
  sourceCurrency?: string;
  quoteId?: string;
  attemptId?: string;
  internalOrderId?: string;
}

export const createMobileMoneyView = (): MobileMoneyView => ({
  phase: CheckoutPhases.COLLECTING,
  submission: null,
  pollGeneration: 0,
  pollOrderId: "",
  appliedSeq: 0,
  settled: false,
  quoteExpired: false,
  paymentAlreadyReceived: false,
  orderFailed: false,
  canRetry: false,
  userMessage: null,
});

export const clonePayer = (payer: PayerPayload): PayerPayload => ({
  phoneNumber: payer.phoneNumber,
  firstName: payer.firstName,
  lastName: payer.lastName,
});

export const retrySubmission = (
  submission: CheckoutSubmission,
): CheckoutSubmission => ({
  requestId: submission.requestId,
  paymentSource: clonePayer(submission.paymentSource),
});

const sameInstant = (view: MobileMoneyView, clientNow: number) => {
  const offset = serverClockOffsetMs(view.serverTime, view.clockReceivedAt ?? clientNow);
  return {
    offset,
    retryRemaining: remainingMs(view.retryAllowedAt, offset, clientNow),
    quoteRemaining: view.quoteExpiresAt
      ? remainingMs(view.quoteExpiresAt, offset, clientNow)
      : Number.POSITIVE_INFINITY,
  };
};

export const quoteIsExpired = (view: MobileMoneyView, clientNow: number): boolean => {
  if (view.quoteExpired) {
    return true;
  }
  if (!view.quoteExpiresAt) {
    return false;
  }
  return sameInstant(view, clientNow).quoteRemaining <= 0;
};

export const canRequestAnotherPrompt = (
  view: MobileMoneyView,
  clientNow: number,
): boolean => {
  if (
    view.settled ||
    view.phase === CheckoutPhases.SUBMITTING ||
    view.paymentAlreadyReceived ||
    view.orderFailed ||
    view.phase === CheckoutPhases.FAILED ||
    view.phase === CheckoutPhases.RECEIVED
  ) {
    return false;
  }
  if (quoteIsExpired(view, clientNow)) {
    return false;
  }
  if (view.paymentStatus === PromptStatuses.SUCCEEDED) {
    return false;
  }
  if (isBlockingPromptStatus(view.promptStatus)) {
    return false;
  }
  if (!view.canRetry) {
    return false;
  }
  if (sameInstant(view, clientNow).retryRemaining > 0) {
    return false;
  }
  return Boolean(view.submission);
};

export const canContinueAfterExpiry = (
  view: MobileMoneyView,
  clientNow: number,
): boolean => {
  if (!quoteIsExpired(view, clientNow)) {
    return false;
  }
  if (
    view.settled ||
    view.phase === CheckoutPhases.SUBMITTING ||
    view.paymentAlreadyReceived ||
    view.orderFailed ||
    view.phase === CheckoutPhases.FAILED ||
    view.phase === CheckoutPhases.RECEIVED
  ) {
    return false;
  }
  if (view.paymentStatus === PromptStatuses.SUCCEEDED) {
    return false;
  }
  if (isBlockingPromptStatus(view.promptStatus)) {
    return false;
  }
  return Boolean(view.submission);
};

export const canRetryInterruptedSubmission = (view: MobileMoneyView): boolean => {
  return (
    view.phase === CheckoutPhases.NEEDS_RETRY &&
    Boolean(view.submission) &&
    !view.settled &&
    !view.orderFailed
  );
};

const applyCollection = (
  view: MobileMoneyView,
  collection: CollectionMetadata | undefined,
  receivedAt: number,
): MobileMoneyView => {
  if (!collection) {
    return view;
  }
  return {
    ...view,
    canRetry: collection.canRetry ?? view.canRetry,
    retryAllowedAt: collection.retryAllowedAt ?? view.retryAllowedAt,
    quoteExpiresAt: collection.quoteExpiresAt ?? view.quoteExpiresAt,
    serverTime: collection.serverTime ?? view.serverTime,
    clockReceivedAt: collection.serverTime ? receivedAt : view.clockReceivedAt,
    promptStatus: collection.promptStatus ?? view.promptStatus,
    paymentStatus: collection.paymentStatus ?? view.paymentStatus,
    quoteId: collection.quoteId ?? view.quoteId,
    attemptId: collection.attemptId ?? view.attemptId,
    internalOrderId: collection.internalOrderId ?? view.internalOrderId,
    submission: view.submission
      ? {
          requestId: collection.requestId || view.submission.requestId,
          paymentSource: view.submission.paymentSource,
        }
      : view.submission,
  };
};

export const beginSubmission = (
  view: MobileMoneyView,
  submission: CheckoutSubmission,
): MobileMoneyView => ({
  ...view,
  phase: CheckoutPhases.SUBMITTING,
  submission,
  userMessage: null,
});

export const applyCheckoutSuccess = (
  view: MobileMoneyView,
  details: NormalizedCheckoutDetails,
  receivedAt: number,
): MobileMoneyView => {
  const nextGeneration = view.pollGeneration + 1;
  const paymentReceived =
    details.promptStatus === PromptStatuses.SUCCEEDED ||
    details.paymentStatus === PromptStatuses.SUCCEEDED;
  return {
    ...view,
    phase: paymentReceived ? CheckoutPhases.RECEIVED : CheckoutPhases.PENDING,
    pollGeneration: nextGeneration,
    pollOrderId: details.paymentLinkOrderId,
    appliedSeq: 0,
    settled: false,
    quoteExpired: false,
    paymentAlreadyReceived: paymentReceived,
    orderFailed: false,
    canRetry: details.canRetry ?? false,
    retryAllowedAt: details.retryAllowedAt,
    quoteExpiresAt: details.quoteExpiresAt || details.expiresAt,
    serverTime: details.serverTime,
    clockReceivedAt: receivedAt,
    promptStatus: details.promptStatus,
    paymentStatus: details.paymentStatus,
    userMessage: null,
    payableMajor: details.payableMajor,
    targetMajor: details.targetMajor,
    sourceCurrency: details.sourceCurrency,
    quoteId: details.quoteId,
    attemptId: details.attemptId,
    internalOrderId: details.internalOrderId,
    submission: {
      requestId: details.requestId || view.submission?.requestId || "",
      paymentSource: view.submission
        ? clonePayer(view.submission.paymentSource)
        : { phoneNumber: "", firstName: "", lastName: "" },
    },
  };
};

export const applyCheckoutFailure = (
  view: MobileMoneyView,
  error: NormalizedCheckoutError,
  receivedAt: number,
): MobileMoneyView => {
  const withCollection = applyCollection(view, error.collection, receivedAt);
  const retryAllowedAt = laterRetryAllowedAt(
    withCollection.retryAllowedAt,
    error.retryAfterSeconds,
    receivedAt,
  );
  const orderId = error.paymentLinkOrderId || withCollection.pollOrderId;
  const generation =
    error.paymentLinkOrderId && error.paymentLinkOrderId !== view.pollOrderId
      ? view.pollGeneration + 1
      : withCollection.pollGeneration;

  if (error.code === "PAYMENT_ALREADY_RECEIVED") {
    return {
      ...withCollection,
      phase: CheckoutPhases.RECEIVED,
      paymentAlreadyReceived: true,
      pollOrderId: orderId,
      pollGeneration: generation,
      retryAllowedAt,
      userMessage: error.userMessage,
      canRetry: false,
    };
  }

  if (error.code === "ORDER_FAILED") {
    return {
      ...withCollection,
      phase: CheckoutPhases.FAILED,
      orderFailed: true,
      pollOrderId: orderId,
      pollGeneration: generation,
      userMessage: error.userMessage,
      canRetry: false,
    };
  }

  if (error.code === "REQUEST_ID_REUSED") {
    return {
      ...withCollection,
      phase: CheckoutPhases.REQUEST_ID_REUSED,
      pollOrderId: orderId,
      pollGeneration: generation,
      retryAllowedAt,
      userMessage: error.userMessage,
    };
  }

  if (error.code === "PROMPT_RETRY_TOO_EARLY") {
    return {
      ...withCollection,
      phase: CheckoutPhases.PENDING,
      pollOrderId: orderId,
      pollGeneration: generation,
      retryAllowedAt,
      canRetry: false,
      userMessage: error.userMessage,
    };
  }

  if (
    error.code === "COLLECTION_UNCONFIRMED" ||
    error.code === "LEGACY_COLLECTION_ADOPTED"
  ) {
    return {
      ...withCollection,
      phase: CheckoutPhases.PENDING,
      pollOrderId: orderId,
      pollGeneration: generation,
      retryAllowedAt,
      userMessage: error.userMessage,
    };
  }

  if (error.reuseRequest) {
    return {
      ...withCollection,
      phase: CheckoutPhases.NEEDS_RETRY,
      pollOrderId: orderId,
      retryAllowedAt,
      userMessage: error.userMessage,
    };
  }

  return {
    ...withCollection,
    phase: withCollection.pollOrderId ? CheckoutPhases.PENDING : CheckoutPhases.COLLECTING,
    pollOrderId: orderId,
    pollGeneration: generation,
    retryAllowedAt,
    userMessage: error.userMessage,
  };
};

export const applyStatusUpdate = (
  view: MobileMoneyView,
  event: StatusEvent & { collection?: CollectionMetadata },
  receivedAt: number,
): MobileMoneyView => {
  if (
    !isCurrentAttempt(
      {
        settled: view.settled,
        generation: view.pollGeneration,
        orderId: view.pollOrderId,
        appliedSeq: view.appliedSeq,
      },
      event,
    )
  ) {
    return view;
  }

  const withCollection = applyCollection(view, event.collection, receivedAt);
  const base: MobileMoneyView = {
    ...withCollection,
    appliedSeq: event.seq,
    pollOrderId: view.pollOrderId,
  };

  if (event.status === ApiPaymentStatus.SETTLED) {
    return {
      ...base,
      settled: true,
      phase: CheckoutPhases.SETTLED,
      quoteExpired: false,
      canRetry: false,
      userMessage: null,
    };
  }

  if (event.status === ApiPaymentStatus.EXPIRED) {
    return {
      ...base,
      quoteExpired: true,
      phase: CheckoutPhases.QUOTE_EXPIRED,
      userMessage: "This quote is no longer active. Continue payment to request a new one.",
    };
  }

  if (event.status === ApiPaymentStatus.FAILED) {
    return {
      ...base,
      orderFailed: true,
      phase: CheckoutPhases.FAILED,
      canRetry: false,
      userMessage:
        "This payment could not be completed. Close checkout and review it with the merchant.",
    };
  }

  const paymentReceived =
    base.promptStatus === PromptStatuses.SUCCEEDED ||
    base.paymentStatus === PromptStatuses.SUCCEEDED;
  const evaluated = { ...base, quoteExpired: false };
  const expired = quoteIsExpired(evaluated, receivedAt);

  return {
    ...base,
    paymentAlreadyReceived: paymentReceived || base.paymentAlreadyReceived,
    quoteExpired: expired,
    phase: paymentReceived
      ? CheckoutPhases.RECEIVED
      : expired
        ? CheckoutPhases.QUOTE_EXPIRED
        : CheckoutPhases.PENDING,
    userMessage: expired
      ? "This quote is no longer active. Continue payment to request a new one."
      : base.userMessage,
  };
};

export const markQuoteExpired = (
  view: MobileMoneyView,
  clientNow: number,
): MobileMoneyView => {
  if (
    view.settled ||
    view.quoteExpired ||
    view.orderFailed ||
    view.phase === CheckoutPhases.RECEIVED ||
    view.phase === CheckoutPhases.FAILED ||
    view.phase === CheckoutPhases.SETTLED
  ) {
    return view;
  }
  if (!view.quoteExpiresAt) {
    return view;
  }
  const offset = serverClockOffsetMs(
    view.serverTime,
    view.clockReceivedAt ?? clientNow,
  );
  if (remainingMs(view.quoteExpiresAt, offset, clientNow) > 0) {
    return view;
  }
  return {
    ...view,
    quoteExpired: true,
    phase: CheckoutPhases.QUOTE_EXPIRED,
    userMessage: "This quote is no longer active. Continue payment to request a new one.",
  };
};

export const bankInstructionsFrom = (payment: {
  orderId: string;
  bankTransferDetails?: {
    bankName: string;
    accountNumber: string;
    accountName?: string;
    amount: number;
    targetAmount: number;
    expiresAt: string;
  };
}) => ({
  orderId: payment.orderId,
  bankName: payment.bankTransferDetails?.bankName,
  accountNumber: payment.bankTransferDetails?.accountNumber,
  accountName: payment.bankTransferDetails?.accountName,
  amount: payment.bankTransferDetails?.amount,
  targetAmount: payment.bankTransferDetails?.targetAmount,
  expiresAt: payment.bankTransferDetails?.expiresAt,
});
