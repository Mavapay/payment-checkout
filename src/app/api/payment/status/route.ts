import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { getPaymentEndpoints } from "@/config/endpoints";
import { ApiPaymentStatusType, ApiResponse } from "@/types/payment";
import { ApiPaymentStatus } from "@/types/primitives";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Order ID is required",
        },
        { status: 400 }
      );
    }

    const endpoints = getPaymentEndpoints({
      orderId,
    });

    const response = await axios.get<ApiResponse<{ status: ApiPaymentStatusType }>>(
      endpoints.getPaymentStatus,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const apiResponse = response.data;

    if (apiResponse.status === "success" || apiResponse.status === "ok") {
      return NextResponse.json({
        status: "ok",
        data: apiResponse.data as { status: ApiPaymentStatusType },
      });
    } else {
      throw new Error(apiResponse.message || "API returned error status");
    }
  } catch (error) {
    console.error("Error fetching payment status:", error);

    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch payment status";
      return NextResponse.json(
        {
          status: "error",
          message,
          data: { status: ApiPaymentStatus.PENDING }, // Default to pending on error
        },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch payment status",
        data: { status: ApiPaymentStatus.PENDING }, // Default to pending on error
      },
      { status: 500 }
    );
  }
}
