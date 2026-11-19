import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

import { getPaymentEndpoints } from "@/config/endpoints";
import { parseRetryAfterSeconds } from "@/lib/collection";
import { isCanonicalKenyanPhone } from "@/lib/phone";
import { normalizePersonName } from "@/lib/payer";

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const paymentLinkId =
      typeof body?.paymentLinkId === "string" ? body.paymentLinkId.trim() : "";
    const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
    const phoneNumber =
      typeof body?.paymentSource?.phoneNumber === "string"
        ? body.paymentSource.phoneNumber.trim()
        : "";
    const firstName = normalizePersonName(
      typeof body?.paymentSource?.firstName === "string"
        ? body.paymentSource.firstName
        : "",
    );
    const lastName = normalizePersonName(
      typeof body?.paymentSource?.lastName === "string"
        ? body.paymentSource.lastName
        : "",
    );

    if (!paymentLinkId || !REQUEST_ID_PATTERN.test(requestId)) {
      return NextResponse.json(
        {
          status: "error",
          message: "A valid payment attempt is required.",
        },
        { status: 400 },
      );
    }

    if (!isCanonicalKenyanPhone(phoneNumber) || !firstName || !lastName) {
      return NextResponse.json(
        {
          status: "error",
          message: "Enter a valid phone number, first name, and last name.",
        },
        { status: 400 },
      );
    }

    const endpoints = getPaymentEndpoints({ id: paymentLinkId });
    const response = await axios.post(
      endpoints.checkoutPayment,
      {
        requestId,
        paymentSource: {
          phoneNumber,
          firstName,
          lastName,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return NextResponse.json(
      {
        status: response.data?.status || "ok",
        message: response.data?.message,
        data: response.data?.data,
      },
      { status: response.status },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      console.error("Checkout request failed", {
        status: error.response?.status,
        code: data?.code,
      });
      return NextResponse.json(
        {
          status: "error",
          message: data?.message || "Failed to submit payment",
          code: data?.code || data?.error || data?.data?.code,
          data: data?.data ?? data,
          retryAfterSeconds: parseRetryAfterSeconds(
            error.response?.headers?.["retry-after"],
          ),
        },
        { status: error.response?.status || 500 },
      );
    }

    console.error("Checkout request failed");
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to submit payment",
      },
      { status: 500 },
    );
  }
}
