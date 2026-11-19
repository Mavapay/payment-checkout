import { describe, expect, it } from "vitest";

import { serverClockOffsetMs, remainingMs } from "@/lib/clock";
import {
  laterRetryAllowedAt,
  normalizeCheckoutError,
  normalizeCheckoutSuccess,
  normalizeStatusPayload,
} from "@/lib/collection";
import {
  applyCheckoutFailure,
  applyCheckoutSuccess,
  applyStatusUpdate,
  bankInstructionsFrom,
  beginSubmission,
  canRequestAnotherPrompt,
  canRetryInterruptedSubmission,
  createMobileMoneyView,
  markQuoteExpired,
} from "@/lib/checkout-machine";
import { formatMajorAmount, minorToMajor } from "@/lib/amount";
import { validatePayer } from "@/lib/payer";
import { normalizeKenyanPhone } from "@/lib/phone";
import { applyBankRefresh, transformPaymentLink } from "@/lib/payment-link";
import { createSubmitGate } from "@/lib/submit-gate";
import { getPaymentEndpoints } from "@/config/endpoints";
import { API_BASE_URL } from "@/config/process";
import {
  ApiPaymentStatus,
  CheckoutPhases,
  PaymentMethods,
  PromptStatuses,
} from "@/types/primitives";
import { NormalizedCheckoutDetails } from "@/types/payment";

const payer = {
  phoneNumber: "+254712345678",
  firstName: "Jane",
  lastName: "Doe",
};

const checkoutDetails = (
  overrides: Partial<NormalizedCheckoutDetails> = {},
): NormalizedCheckoutDetails => ({
  paymentLinkOrderId: "plo-1",
  sourceCurrency: "KES",
  payableMinor: 100000,
  payableMajor: 1000,
  targetMinor: 7000,
  targetMajor: 70,
  requestId: "req-1",
  attemptId: "attempt-1",
  quoteId: "quote-1",
  internalOrderId: "internal-1",
  promptStatus: PromptStatuses.SENT,
  paymentStatus: "PENDING",
  canRetry: false,
  retryAllowedAt: "2026-01-01T00:00:20.000Z",
  quoteExpiresAt: "2026-01-01T01:00:00.000Z",
  serverTime: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-01-01T01:00:00.000Z",
  ...overrides,
});

const submittedView = (details = checkoutDetails()) => {
  const started = beginSubmission(createMobileMoneyView(), {
    requestId: details.requestId || "req-1",
    paymentSource: payer,
  });
  return applyCheckoutSuccess(started, details, Date.parse("2026-01-01T00:00:00.000Z"));
};

describe("amounts and payer validation", () => {
  it("converts backend minor units, including numeric strings", () => {
    expect(minorToMajor("10000000", "NGN")).toBe(100000);
    expect(minorToMajor("100000", "KES")).toBe(1000);
    expect(minorToMajor("7000", "USDT")).toBe(70);
    expect(minorToMajor(7000, "BTC")).toBe(0.00007);
    expect(formatMajorAmount(70, "USDT")).toBe("USDT 70.00");
    expect(formatMajorAmount(1000, "KES")).toBe("KSh 1,000.00");
  });

  it("normalizes Kenyan numbers and requires both names", () => {
    expect(normalizeKenyanPhone("0712345678")).toBe("+254712345678");
    expect(normalizeKenyanPhone("712345678")).toBe("+254712345678");
    expect(normalizeKenyanPhone("+254112345678")).toBe("+254112345678");
    expect(normalizeKenyanPhone("0812345678")).toBeNull();

    const missing = validatePayer({
      phoneNumber: "0712345678",
      firstName: " ",
      lastName: "",
    });
    expect(missing.ok).toBe(false);

    const valid = validatePayer({
      phoneNumber: "0712 345 678",
      firstName: " Jane ",
      lastName: " Doe ",
    });
    expect(valid).toEqual({
      ok: true,
      value: payer,
    });
  });
});

describe("payment link details", () => {
  const account = { name: "Extheo Agric", logo: "" };

  it("keeps BTC bank transfer amounts and does not add mobile money", () => {
    const payment = transformPaymentLink({
      paymentLinkDetails: {
        id: "btc-link",
        name: "BTC",
        description: "BTC NGN",
        callbackUrl: "https://merchant.example/return",
        settlementCurrency: "BTC",
        paymentCurrency: "BTC",
        paymentLinkOrderId: "btc-order",
        paymentMethods: [PaymentMethods.BANKTRANSFER, PaymentMethods.LIGHTNING],
        account,
        BANKTRANSFER: {
          ngnAccountName: "Mava Digital Solutions Limited",
          ngnBankName: "GLOBUS BANK",
          ngnBankAccountNumber: "1111111111",
          amount: "10000000",
          targetAmount: 7000,
          expiresAt: "2026-12-01T00:00:00.000Z",
        },
        LIGHTNING: {
          invoice: "lnbc1exampleinvoicevalueextra",
          amount: 7000,
          targetAmount: 7000,
          expiresAt: "2026-12-01T00:00:00.000Z",
        },
      },
    });

    expect(payment.paymentMethods.map((method) => method.type)).toEqual([
      PaymentMethods.BANKTRANSFER,
      PaymentMethods.LIGHTNING,
    ]);
    expect(payment.selectedMethod?.type).toBe(PaymentMethods.LIGHTNING);
    expect(payment.bankTransferDetails?.amount).toBe(100000);
    expect(payment.bankTransferDetails?.targetAmount).toBe(7000);
    expect(payment.lightningInvoiceDetails?.invoice).toContain("lnbc1");
    expect(payment.lightningInvoiceDetails?.satsAmount).toBe(7000);
    expect(payment.mobileMoneyDetails).toBeUndefined();
  });

  it("renders USDT bank purchases in NGN with USDT target units", () => {
    const payment = transformPaymentLink({
      paymentLinkDetails: {
        id: "usdt-link",
        name: "USDT",
        description: "USDT NGN",
        callbackUrl: "https://merchant.example/return",
        settlementCurrency: "USDT",
        paymentCurrency: "NGN",
        paymentLinkOrderId: "usdt-order",
        paymentMethods: [PaymentMethods.BANKTRANSFER],
        account,
        BANKTRANSFER: {
          ngnAccountName: "Mava Digital Solutions Limited",
          ngnBankName: "GLOBUS BANK",
          ngnBankAccountNumber: "2222222222",
          amount: "10000000",
          targetAmount: "7000",
          expiresAt: "2026-12-01T00:00:00.000Z",
        },
      },
    });

    expect(payment.settlementCurrency).toBe("USDT");
    expect(payment.bankTransferDetails).toMatchObject({
      bankName: "GLOBUS BANK",
      accountNumber: "2222222222",
      amount: 100000,
      targetAmount: 70,
      currency: "NGNKOBO",
    });
    expect(payment.orderId).toBe("usdt-order");
  });

  it("keeps KES mobile money as metadata and does not invent a payable quote", () => {
    const payment = transformPaymentLink(
      {
        paymentLinkDetails: {
          id: "kes-link",
          name: "KES",
          description: "USDT KES",
          callbackUrl: "https://merchant.example/return",
          settlementCurrency: "USDT",
          paymentCurrency: "KES",
          amount: "100000",
          paymentMethods: [PaymentMethods.MOBILEMONEY],
          account,
          MOBILEMONEY: {
            requiresPaymentSource: true,
            sourceCurrency: "KES",
          },
        },
      },
      PaymentMethods.MOBILEMONEY,
    );

    expect(payment.orderId).toBe("");
    expect(payment.configuredAmount).toBe(1000);
    expect(payment.paymentCurrency).toBe("KES");
    expect(payment.mobileMoneyDetails?.amount).toBeUndefined();
    expect(payment.mobileMoneyDetails?.requiresPaymentSource).toBe(true);
    expect(payment.paymentMethods).toHaveLength(1);
  });
});

describe("checkout attempts", () => {
  it("replaces KES quote identifiers together and polls the payment link order", () => {
    const first = submittedView();
    const second = applyCheckoutSuccess(
      first,
      checkoutDetails({
        paymentLinkOrderId: "plo-2",
        requestId: "req-2",
        attemptId: "attempt-2",
        quoteId: "quote-2",
        internalOrderId: "internal-2",
        payableMajor: 1250,
        targetMajor: 80,
        quoteExpiresAt: "2026-01-01T02:00:00.000Z",
        retryAllowedAt: "2026-01-01T01:00:20.000Z",
      }),
      Date.parse("2026-01-01T00:10:00.000Z"),
    );

    expect(second.pollOrderId).toBe("plo-2");
    expect(second.pollOrderId).not.toBe(second.internalOrderId);
    expect(second).toMatchObject({
      quoteId: "quote-2",
      attemptId: "attempt-2",
      internalOrderId: "internal-2",
      payableMajor: 1250,
      targetMajor: 80,
      quoteExpiresAt: "2026-01-01T02:00:00.000Z",
      retryAllowedAt: "2026-01-01T01:00:20.000Z",
    });
    expect(second.submission).toEqual({
      requestId: "req-2",
      paymentSource: payer,
    });
    expect(second.pollGeneration).toBe(first.pollGeneration + 1);
  });

  it("replaces NGN bank instructions and the polling order together", () => {
    const current = transformPaymentLink({
      paymentLinkDetails: {
        id: "btc-link",
        name: "BTC",
        description: "BTC NGN",
        callbackUrl: "https://merchant.example/return",
        settlementCurrency: "BTC",
        paymentLinkOrderId: "order-old",
        paymentMethods: [PaymentMethods.BANKTRANSFER],
        account: { name: "Merchant", logo: "" },
        BANKTRANSFER: {
          ngnAccountName: "Old Account",
          ngnBankName: "OLD BANK",
          ngnBankAccountNumber: "1111111111",
          amount: 10000000,
          targetAmount: 5000,
          expiresAt: "2020-01-01T00:00:00.000Z",
        },
      },
    });
    const refreshed = applyBankRefresh(
      transformPaymentLink({
        paymentLinkDetails: {
          id: "btc-link",
          name: "BTC",
          description: "BTC NGN",
          callbackUrl: "https://merchant.example/return",
          settlementCurrency: "BTC",
          paymentLinkOrderId: "order-new",
          paymentMethods: [PaymentMethods.BANKTRANSFER],
          account: { name: "Merchant", logo: "" },
          BANKTRANSFER: {
            ngnAccountName: "New Account",
            ngnBankName: "NEW BANK",
            ngnBankAccountNumber: "3333333333",
            amount: 20000000,
            targetAmount: 9000,
            expiresAt: "2026-12-01T00:00:00.000Z",
          },
        },
      }),
    );

    expect(bankInstructionsFrom(refreshed)).toEqual({
      orderId: "order-new",
      bankName: "NEW BANK",
      accountNumber: "3333333333",
      accountName: "New Account",
      amount: 200000,
      targetAmount: 9000,
      expiresAt: "2026-12-01T00:00:00.000Z",
    });
    expect(bankInstructionsFrom(refreshed)).not.toMatchObject(
      bankInstructionsFrom(current),
    );
  });

  it("settles without a collection object and ignores older updates", () => {
    const current = submittedView();
    const settled = applyStatusUpdate(
      current,
      {
        generation: current.pollGeneration,
        orderId: current.pollOrderId,
        seq: 1,
        status: ApiPaymentStatus.SETTLED,
      },
      Date.parse("2026-01-01T00:00:30.000Z"),
    );

    expect(settled.phase).toBe(CheckoutPhases.SETTLED);
    expect(settled.settled).toBe(true);

    const stalePending = applyStatusUpdate(
      settled,
      {
        generation: settled.pollGeneration,
        orderId: settled.pollOrderId,
        seq: 2,
        status: ApiPaymentStatus.PENDING,
        collection: { promptStatus: PromptStatuses.SENT },
      },
      Date.parse("2026-01-01T00:00:31.000Z"),
    );
    expect(stalePending).toBe(settled);

    const replaced = applyCheckoutSuccess(
      current,
      checkoutDetails({ paymentLinkOrderId: "plo-2", requestId: "req-2" }),
      Date.parse("2026-01-01T00:00:40.000Z"),
    );
    const oldSettled = applyStatusUpdate(
      replaced,
      {
        generation: current.pollGeneration,
        orderId: "plo-1",
        seq: 1,
        status: ApiPaymentStatus.SETTLED,
      },
      Date.parse("2026-01-01T00:00:41.000Z"),
    );
    expect(oldSettled.settled).toBe(false);
    expect(oldSettled.pollOrderId).toBe("plo-2");
  });

  it("does not treat a timed out prompt as an expired quote", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const view = submittedView(
      checkoutDetails({
        promptStatus: PromptStatuses.TIMED_OUT,
        serverTime: "2026-01-01T00:00:00.000Z",
        quoteExpiresAt: "2026-01-01T01:00:00.000Z",
      }),
    );

    expect(view.quoteExpired).toBe(false);
    expect(markQuoteExpired(view, now).phase).toBe(CheckoutPhases.PENDING);
    expect(view.promptStatus).toBe(PromptStatuses.TIMED_OUT);
  });

  it("blocks another prompt for UNKNOWN, PROCESSING, and early retries", () => {
    const now = Date.parse("2026-01-01T00:00:30.000Z");
    const base = submittedView(
      checkoutDetails({
        canRetry: true,
        retryAllowedAt: "2026-01-01T00:00:00.000Z",
        serverTime: "2026-01-01T00:00:00.000Z",
      }),
    );

    expect(
      canRequestAnotherPrompt(
        { ...base, promptStatus: PromptStatuses.INITIATING },
        now,
      ),
    ).toBe(false);
    expect(
      canRequestAnotherPrompt(
        { ...base, promptStatus: PromptStatuses.UNKNOWN },
        now,
      ),
    ).toBe(false);
    expect(
      canRequestAnotherPrompt(
        { ...base, promptStatus: PromptStatuses.PROCESSING },
        now,
      ),
    ).toBe(false);
    expect(
      canRequestAnotherPrompt(
        {
          ...base,
          promptStatus: PromptStatuses.TIMED_OUT,
          canRetry: false,
        },
        now,
      ),
    ).toBe(false);
    expect(
      canRequestAnotherPrompt(
        { ...base, promptStatus: PromptStatuses.TIMED_OUT },
        now,
      ),
    ).toBe(true);
  });

  it("enables another prompt only after the latest status says canRetry", () => {
    const now = Date.parse("2026-01-01T00:00:30.000Z");
    const view = submittedView(
      checkoutDetails({
        canRetry: true,
        retryAllowedAt: "2026-01-01T00:00:00.000Z",
        serverTime: "2026-01-01T00:00:00.000Z",
      }),
    );
    const timedOut = applyStatusUpdate(
      view,
      {
        generation: view.pollGeneration,
        orderId: view.pollOrderId,
        seq: 1,
        status: ApiPaymentStatus.PENDING,
        collection: { promptStatus: PromptStatuses.TIMED_OUT },
      },
      now,
    );

    expect(timedOut.canRetry).toBe(false);
    expect(canRequestAnotherPrompt(timedOut, now)).toBe(false);

    const allowed = applyStatusUpdate(
      timedOut,
      {
        generation: timedOut.pollGeneration,
        orderId: timedOut.pollOrderId,
        seq: 2,
        status: ApiPaymentStatus.PENDING,
        collection: {
          promptStatus: PromptStatuses.TIMED_OUT,
          canRetry: true,
        },
      },
      now,
    );

    expect(allowed.canRetry).toBe(true);
    expect(canRequestAnotherPrompt(allowed, now)).toBe(true);
  });

  it("keeps a received payment pending while settlement is still pending", () => {
    const now = Date.parse("2026-01-01T00:00:30.000Z");
    const view = submittedView(checkoutDetails());
    const received = applyStatusUpdate(
      view,
      {
        generation: view.pollGeneration,
        orderId: view.pollOrderId,
        seq: 1,
        status: ApiPaymentStatus.PENDING,
        collection: {
          promptStatus: PromptStatuses.SUCCEEDED,
          paymentStatus: PromptStatuses.SUCCEEDED,
          canRetry: false,
        },
      },
      now,
    );

    expect(received.phase).toBe(CheckoutPhases.RECEIVED);
    expect(received.settled).toBe(false);
    expect(received.orderFailed).toBe(false);
    expect(canRequestAnotherPrompt(received, now)).toBe(false);
  });

  it("retries the same request after lock contention and rate limits", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const view = submittedView(
      checkoutDetails({
        requestId: "req-1",
        retryAllowedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    const locked = normalizeCheckoutError({ message: "locked" }, 409, "5");

    expect(locked.reuseRequest).toBe(true);
    expect(locked.autoRetry).toBe(false);
    expect(locked.userMessage).toMatch(/same submission/i);

    const waiting = applyCheckoutFailure(view, locked, now);
    expect(waiting.phase).toBe(CheckoutPhases.NEEDS_RETRY);
    expect(waiting.submission?.requestId).toBe("req-1");
    expect(waiting.canRetry).toBe(false);
    expect(canRetryInterruptedSubmission(waiting, now)).toBe(false);
    expect(canRetryInterruptedSubmission(waiting, now + 5_000)).toBe(true);
    expect(canRequestAnotherPrompt(waiting, now + 5_000)).toBe(false);

    const limited = normalizeCheckoutError(
      { message: "slow down", data: { retryAllowedAt: "2026-01-01T00:00:15.000Z" } },
      429,
      "10",
    );
    expect(limited.reuseRequest).toBe(false);
    expect(limited.autoRetry).toBe(false);
    expect(limited.retryAfterSeconds).toBe(10);
    expect(limited.collection?.retryAllowedAt).toBe("2026-01-01T00:00:15.000Z");

    const rateLimited = applyCheckoutFailure(view, limited, now);
    expect(rateLimited.canRetry).toBe(false);
    expect(rateLimited.pollOrderId).toBe("plo-1");
    expect(rateLimited.phase).toBe(CheckoutPhases.PENDING);
    expect(rateLimited.submission?.requestId).toBe("req-1");
    expect(canRequestAnotherPrompt(rateLimited, now + 20_000)).toBe(false);
  });

  it("keeps an unexpected failure on the same request and accepted order", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const view = submittedView(checkoutDetails({ requestId: "req-1" }));
    const error = normalizeCheckoutError(
      {
        message: "unexpected",
        data: { paymentLinkOrderId: "plo-accepted" },
      },
      500,
    );

    expect(error.reuseRequest).toBe(true);
    expect(error.autoRetry).toBe(false);
    expect(error.paymentLinkOrderId).toBe("plo-accepted");
    expect(error.userMessage).toMatch(/attempt was kept/i);

    const failed = applyCheckoutFailure(view, error, now);
    expect(failed.phase).toBe(CheckoutPhases.NEEDS_RETRY);
    expect(failed.orderFailed).toBe(false);
    expect(failed.pollOrderId).toBe("plo-accepted");
    expect(failed.submission?.requestId).toBe("req-1");
    expect(canRequestAnotherPrompt(failed, now)).toBe(false);
  });

  it("allows a new request only after a prompt that was not submitted may be retried", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const started = beginSubmission(createMobileMoneyView(), {
      requestId: "req-old",
      paymentSource: payer,
    });
    const error = normalizeCheckoutError(
      {
        code: "COLLECTION_NOT_SUBMITTED",
        data: {
          canRetry: false,
          retryAllowedAt: "2026-01-01T00:00:20.000Z",
        },
      },
      409,
    );

    expect(error.reuseRequest).toBe(false);
    expect(error.autoRetry).toBe(false);
    expect(error.userMessage).toMatch(/not sent/i);

    const next = applyCheckoutFailure(started, error, now);
    expect(next.collectionNotSubmitted).toBe(true);
    expect(next.submission?.requestId).toBe("req-old");
    expect(next.phase).not.toBe(CheckoutPhases.NEEDS_RETRY);
    expect(canRequestAnotherPrompt(next, now)).toBe(false);
    expect(canRequestAnotherPrompt(next, now + 20_000)).toBe(true);

    const withOrder = applyCheckoutFailure(
      started,
      normalizeCheckoutError(
        {
          code: "COLLECTION_NOT_SUBMITTED",
          data: {
            paymentLinkOrderId: "plo-1",
            canRetry: true,
            retryAllowedAt: "2026-01-01T00:00:00.000Z",
          },
        },
        409,
      ),
      now,
    );
    expect(withOrder.pollOrderId).toBe("plo-1");
    expect(canRequestAnotherPrompt(withOrder, now)).toBe(true);
  });

  it("uses the server clock when measuring the retry countdown", () => {
    const receivedAt = Date.parse("2026-01-01T00:00:00.000Z");
    const serverTime = new Date(receivedAt + 30_000).toISOString();
    const retryAllowedAt = new Date(receivedAt + 35_000).toISOString();
    const offset = serverClockOffsetMs(serverTime, receivedAt);

    expect(offset).toBe(30_000);
    expect(remainingMs(retryAllowedAt, offset, receivedAt)).toBe(5_000);
    expect(remainingMs(retryAllowedAt, 0, receivedAt)).toBe(35_000);
    expect(remainingMs(retryAllowedAt, offset, receivedAt + 5_000)).toBe(0);
    expect(laterRetryAllowedAt(retryAllowedAt, 25, receivedAt)).toBe(
      retryAllowedAt,
    );
    expect(laterRetryAllowedAt(retryAllowedAt, 60, receivedAt)).toBe(
      new Date(receivedAt + 60_000).toISOString(),
    );
  });

  it("resumes polling from accepted error orders without using the internal order id", () => {
    const nested = normalizeCheckoutError(
      {
        code: "COLLECTION_UNCONFIRMED",
        message: "fingerprint settlement marker",
        data: {
          paymentLinkOrderId: "plo-accepted",
          collection: {
            orderId: "internal-order",
            promptStatus: PromptStatuses.UNKNOWN,
            requestId: "req-1",
          },
        },
      },
      409,
    );
    expect(nested.reuseRequest).toBe(false);
    expect(nested.autoRetry).toBe(false);
    expect(nested.resumePolling).toBe(true);
    expect(nested.paymentLinkOrderId).toBe("plo-accepted");
    expect(nested.collection?.internalOrderId).toBe("internal-order");
    expect(nested.userMessage).not.toMatch(/fingerprint|plo-accepted|internal-order/i);

    const direct = normalizeCheckoutError(
      {
        code: "LEGACY_COLLECTION_ADOPTED",
        data: {
          paymentLinkOrderId: "plo-legacy",
          orderId: "internal-legacy",
          requestId: "req-9",
          promptStatus: PromptStatuses.SENT,
          canRetry: false,
        },
      },
      409,
    );
    expect(direct.paymentLinkOrderId).toBe("plo-legacy");
    expect(direct.collection?.internalOrderId).toBe("internal-legacy");
    expect(direct.resumePolling).toBe(true);

    const settled = normalizeStatusPayload({
      status: "ok",
      data: { status: "SETTLED" },
    });
    expect(settled).toEqual({
      status: ApiPaymentStatus.SETTLED,
      collection: undefined,
    });
  });

  it("normalizes a mobile-money checkout without treating the internal order as the poll id", () => {
    const parsed = normalizeCheckoutSuccess(
      {
        paymentLinkDetails: {
          paymentLinkOrderId: "plo",
          MOBILEMONEY: {
            amount: "100000",
            targetAmount: "7000",
            sourceCurrency: "KES",
            orderId: "internal",
            quoteId: "quote",
            attemptId: "attempt",
            requestId: "request",
          },
        },
      },
      "USDT",
    );

    expect(parsed?.paymentLinkOrderId).toBe("plo");
    expect(parsed?.internalOrderId).toBe("internal");
    expect(parsed?.payableMajor).toBe(1000);
    expect(parsed?.targetMajor).toBe(70);
  });

  it("lets one submission enter the gate", () => {
    const gate = createSubmitGate();
    expect(gate.tryEnter()).toBe(true);
    expect(gate.tryEnter()).toBe(false);
    gate.leave();
    expect(gate.tryEnter()).toBe(true);
  });
});

describe("payment endpoints", () => {
  it("uses the configured API base URL and public checkout paths", () => {
    const endpoints = getPaymentEndpoints({
      id: "link-1",
      orderId: "order-1",
      paymentMethod: PaymentMethods.MOBILEMONEY,
    });

    expect(endpoints.getPaymentDetails).toBe(
      `${API_BASE_URL}/paymentlink/details?id=link-1&paymentMethod=MOBILEMONEY`,
    );
    expect(endpoints.refreshPayment).toBe(
      `${API_BASE_URL}/paymentlink/refresh?id=link-1&paymentMethod=MOBILEMONEY`,
    );
    expect(endpoints.getPaymentStatus).toBe(
      `${API_BASE_URL}/paymentlink/status?orderId=order-1`,
    );
    expect(endpoints.checkoutPayment).toBe(
      `${API_BASE_URL}/paymentlink/link-1/checkout`,
    );
    expect(endpoints.checkoutPayment).not.toContain("apiKey");
    expect(endpoints.getPaymentStatus).not.toContain("/paymentlink/orders");
  });
});
