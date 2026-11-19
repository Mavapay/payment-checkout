import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

import { getPaymentEndpoints } from "@/config/endpoints";
import { normalizeStatusPayload } from "@/lib/collection";
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
        { status: 400 },
      );
    }

    const endpoints = getPaymentEndpoints({
      orderId,
    });

    const response = await axios.get(endpoints.getPaymentStatus, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const apiResponse = response.data;
    const normalized = normalizeStatusPayload(apiResponse);

    if (
      (apiResponse.status === "success" || apiResponse.status === "ok") &&
      normalized
    ) {
      return NextResponse.json({
        status: "ok",
        data: normalized,
      });
    }

    throw new Error(apiResponse.message || "API returned error status");
  } catch (error) {
    console.error("Error fetching payment status");

    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      const normalized = normalizeStatusPayload(data);
      return NextResponse.json(
        {
          status: "error",
          message: data?.message || error.message || "Failed to fetch payment status",
          code: data?.code,
          data: normalized || {
            status: ApiPaymentStatus.PENDING,
            collection: undefined,
          },
        },
        { status: error.response?.status || 500 },
      );
    }

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch payment status",
        data: { status: ApiPaymentStatus.PENDING },
      },
      { status: 500 },
    );
  }
}
