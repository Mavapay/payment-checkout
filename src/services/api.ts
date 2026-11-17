import axios from "axios";
import {
  ApiResponse,
  NormalizedCheckoutDetails,
  NormalizedCheckoutError,
  PaymentData,
  PaymentMethodType,
  PaymentStatusData,
  PayerPayload,
} from "@/types/payment";
import { ApiPaymentStatus } from "@/types/primitives";

import {
  normalizeCheckoutError,
  normalizeCheckoutSuccess,
  normalizeStatusPayload,
} from "@/lib/collection";
import { networkFailureMessage } from "@/lib/payment-errors";

export type CheckoutCallResult =
  | { ok: true; details: NormalizedCheckoutDetails }
  | { ok: false; error: NormalizedCheckoutError };

const isCancelled = (error: unknown): boolean => {
  return (
    axios.isAxiosError(error) &&
    (error.code === "ERR_CANCELED" || error.name === "CanceledError")
  );
};

export async function fetchPaymentData(
  paymentId: string,
  paymentMethod?: string,
): Promise<ApiResponse<PaymentData>> {
  try {
    const params = new URLSearchParams({
      id: paymentId,
    });

    if (paymentMethod) {
      params.append("paymentMethod", paymentMethod);
    }

    const response = await axios.get<ApiResponse<PaymentData>>(
      `/api/payment/details?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching payment data");

    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch payment data";
      return {
        status: "error",
        data: {} as PaymentData,
        message,
        code: error.response?.data?.code,
      };
    }

    return {
      status: "error",
      data: {} as PaymentData,
      message:
        error instanceof Error ? error.message : "Failed to fetch payment data",
    };
  }
}

export async function refreshPayment(
  id: string,
  paymentMethod: PaymentMethodType,
): Promise<ApiResponse<PaymentData>> {
  try {
    const params = new URLSearchParams({
      id,
      paymentMethod,
      refreshPayment: "true",
    });

    const response = await axios.get<ApiResponse<PaymentData>>(
      `/api/payment/details?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error("Error refreshing payment");
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to refresh payment";
      return {
        status: "error",
        data: {} as PaymentData,
        message,
        code: error.response?.data?.code,
      };
    }

    return {
      status: "error",
      data: {} as PaymentData,
      message:
        error instanceof Error ? error.message : "Failed to refresh payment",
    };
  }
}

export async function fetchPaymentStatus(
  orderId: string,
  signal?: AbortSignal,
): Promise<ApiResponse<PaymentStatusData>> {
  try {
    const params = new URLSearchParams({
      orderId,
    });

    const response = await axios.get<ApiResponse<PaymentStatusData>>(
      `/api/payment/status?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        signal,
      },
    );

    const normalized =
      normalizeStatusPayload(response.data) ||
      (response.data.data
        ? {
            status: response.data.data.status,
            collection: response.data.data.collection,
          }
        : null);

    if (response.data.status === "ok" && normalized) {
      return {
        status: "ok",
        data: normalized,
      };
    }

    return {
      status: "error",
      data: normalized || { status: ApiPaymentStatus.PENDING },
      message: response.data.message || "Failed to fetch payment status",
      code: response.data.code,
    };
  } catch (error) {
    if (isCancelled(error)) {
      return {
        status: "error",
        cancelled: true,
        data: { status: ApiPaymentStatus.PENDING },
        message: "cancelled",
      };
    }

    console.error("Error fetching payment status");

    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch payment status";
      const normalized = normalizeStatusPayload(error.response?.data);
      return {
        status: "error",
        data: normalized || { status: ApiPaymentStatus.PENDING },
        message,
        code: error.response?.data?.code,
      };
    }

    return {
      status: "error",
      data: { status: ApiPaymentStatus.PENDING },
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch payment status",
    };
  }
}

export async function submitPaymentLinkCheckout(input: {
  paymentLinkId: string;
  requestId: string;
  paymentSource: PayerPayload;
  settlementCurrency: string;
}): Promise<CheckoutCallResult> {
  try {
    const response = await axios.post(
      "/api/payment/checkout",
      {
        paymentLinkId: input.paymentLinkId,
        requestId: input.requestId,
        paymentSource: {
          phoneNumber: input.paymentSource.phoneNumber,
          firstName: input.paymentSource.firstName,
          lastName: input.paymentSource.lastName,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const details: NormalizedCheckoutDetails | null = normalizeCheckoutSuccess(
      response.data?.data ?? response.data,
      input.settlementCurrency,
    );

    if (response.data?.status === "ok" && details) {
      return { ok: true, details };
    }

    const error = normalizeCheckoutError(
      response.data,
      response.status,
      response.data?.retryAfterSeconds,
    );
    if (!details) {
      error.reuseRequest = true;
      error.userMessage = error.userMessage || networkFailureMessage();
    }
    return { ok: false, error };
  } catch (error) {
    if (isCancelled(error)) {
      return {
        ok: false,
        error: normalizeCheckoutError(undefined, undefined, undefined, false),
      };
    }

    if (axios.isAxiosError(error)) {
      console.error("Checkout request failed", {
        status: error.response?.status,
        code: error.response?.data?.code,
      });
      return {
        ok: false,
        error: normalizeCheckoutError(
          error.response?.data,
          error.response?.status,
          error.response?.headers?.["retry-after"],
          !error.response,
        ),
      };
    }

    console.error("Checkout request failed");
    return {
      ok: false,
      error: normalizeCheckoutError(undefined, undefined, undefined, true),
    };
  }
}
