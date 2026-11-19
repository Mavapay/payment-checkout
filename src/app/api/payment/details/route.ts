import axios, { AxiosResponse } from "axios";
import { NextRequest, NextResponse } from "next/server";

import { getPaymentEndpoints } from "@/config/endpoints";
import { transformPaymentLink } from "@/lib/payment-link";
import {
  ApiPaymentData,
  ApiResponse,
  PaymentData,
  PaymentMethodType,
} from "@/types/payment";
import { PaymentMethods } from "@/types/primitives";

const errorBody = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    return {
      status: error.response?.status || 500,
      body: {
        status: "error" as const,
        message: data?.message || error.message || fallback,
        code: data?.code,
        data: data?.data,
      },
    };
  }

  return {
    status: 500,
    body: {
      status: "error" as const,
      message: error instanceof Error ? error.message : fallback,
    },
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("id");
    const paymentMethod = searchParams.get("paymentMethod");
    const refreshPayment = searchParams.get("refreshPayment");

    if (!paymentId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Payment ID is required",
        },
        { status: 400 },
      );
    }

    if (paymentMethod) {
      if (
        !Object.values(PaymentMethods).includes(
          paymentMethod.toUpperCase() as PaymentMethodType,
        )
      ) {
        return NextResponse.json(
          {
            status: "error",
            message: `Invalid payment method. Please use ${Object.values(
              PaymentMethods,
            ).join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    if (refreshPayment) {
      if (refreshPayment !== "true" && refreshPayment !== "false") {
        return NextResponse.json(
          {
            status: "error",
            message: "Refresh payment must be a boolean",
          },
          { status: 400 },
        );
      }
    }

    const endpoints = getPaymentEndpoints({
      id: paymentId,
      paymentMethod: paymentMethod?.toUpperCase() as PaymentMethodType,
    });

    let response: AxiosResponse<ApiResponse<ApiPaymentData>>;
    if (refreshPayment) {
      response = await axios.get<ApiResponse<ApiPaymentData>>(
        endpoints.refreshPayment,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    } else {
      response = await axios.get<ApiResponse<ApiPaymentData>>(
        endpoints.getPaymentDetails,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const apiResponse = response.data;

    if (apiResponse.status === "ok" && response.status === 200) {
      const transformedData: PaymentData = transformPaymentLink(
        apiResponse.data,
        paymentMethod?.toUpperCase() as PaymentMethodType,
      );
      return NextResponse.json({
        status: "ok",
        data: transformedData,
      });
    }

    throw new Error(apiResponse.message || "API returned error status");
  } catch (error) {
    console.error("Error fetching payment data");
    const formatted = errorBody(error, "Failed to fetch payment data");
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
