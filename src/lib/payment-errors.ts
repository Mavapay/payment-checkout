import { CheckoutErrorCodes } from "@/types/primitives";

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const INTERNAL_DETAIL_PATTERN =
  /fingerprint|reconcil|settlement marker|internal order|quote id|attempt id/i;

export const userMessageForCheckoutError = (
  code: string | undefined,
  message: string | undefined,
): string => {
  switch (code) {
    case CheckoutErrorCodes.PROMPT_RETRY_TOO_EARLY:
      return "Please wait before requesting another prompt.";
    case CheckoutErrorCodes.REQUEST_ID_REUSED:
      return "Those payer details do not match the original attempt. Request another prompt only after it is allowed. A new prompt was not sent.";
    case CheckoutErrorCodes.COLLECTION_NOT_SUBMITTED:
      return "The payment prompt was not sent. You can try again when a new attempt is allowed.";
    case CheckoutErrorCodes.COLLECTION_UNCONFIRMED:
      return "We could not confirm the prompt yet. This page will keep checking the payment.";
    case CheckoutErrorCodes.PAYMENT_ALREADY_RECEIVED:
      return "A payment has already been received. We are confirming it.";
    case CheckoutErrorCodes.ORDER_FAILED:
      return "This payment could not be completed. Close checkout and review it with the merchant.";
    case CheckoutErrorCodes.LEGACY_COLLECTION_ADOPTED:
      return "We found an existing payment attempt and are checking it.";
    default:
      break;
  }

  if (!message) {
    return "Something went wrong. Please try again.";
  }

  const sanitized = message.replace(UUID_PATTERN, "").replace(/\s+/g, " ").trim();
  if (!sanitized || INTERNAL_DETAIL_PATTERN.test(sanitized)) {
    return "Something went wrong. Please try again.";
  }
  return sanitized;
};

export const networkFailureMessage = (): string => {
  return "The connection was interrupted. The original attempt was kept so a duplicate prompt is not sent. Retry the submission.";
};

export const temporaryFailureMessage = (): string => {
  return "Something went wrong for a moment. Your attempt was kept. Retry the submission.";
};

export const lockContentionMessage = (): string => {
  return "The payment service is busy. This attempt was kept. Retry the same submission when it is allowed.";
};

export const rateLimitMessage = (): string => {
  return "Please wait before requesting another prompt.";
};
