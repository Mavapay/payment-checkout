import {
  ApiPaymentStatusType,
  CollectionMetadata,
  NormalizedCheckoutDetails,
  NormalizedCheckoutError,
  PaymentStatusData,
} from "@/types/payment";
import {
  ApiPaymentStatus,
  BLOCKING_PROMPT_STATUSES,
  CheckoutErrorCodes,
  PromptStatuses,
} from "@/types/primitives";

import { minorToMajor, parseBackendAmount } from "./amount";
import {
  lockContentionMessage,
  networkFailureMessage,
  rateLimitMessage,
  temporaryFailureMessage,
  userMessageForCheckoutError,
} from "./payment-errors";

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return undefined;
};

const asBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
};

export const normalizeCollection = (
  value: unknown,
): CollectionMetadata | undefined => {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const nested = asRecord(record.collection);
  const source = nested ?? record;
  const hasCollectionFields =
    source.requestId !== undefined ||
    source.attemptId !== undefined ||
    source.promptStatus !== undefined ||
    source.canRetry !== undefined ||
    source.retryAllowedAt !== undefined ||
    source.quoteId !== undefined ||
    source.paymentStatus !== undefined ||
    source.quoteExpiresAt !== undefined ||
    source.serverTime !== undefined;

  if (!hasCollectionFields) {
    return undefined;
  }

  return {
    requestId: asString(source.requestId),
    attemptId: asString(source.attemptId),
    quoteId: asString(source.quoteId),
    internalOrderId: asString(source.orderId),
    paymentStatus: asString(source.paymentStatus),
    promptStatus: asString(source.promptStatus),
    canRetry: asBoolean(source.canRetry),
    retryAllowedAt: asString(source.retryAllowedAt),
    quoteExpiresAt: asString(source.quoteExpiresAt),
    serverTime: asString(source.serverTime),
    paymentLinkOrderId: asString(source.paymentLinkOrderId),
  };
};

export const extractPaymentLinkOrderId = (value: unknown): string | undefined => {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const direct = asString(record.paymentLinkOrderId);
  if (direct) {
    return direct;
  }

  const details = asRecord(record.paymentLinkDetails);
  const fromDetails = details ? asString(details.paymentLinkOrderId) : undefined;
  if (fromDetails) {
    return fromDetails;
  }

  const collection = normalizeCollection(record);
  return collection?.paymentLinkOrderId;
};

const readCode = (record: Record<string, unknown> | null): string | undefined => {
  if (!record) {
    return undefined;
  }
  return (
    asString(record.code) ||
    asString(record.error) ||
    asString(record.errorCode) ||
    asString(asRecord(record.data)?.code)
  );
};

export const parseRetryAfterSeconds = (header: unknown): number | undefined => {
  if (typeof header === "number" && Number.isFinite(header) && header >= 0) {
    return header;
  }
  if (typeof header !== "string" || !header.trim()) {
    return undefined;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }
  const date = Date.parse(header);
  if (Number.isNaN(date)) {
    return undefined;
  }
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
};

const keepsOriginalRequest = (
  code: string | undefined,
  httpStatus: number | undefined,
  network: boolean,
): boolean => {
  if (
    code === CheckoutErrorCodes.REQUEST_ID_REUSED ||
    code === CheckoutErrorCodes.ORDER_FAILED ||
    code === CheckoutErrorCodes.PAYMENT_ALREADY_RECEIVED ||
    code === CheckoutErrorCodes.PROMPT_RETRY_TOO_EARLY ||
    code === CheckoutErrorCodes.COLLECTION_NOT_SUBMITTED ||
    code === CheckoutErrorCodes.COLLECTION_UNCONFIRMED ||
    code === CheckoutErrorCodes.LEGACY_COLLECTION_ADOPTED
  ) {
    return false;
  }
  if (httpStatus === 429) {
    return false;
  }
  if (network || httpStatus === 408 || httpStatus === 409) {
    return true;
  }
  return httpStatus !== undefined && httpStatus >= 500;
};

export const shouldReuseRequest = (
  code: string | undefined,
  httpStatus: number | undefined,
  network: boolean,
): boolean => keepsOriginalRequest(code, httpStatus, network);

export const shouldAutoRetry = (
  code: string | undefined,
  httpStatus: number | undefined,
  network: boolean,
): boolean => {
  if (!keepsOriginalRequest(code, httpStatus, network)) {
    return false;
  }
  return network || httpStatus === 408;
};

export const shouldResumePolling = (
  code: string | undefined,
  paymentLinkOrderId: string | undefined,
): boolean => {
  if (!paymentLinkOrderId) {
    return false;
  }
  return (
    code === CheckoutErrorCodes.COLLECTION_UNCONFIRMED ||
    code === CheckoutErrorCodes.PAYMENT_ALREADY_RECEIVED ||
    code === CheckoutErrorCodes.LEGACY_COLLECTION_ADOPTED ||
    code === CheckoutErrorCodes.PROMPT_RETRY_TOO_EARLY
  );
};

export const normalizeCheckoutError = (
  body: unknown,
  httpStatus?: number,
  retryAfterHeader?: unknown,
  network = false,
): NormalizedCheckoutError => {
  const record = asRecord(body);
  const data = record ? record.data ?? record : undefined;
  const code = readCode(record);
  const message = asString(record?.message) || asString(record?.error);
  const collection = normalizeCollection(data) || normalizeCollection(record);
  const paymentLinkOrderId =
    extractPaymentLinkOrderId(data) || extractPaymentLinkOrderId(record);
  const retryAfterSeconds = parseRetryAfterSeconds(
    record?.retryAfterSeconds ?? retryAfterHeader,
  );
  const codedMessage = userMessageForCheckoutError(code, message);
  let userMessage = network ? networkFailureMessage() : codedMessage;
  if (!network && !code && httpStatus === 409) {
    userMessage = lockContentionMessage();
  } else if (!network && !code && httpStatus === 429) {
    userMessage = rateLimitMessage();
  } else if (!network && !code && httpStatus !== undefined && httpStatus >= 500) {
    userMessage = temporaryFailureMessage();
  }

  return {
    httpStatus,
    code,
    message: message || "",
    userMessage,
    retryAfterSeconds,
    paymentLinkOrderId,
    collection,
    network,
    reuseRequest: shouldReuseRequest(code, httpStatus, network),
    autoRetry: shouldAutoRetry(code, httpStatus, network),
    resumePolling: shouldResumePolling(code, paymentLinkOrderId),
  };
};

export const laterRetryAllowedAt = (
  current: string | undefined,
  retryAfterSeconds: number | undefined,
  clientNow: number,
): string | undefined => {
  const headerDeadline =
    retryAfterSeconds !== undefined
      ? clientNow + retryAfterSeconds * 1000
      : undefined;
  const currentDeadline = current ? Date.parse(current) : Number.NaN;
  if (headerDeadline === undefined) {
    return current;
  }
  if (Number.isNaN(currentDeadline)) {
    return new Date(headerDeadline).toISOString();
  }
  return new Date(Math.max(currentDeadline, headerDeadline)).toISOString();
};

export const normalizeCheckoutSuccess = (
  body: unknown,
  settlementCurrency: string,
): NormalizedCheckoutDetails | null => {
  const root = asRecord(body);
  if (!root) {
    return null;
  }
  const data = asRecord(root.paymentLinkDetails) ?? asRecord(root.data) ?? root;
  const details = asRecord(data.paymentLinkDetails) ?? data;
  const mobile = asRecord(details.MOBILEMONEY) ?? asRecord(details.mobileMoney);
  if (!mobile) {
    return null;
  }

  const paymentLinkOrderId = asString(details.paymentLinkOrderId);
  if (!paymentLinkOrderId) {
    return null;
  }

  const sourceCurrency = asString(mobile.sourceCurrency) || "KES";
  const payableMinor = parseBackendAmount(mobile.amount) ?? 0;
  const targetMinor = parseBackendAmount(mobile.targetAmount) ?? 0;
  const payableMajor = minorToMajor(payableMinor, sourceCurrency) ?? 0;
  const targetMajor = minorToMajor(targetMinor, settlementCurrency) ?? 0;

  return {
    paymentLinkOrderId,
    sourceCurrency,
    payableMinor,
    payableMajor,
    targetMinor,
    targetMajor,
    expiresAt: asString(mobile.expiresAt),
    requestId: asString(mobile.requestId),
    attemptId: asString(mobile.attemptId),
    quoteId: asString(mobile.quoteId),
    internalOrderId: asString(mobile.orderId),
    paymentStatus: asString(mobile.paymentStatus),
    promptStatus: asString(mobile.promptStatus),
    canRetry: asBoolean(mobile.canRetry),
    retryAllowedAt: asString(mobile.retryAllowedAt),
    quoteExpiresAt: asString(mobile.quoteExpiresAt),
    serverTime: asString(mobile.serverTime),
  };
};

export const normalizeStatusPayload = (body: unknown): PaymentStatusData | null => {
  const root = asRecord(body);
  if (!root) {
    return null;
  }
  const data = asRecord(root.data) ?? root;
  const status = asString(data.status);
  if (
    status !== ApiPaymentStatus.PENDING &&
    status !== ApiPaymentStatus.SETTLED &&
    status !== ApiPaymentStatus.EXPIRED &&
    status !== ApiPaymentStatus.FAILED &&
    status !== ApiPaymentStatus.CANCELLED
  ) {
    return null;
  }

  return {
    status: status as ApiPaymentStatusType,
    collection: normalizeCollection(data.collection) || normalizeCollection(data),
  };
};

export const isBlockingPromptStatus = (promptStatus?: string): boolean => {
  if (!promptStatus) {
    return false;
  }
  return (BLOCKING_PROMPT_STATUSES as readonly string[]).includes(promptStatus);
};

export const promptStatusMessage = (promptStatus?: string): string => {
  switch (promptStatus) {
    case PromptStatuses.INITIATING:
      return "Submitting the payment request.";
    case PromptStatuses.SENT:
      return "A payment prompt was requested. Check your phone and approve it if it appears. This does not mean the payment has completed.";
    case PromptStatuses.TIMED_OUT:
      return "The prompt window elapsed. You can request another prompt when it is available. The purchase quote may still be active.";
    case PromptStatuses.FAILED:
      return "The payment prompt failed. You can request another prompt if it is available.";
    case PromptStatuses.UNKNOWN:
      return "We are checking the prompt status. Please wait.";
    case PromptStatuses.PROCESSING:
      return "Your payment is processing. Please wait.";
    case PromptStatuses.SUCCEEDED:
      return "We have received your payment and are confirming it.";
    default:
      return "Check your phone and approve the payment prompt if it appears.";
  }
};

export const isPromptTimedOut = (promptStatus?: string): boolean => {
  return promptStatus === PromptStatuses.TIMED_OUT;
};

export interface AttemptSnapshot {
  settled: boolean;
  generation: number;
  orderId: string;
  appliedSeq: number;
}

export interface StatusEvent {
  generation: number;
  orderId: string;
  seq: number;
  status: ApiPaymentStatusType;
}

export const isCurrentAttempt = (
  snapshot: AttemptSnapshot,
  event: Pick<StatusEvent, "generation" | "orderId" | "seq">,
): boolean => {
  if (snapshot.settled) {
    return false;
  }
  if (event.generation !== snapshot.generation) {
    return false;
  }
  if (!snapshot.orderId || event.orderId !== snapshot.orderId) {
    return false;
  }
  if (event.seq <= snapshot.appliedSeq) {
    return false;
  }
  return true;
};
