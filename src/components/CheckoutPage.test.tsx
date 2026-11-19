import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutPage } from "@/components/CheckoutPage";
import { formatAmount } from "@/lib/amount";
import { transformPaymentLink } from "@/lib/payment-link";
import { PaymentData } from "@/types/payment";
import { PaymentMethods } from "@/types/primitives";

const push = vi.hoisted(() => vi.fn());
const fetchPaymentData = vi.hoisted(() => vi.fn());
const fetchPaymentStatus = vi.hoisted(() => vi.fn());
const refreshPayment = vi.hoisted(() => vi.fn());
const submitPaymentLinkCheckout = vi.hoisted(() => vi.fn());
const createRequestId = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/services/api", () => ({
  fetchPaymentData,
  fetchPaymentStatus,
  refreshPayment,
  submitPaymentLinkCheckout,
}));

vi.mock("@/lib/request-id", () => ({
  createRequestId,
}));

const account = { name: "Extheo Agric", logo: "" };

const bankPayment = (
  overrides: {
    id?: string;
    settlementCurrency?: "BTC" | "USDT";
    orderId?: string;
    accountNumber?: string;
    bankName?: string;
    accountName?: string;
    amount?: number;
    targetAmount?: number;
    expiresAt?: string;
    description?: string;
  } = {},
) =>
  transformPaymentLink({
    paymentLinkDetails: {
      id: overrides.id || "btc-link",
      name: "Bank",
      description: overrides.description || "Bank checkout",
      callbackUrl: "https://merchant.example/return",
      settlementCurrency: overrides.settlementCurrency || "BTC",
      paymentCurrency: "NGN",
      paymentLinkOrderId: overrides.orderId || "bank-order",
      paymentMethods: [PaymentMethods.BANKTRANSFER],
      account,
      BANKTRANSFER: {
        ngnAccountName: overrides.accountName || "Mava Digital Solutions Limited",
        ngnBankName: overrides.bankName || "GLOBUS BANK",
        ngnBankAccountNumber: overrides.accountNumber || "1111111111",
        amount: overrides.amount ?? 10000000,
        targetAmount: overrides.targetAmount ?? 7000,
        expiresAt: overrides.expiresAt || "2099-01-01T00:00:00.000Z",
      },
    },
  });

const kesPayment = (settlementCurrency: "BTC" | "USDT", description: string) =>
  transformPaymentLink(
    {
      paymentLinkDetails: {
        id: `${settlementCurrency.toLowerCase()}-kes`,
        name: description,
        description,
        callbackUrl: "https://merchant.example/return",
        settlementCurrency,
        paymentCurrency: settlementCurrency === "BTC" ? "BTC" : "KES",
        amount: settlementCurrency === "BTC" ? 100000 : 100000,
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

const lightningPayment = () =>
  transformPaymentLink({
    paymentLinkDetails: {
      id: "lightning-link",
      name: "Lightning",
      description: "Lightning checkout",
      callbackUrl: "https://merchant.example/return",
      settlementCurrency: "BTC",
      paymentLinkOrderId: "lightning-order",
      paymentMethods: [PaymentMethods.LIGHTNING, PaymentMethods.BANKTRANSFER],
      account,
      LIGHTNING: {
        invoice: "lnbc1exampleinvoicevalueextra",
        amount: 7000,
        targetAmount: 7000,
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
      BANKTRANSFER: {
        ngnAccountName: "Mava Digital Solutions Limited",
        ngnBankName: "GLOBUS BANK",
        ngnBankAccountNumber: "1111111111",
        amount: 10000000,
        targetAmount: 7000,
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
    },
  });

const renderPayment = async (payment: PaymentData) => {
  fetchPaymentData.mockImplementation(async () => ({
    status: "ok",
    data: payment,
  }));
  render(<CheckoutPage paymentId={payment.id} />);
  await screen.findByText(payment.description);
};

const fillPayer = () => {
  fireEvent.change(screen.getByLabelText("Phone number"), {
    target: { value: "0712345678" },
  });
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Jane" },
  });
  fireEvent.change(screen.getByLabelText("Last name"), {
    target: { value: "Doe" },
  });
};

const payer = {
  phoneNumber: "+254712345678",
  firstName: "Jane",
  lastName: "Doe",
};

describe("payment link checkout", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    push.mockReset();
    fetchPaymentData.mockReset();
    fetchPaymentStatus.mockReset();
    refreshPayment.mockReset();
    submitPaymentLinkCheckout.mockReset();
    createRequestId.mockReset();
    let sequence = 0;
    createRequestId.mockImplementation(
      () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    );
    fetchPaymentStatus.mockResolvedValue({
      status: "ok",
      data: { status: "PENDING" },
    });
  });

  it("keeps the BTC bank transfer checkout", async () => {
    const payment = bankPayment({ description: "BTC NGN checkout" });
    await renderPayment(payment);

    expect(document.body.textContent).toContain("GLOBUS BANK");
    expect(document.body.textContent).toContain("1111111111");
    expect(document.body.textContent).toContain(
      formatAmount(100000, "NGNKOBO", "₦"),
    );
    expect(document.body.textContent).toContain("7,000 SATS");
    expect(screen.queryByLabelText("First name")).toBeNull();
    expect(screen.queryByText(/transaction amount only/i)).toBeNull();
    expect(screen.getByText(/do not close this tab/i)).toBeTruthy();
    expect(submitPaymentLinkCheckout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "I have Paid" }));
    expect(await screen.findByText(/confirming your payment/i)).toBeTruthy();
    expect(screen.queryByText(/transaction amount only/i)).toBeNull();
    expect(screen.getByText(/do not close this tab/i)).toBeTruthy();
  });

  it("shows USDT bank details in naira and USDT", async () => {
    const payment = bankPayment({
      id: "usdt-link",
      description: "USDT NGN checkout",
      settlementCurrency: "USDT",
      accountNumber: "2222222222",
      orderId: "usdt-order",
    });
    await renderPayment(payment);

    expect(document.body.textContent).toContain("GLOBUS BANK");
    expect(document.body.textContent).toContain("2222222222");
    expect(document.body.textContent).toContain(
      formatAmount(100000, "NGNKOBO", "₦"),
    );
    expect(document.body.textContent).toContain("USDT");
    expect(document.body.textContent).toContain(
      formatAmount(70, "USDTUNIT", "USDT"),
    );
    expect(screen.queryByLabelText("Phone number")).toBeNull();
    expect(screen.queryByText(/transaction amount only/i)).toBeNull();
    expect(screen.getByText(/do not close this tab/i)).toBeTruthy();
  });

  it("shows the KES payer form and does not submit checkout while opening or selecting it", async () => {
    const btc = kesPayment("BTC", "BTC KES checkout");
    fetchPaymentData.mockImplementation(async () => ({
      status: "ok",
      data: btc,
    }));
    const first = render(<CheckoutPage paymentId={btc.id} />);
    await screen.findByText("BTC KES checkout");
    expect(screen.getByLabelText("First name")).toBeTruthy();
    expect(screen.getByLabelText("Last name")).toBeTruthy();
    expect(document.body.textContent).toContain("0.001 BTC");
    expect(submitPaymentLinkCheckout).not.toHaveBeenCalled();
    expect(fetchPaymentData).toHaveBeenCalledWith(
      btc.id,
      PaymentMethods.MOBILEMONEY,
    );
    first.unmount();

    const usdt = kesPayment("USDT", "USDT KES checkout");
    fetchPaymentData.mockImplementation(async () => ({
      status: "ok",
      data: usdt,
    }));
    render(<CheckoutPage paymentId={usdt.id} />);
    await screen.findByText("USDT KES checkout");
    expect(screen.getByLabelText("First name")).toBeTruthy();
    expect(document.body.textContent).toContain("KSh 1,000.00");
    expect(screen.queryByText(/transaction amount only/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "I have Paid" })).toBeNull();
    expect(submitPaymentLinkCheckout).not.toHaveBeenCalled();
  });

  it("does not submit checkout when mobile money is selected", async () => {
    const payment = transformPaymentLink({
      paymentLinkDetails: {
        id: "mixed-link",
        name: "Mixed",
        description: "Mixed methods",
        callbackUrl: "https://merchant.example/return",
        settlementCurrency: "USDT",
        paymentCurrency: "KES",
        amount: 100000,
        paymentLinkOrderId: "bank-order",
        paymentMethods: [PaymentMethods.BANKTRANSFER, PaymentMethods.MOBILEMONEY],
        account,
        BANKTRANSFER: {
          ngnAccountName: "Mava Digital Solutions Limited",
          ngnBankName: "GLOBUS BANK",
          ngnBankAccountNumber: "1111111111",
          amount: 10000000,
          targetAmount: 7000,
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
        MOBILEMONEY: {
          requiresPaymentSource: true,
          sourceCurrency: "KES",
        },
      },
    });
    await renderPayment(payment);
    fireEvent.click(screen.getAllByText("Mobile Money")[0]);

    await waitFor(() => {
      expect(fetchPaymentData).toHaveBeenCalledWith(
        "mixed-link",
        PaymentMethods.MOBILEMONEY,
      );
    });
    expect(submitPaymentLinkCheckout).not.toHaveBeenCalled();
  });

  it("requires both names and sends them with one request when clicked twice", async () => {
    const payment = kesPayment("USDT", "Name validation");
    await renderPayment(payment);
    fireEvent.click(screen.getByRole("button", { name: "Send payment prompt" }));
    expect(submitPaymentLinkCheckout).not.toHaveBeenCalled();
    expect(screen.getByText("First name is required.")).toBeTruthy();
    expect(screen.getByText("Last name is required.")).toBeTruthy();

    fillPayer();
    let resolveCheckout: (value: unknown) => void = () => undefined;
    submitPaymentLinkCheckout.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCheckout = resolve;
        }),
    );
    const button = screen.getByRole("button", { name: "Send payment prompt" });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(submitPaymentLinkCheckout).toHaveBeenCalledTimes(1);
    });
    expect(createRequestId).toHaveBeenCalledTimes(1);
    expect(submitPaymentLinkCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentLinkId: payment.id,
        requestId: "00000000-0000-4000-8000-000000000001",
        paymentSource: payer,
      }),
    );
    resolveCheckout({
      ok: true,
      details: {
        paymentLinkOrderId: "plo-1",
        sourceCurrency: "KES",
        payableMinor: 100000,
        payableMajor: 1000,
        targetMinor: 7000,
        targetMajor: 70,
        requestId: "00000000-0000-4000-8000-000000000001",
        attemptId: "attempt-1",
        quoteId: "quote-1",
        internalOrderId: "internal-1",
        promptStatus: "SENT",
        paymentStatus: "PENDING",
        canRetry: false,
        retryAllowedAt: new Date(Date.now() + 60_000).toISOString(),
        quoteExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
        serverTime: new Date().toISOString(),
      },
    });
  });

  it("retries an interrupted submission with the same id and payer payload", async () => {
    const payment = kesPayment("USDT", "Retry checkout");
    await renderPayment(payment);
    fillPayer();
    const error = {
      ok: false,
      error: {
        network: true,
        reuseRequest: true,
        autoRetry: true,
        userMessage:
          "The connection was interrupted. The original attempt was kept so a duplicate prompt is not sent. Retry the submission.",
        message: "",
        resumePolling: false,
      },
    };
    submitPaymentLinkCheckout
      .mockResolvedValueOnce(error)
      .mockResolvedValueOnce(error)
      .mockResolvedValueOnce({
        ok: true,
        details: {
          paymentLinkOrderId: "plo-retry",
          sourceCurrency: "KES",
          payableMinor: 100000,
          payableMajor: 1000,
          targetMinor: 7000,
          targetMajor: 70,
          requestId: "00000000-0000-4000-8000-000000000001",
          promptStatus: "SENT",
          paymentStatus: "PENDING",
          canRetry: false,
          quoteExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
          serverTime: new Date().toISOString(),
        },
      });

    fireEvent.click(screen.getByRole("button", { name: "Send payment prompt" }));
    await waitFor(() => {
      expect(submitPaymentLinkCheckout).toHaveBeenCalledTimes(2);
    });
    fireEvent.click(await screen.findByRole("button", { name: "Retry submission" }));
    await waitFor(() => {
      expect(submitPaymentLinkCheckout).toHaveBeenCalledTimes(3);
    });

    const payloads = submitPaymentLinkCheckout.mock.calls.map((call) => call[0]);
    expect(new Set(payloads.map((payload) => payload.requestId)).size).toBe(1);
    expect(payloads.every((payload) => {
      return JSON.stringify(payload.paymentSource) === JSON.stringify(payer);
    })).toBe(true);
    expect(createRequestId).toHaveBeenCalledTimes(1);
  });

  it("creates a new prompt id only after another prompt is allowed", async () => {
    const clientNow = Date.now();
    const serverTime = new Date(clientNow + 30_000).toISOString();
    const payment = kesPayment("USDT", "Resend prompt");
    await renderPayment(payment);
    fillPayer();
    submitPaymentLinkCheckout.mockResolvedValue({
      ok: true,
      details: {
        paymentLinkOrderId: "plo-1",
        sourceCurrency: "KES",
        payableMinor: 100000,
        payableMajor: 1000,
        targetMinor: 7000,
        targetMajor: 70,
        requestId: "00000000-0000-4000-8000-000000000001",
        attemptId: "attempt-1",
        quoteId: "quote-1",
        internalOrderId: "internal-1",
        promptStatus: "SENT",
        paymentStatus: "PENDING",
        canRetry: false,
        retryAllowedAt: new Date(clientNow + 35_000).toISOString(),
        quoteExpiresAt: new Date(clientNow + 3600_000).toISOString(),
        serverTime,
      },
    });
    const releaseStatus: Array<(value: unknown) => void> = [];
    fetchPaymentStatus.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseStatus.push(resolve);
        }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Send payment prompt" }));
    expect(await screen.findByRole("button", { name: /Resend Prompt 0:0[45]/ })).toBeTruthy();
    const blocked = await screen.findByRole("button", { name: /Resend Prompt/ });
    expect(blocked).toHaveProperty("disabled", true);
    fireEvent.click(blocked);
    expect(createRequestId).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(releaseStatus.length).toBeGreaterThan(0));

    releaseStatus[0]({
      status: "ok",
      data: {
        status: "PENDING",
        collection: {
          promptStatus: "TIMED_OUT",
          canRetry: true,
          retryAllowedAt: new Date(clientNow + 29_000).toISOString(),
          quoteExpiresAt: new Date(clientNow + 3600_000).toISOString(),
          serverTime,
        },
      },
    });

    const allowed = await screen.findByRole("button", { name: "Resend Prompt" });
    await waitFor(() => {
      expect(allowed).toHaveProperty("disabled", false);
    });
    submitPaymentLinkCheckout.mockResolvedValue({
      ok: true,
      details: {
        paymentLinkOrderId: "plo-1",
        sourceCurrency: "KES",
        payableMinor: 100000,
        payableMajor: 1000,
        targetMinor: 7000,
        targetMajor: 70,
        requestId: "00000000-0000-4000-8000-000000000002",
        attemptId: "attempt-2",
        quoteId: "quote-1",
        internalOrderId: "internal-1",
        promptStatus: "SENT",
        paymentStatus: "PENDING",
        canRetry: false,
        retryAllowedAt: new Date(clientNow + 80_000).toISOString(),
        quoteExpiresAt: new Date(clientNow + 3600_000).toISOString(),
        serverTime,
      },
    });
    fireEvent.click(allowed);
    await waitFor(() => {
      expect(createRequestId).toHaveBeenCalledTimes(2);
    });
    expect(submitPaymentLinkCheckout).toHaveBeenLastCalledWith(
      expect.objectContaining({
        requestId: "00000000-0000-4000-8000-000000000002",
        paymentSource: payer,
      }),
    );
  });

  it("does not mark the quote expired when the prompt times out", async () => {
    const payment = kesPayment("BTC", "Prompt timeout");
    await renderPayment(payment);
    fillPayer();
    submitPaymentLinkCheckout.mockResolvedValue({
      ok: true,
      details: {
        paymentLinkOrderId: "plo-1",
        sourceCurrency: "KES",
        payableMinor: 50000,
        payableMajor: 500,
        targetMinor: 100000,
        targetMajor: 0.001,
        requestId: "req-1",
        promptStatus: "TIMED_OUT",
        paymentStatus: "PENDING",
        canRetry: false,
        retryAllowedAt: new Date(Date.now() + 20_000).toISOString(),
        quoteExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
        serverTime: new Date().toISOString(),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send payment prompt" }));
    expect(await screen.findByText(/prompt window elapsed/i)).toBeTruthy();
    expect(screen.queryByText(/no longer active/i)).toBeNull();
  });

  it("shows one message when the quote is no longer active", async () => {
    const payment = kesPayment("USDT", "Expired quote");
    await renderPayment(payment);
    fillPayer();
    submitPaymentLinkCheckout.mockResolvedValue({
      ok: true,
      details: {
        paymentLinkOrderId: "plo-expired",
        sourceCurrency: "KES",
        payableMinor: 15000,
        payableMajor: 150,
        targetMinor: 111,
        targetMajor: 1.11,
        requestId: "req-1",
        promptStatus: "TIMED_OUT",
        paymentStatus: "PENDING",
        canRetry: false,
        quoteExpiresAt: new Date(Date.now() - 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send payment prompt" }));

    expect(
      await screen.findByText(
        "This quote is no longer active. Continue payment to request a new one.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/prompt window elapsed/i)).toBeNull();
    expect(screen.getAllByText(/no longer active/i)).toHaveLength(1);
  });

  it("does not submit again while the prompt is unknown or processing", async () => {
    const payment = kesPayment("USDT", "Unknown prompt");
    await renderPayment(payment);
    fillPayer();
    submitPaymentLinkCheckout.mockResolvedValue({
      ok: true,
      details: {
        paymentLinkOrderId: "plo-1",
        sourceCurrency: "KES",
        payableMinor: 100000,
        payableMajor: 1000,
        targetMinor: 7000,
        targetMajor: 70,
        requestId: "req-1",
        promptStatus: "UNKNOWN",
        paymentStatus: "PENDING",
        canRetry: true,
        retryAllowedAt: new Date(Date.now() - 1000).toISOString(),
        quoteExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
        serverTime: new Date().toISOString(),
      },
    });
    fetchPaymentStatus.mockResolvedValue({
      status: "ok",
      data: {
        status: "PENDING",
        collection: {
          promptStatus: "PROCESSING",
          canRetry: true,
          paymentStatus: "PENDING",
          quoteExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
          serverTime: new Date().toISOString(),
        },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send payment prompt" }));
    const button = await screen.findByRole("button", { name: /Resend Prompt/ });
    await waitFor(() => {
      expect(button).toHaveProperty("disabled", true);
    });
    fireEvent.click(button);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(submitPaymentLinkCheckout).toHaveBeenCalledTimes(1);
  });

  it("replaces the KES polling target when checkout refreshes the quote", async () => {
    const clientNow = Date.now();
    const serverTime = new Date(clientNow).toISOString();
    const payment = kesPayment("USDT", "Quote refresh");
    await renderPayment(payment);
    fillPayer();
    const statusOrders: string[] = [];
    fetchPaymentStatus.mockImplementation(async (orderId: string) => {
      statusOrders.push(orderId);
      return {
        status: "ok",
        data: {
          status: "PENDING",
          collection: {
            promptStatus: "SENT",
            canRetry: true,
            serverTime,
          },
        },
      };
    });
    submitPaymentLinkCheckout.mockResolvedValueOnce({
      ok: true,
      details: {
        paymentLinkOrderId: "plo-old",
        sourceCurrency: "KES",
        payableMinor: 100000,
        payableMajor: 1000,
        targetMinor: 7000,
        targetMajor: 70,
        requestId: "00000000-0000-4000-8000-000000000001",
        attemptId: "attempt-old",
        quoteId: "quote-old",
        internalOrderId: "internal-old",
        promptStatus: "FAILED",
        paymentStatus: "PENDING",
        canRetry: true,
        retryAllowedAt: new Date(clientNow - 1000).toISOString(),
        quoteExpiresAt: new Date(clientNow - 1000).toISOString(),
        serverTime,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send payment prompt" }));
    const continuePayment = await screen.findByRole("button", {
      name: "Continue payment",
    });
    submitPaymentLinkCheckout.mockResolvedValueOnce({
      ok: true,
      details: {
        paymentLinkOrderId: "plo-new",
        sourceCurrency: "KES",
        payableMinor: 120000,
        payableMajor: 1200,
        targetMinor: 8000,
        targetMajor: 80,
        requestId: "00000000-0000-4000-8000-000000000002",
        attemptId: "attempt-new",
        quoteId: "quote-new",
        internalOrderId: "internal-new",
        promptStatus: "SENT",
        paymentStatus: "PENDING",
        canRetry: false,
        retryAllowedAt: new Date(clientNow + 20_000).toISOString(),
        quoteExpiresAt: new Date(clientNow + 3600_000).toISOString(),
        serverTime,
      },
    });
    fireEvent.click(continuePayment);

    await waitFor(() => {
      expect(statusOrders).toContain("plo-new");
    });
    expect(submitPaymentLinkCheckout).toHaveBeenLastCalledWith(
      expect.objectContaining({
        requestId: "00000000-0000-4000-8000-000000000002",
        paymentSource: payer,
      }),
    );
    expect(document.body.textContent).toContain("KSh 1,200.00");
    expect(document.body.textContent).toContain("USDT 80.00");
  });

  it("replaces bank instructions and polls the refreshed order", async () => {
    const payment = bankPayment({
      description: "Refresh bank",
      expiresAt: "2000-01-01T00:00:00.000Z",
      orderId: "order-old",
      accountNumber: "1111111111",
      bankName: "OLD BANK",
    });
    await renderPayment(payment);
    const refreshed = bankPayment({
      description: "Refresh bank",
      expiresAt: "2099-01-01T00:00:00.000Z",
      orderId: "order-new",
      accountNumber: "3333333333",
      bankName: "NEW BANK",
      accountName: "New Account",
      amount: 20000000,
      targetAmount: 9000,
    });
    refreshPayment.mockResolvedValue({ status: "ok", data: refreshed });
    fireEvent.click(await screen.findByRole("button", { name: "Refresh Payment" }));

    expect(await screen.findByText("NEW BANK")).toBeTruthy();
    expect(document.body.textContent).toContain("3333333333");
    expect(document.body.textContent).not.toContain("OLD BANK");
    await waitFor(
      () => {
        expect(fetchPaymentStatus).toHaveBeenCalledWith(
          "order-new",
          expect.anything(),
        );
      },
      { timeout: 6000 },
    );
  });

  it("settles without collection data and leaves the payment instructions", async () => {
    const payment = kesPayment("USDT", "Settle checkout");
    await renderPayment(payment);
    fillPayer();
    submitPaymentLinkCheckout.mockResolvedValue({
      ok: true,
      details: {
        paymentLinkOrderId: "plo-settled",
        sourceCurrency: "KES",
        payableMinor: 100000,
        payableMajor: 1000,
        targetMinor: 7000,
        targetMajor: 70,
        requestId: "req-1",
        promptStatus: "SUCCEEDED",
        paymentStatus: "SUCCEEDED",
        canRetry: false,
        quoteExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
        serverTime: new Date().toISOString(),
      },
    });
    fetchPaymentStatus.mockResolvedValue({
      status: "ok",
      data: { status: "SETTLED" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send payment prompt" }));
    expect(await screen.findByText(/confirming your payment/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Resend Prompt/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send payment prompt" })).toBeNull();
  });

  it("continues to payment confirmation after the prompt is approved", async () => {
    const payment = kesPayment("USDT", "Approve prompt");
    await renderPayment(payment);
    fillPayer();
    submitPaymentLinkCheckout.mockResolvedValue({
      ok: true,
      details: {
        paymentLinkOrderId: "plo-approved",
        sourceCurrency: "KES",
        payableMinor: 134000,
        payableMajor: 1340,
        targetMinor: 1000,
        targetMajor: 10,
        requestId: "00000000-0000-4000-8000-000000000001",
        promptStatus: "SENT",
        paymentStatus: "PENDING",
        canRetry: false,
        quoteExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
        serverTime: new Date().toISOString(),
      },
    });
    fetchPaymentStatus.mockResolvedValue({
      status: "ok",
      data: { status: "PENDING" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send payment prompt" }));
    expect(await screen.findByText(/transaction amount only/i)).toBeTruthy();
    const proceed = await screen.findByRole("button", { name: "I have Paid" });
    fireEvent.click(proceed);

    expect(await screen.findByText(/confirming your payment/i)).toBeTruthy();
    expect(screen.getByText(/transaction amount only/i)).toBeTruthy();
    expect(screen.queryByText(/pay this exact amount/i)).toBeNull();
    expect(submitPaymentLinkCheckout).toHaveBeenCalledTimes(1);
    expect(fetchPaymentStatus).toHaveBeenCalledWith("plo-approved");
  });

  it("keeps the lightning invoice checkout", async () => {
    const payment = lightningPayment();
    await renderPayment(payment);
    expect(document.body.textContent).toContain("lnbc1exampleinvoicevalue");
    expect(screen.queryByLabelText("Phone number")).toBeNull();
    expect(submitPaymentLinkCheckout).not.toHaveBeenCalled();
  });
});
