import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

import { submitPaymentLinkCheckout } from "@/services/api";

vi.mock("axios", () => {
  const post = vi.fn();
  const get = vi.fn();
  return {
    default: {
      post,
      get,
      isAxiosError: () => false,
    },
  };
});

describe("checkout client", () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
  });

  it("posts the payer payload to the app proxy without a hardcoded host", async () => {
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: {
        status: "ok",
        data: {
          paymentLinkDetails: {
            paymentLinkOrderId: "plo-1",
            MOBILEMONEY: {
              amount: 100000,
              sourceCurrency: "KES",
              targetAmount: 7000,
              requestId: "req-1",
            },
          },
        },
      },
    });

    const result = await submitPaymentLinkCheckout({
      paymentLinkId: "link-1",
      requestId: "req-1",
      settlementCurrency: "USDT",
      paymentSource: {
        phoneNumber: "+254712345678",
        firstName: "Jane",
        lastName: "Doe",
      },
    });

    expect(axios.post).toHaveBeenCalledWith(
      "/api/payment/checkout",
      {
        paymentLinkId: "link-1",
        requestId: "req-1",
        paymentSource: {
          phoneNumber: "+254712345678",
          firstName: "Jane",
          lastName: "Doe",
        },
      },
      expect.any(Object),
    );
    expect(String(vi.mocked(axios.post).mock.calls[0][0])).not.toContain("localhost");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.details.paymentLinkOrderId).toBe("plo-1");
      expect(result.details.payableMajor).toBe(1000);
    }
  });
});
