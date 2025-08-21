import axios from "axios";
import {
  ApiResponse,
  PaymentData,
  PaymentMethodType,
  PaymentStatusResponse,
} from "@/types/payment";

export async function fetchPaymentData(
  paymentId: string,
  paymentMethod?: string
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
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching payment data:", error);

    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch payment data";
      return {
        status: "error",
        data: {} as PaymentData,
        message,
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
  paymentMethod: PaymentMethodType
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
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error confirming payment:", error);
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to confirm payment";
      return {
        status: "error",
        data: {} as PaymentData,
        message,
      };
    }

    return {
      status: "error",
      data: {} as PaymentData,
      message:
        error instanceof Error ? error.message : "Failed to confirm payment",
    };
  }
}

export async function fetchPaymentStatus(
  orderId: string
): Promise<ApiResponse<PaymentStatusResponse>> {
  try {
    const params = new URLSearchParams({
      orderId,
    });

    const response = await axios.get<ApiResponse<PaymentStatusResponse>>(
      `/api/payment/status?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching payment status:", error);

    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch payment status";
      return {
        status: "error",
        data: { status: "PENDING" }, // Default to pending on error
        message,
      };
    }

    return {
      status: "error",
      data: { status: "PENDING" }, // Default to pending on error
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch payment status",
    };
  }
}
