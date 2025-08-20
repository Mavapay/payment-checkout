import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { getPaymentEndpoints } from "@/config/endpoints";
import {
  ApiPaymentData,
  ApiResponse,
  BankTransferDetails,
  LightningInvoiceDetails,
  PaymentData,
  PaymentMethod,
  PaymentMethodType,
} from "@/types/payment";
import {
  PaymentMethods,
  precisionByTransactionCurrency,
  TransactionCurrencies,
} from "@/types/primitives";
import { getCurrencySymbol } from "@/lib/utils";

// Transform API data to internal format
const transformApiData = (
  apiData: ApiPaymentData,
  requestedPaymentMethod?: PaymentMethodType,
  merchantLogo?: string
): PaymentData => {
  const details = apiData.paymentLinkDetails;

  // Build available payment methods based on what's supported
  const availablePaymentMethods: PaymentMethod[] = [];

  if (details.paymentMethods.includes(PaymentMethods.BANKTRANSFER)) {
    availablePaymentMethods.push({
      id: "bank_transfer",
      name: "Bank Transfer",
      type: PaymentMethods.BANKTRANSFER,
    });
  }

  if (details.paymentMethods.includes(PaymentMethods.LIGHTNING)) {
    availablePaymentMethods.push({
      id: "lightning_invoice",
      name: "Lightning Invoice",
      type: PaymentMethods.LIGHTNING,
    });
  }

  const getDefaultMethod = () => {
    const lightningMethod = availablePaymentMethods.find(
      (m) => m.type === PaymentMethods.LIGHTNING
    );
    const bankTransferMethod = availablePaymentMethods.find(
      (m) => m.type === PaymentMethods.BANKTRANSFER
    );

    if (requestedPaymentMethod) {
      const method = availablePaymentMethods.find(
        (m) => m.type === requestedPaymentMethod
      );
      return method!;
    }
    if (details.LIGHTNING && lightningMethod) {
      return lightningMethod!;
    }
    if (details.BANKTRANSFER && bankTransferMethod) {
      return bankTransferMethod!;
    }
    return availablePaymentMethods[0];
  };

  // Determine selected method based on request or default
  let selectedMethod: PaymentMethod;
  if (requestedPaymentMethod) {
    selectedMethod = getDefaultMethod();
  } else {
    selectedMethod = getDefaultMethod();
  }

  // Build bank transfer details if available (regardless of selected method)
  const bankTransferDetails: BankTransferDetails | undefined =
    details.BANKTRANSFER
      ? {
          bankName: details.BANKTRANSFER.ngnBankName,
          accountNumber: details.BANKTRANSFER.ngnBankAccountNumber,
          accountName: details.BANKTRANSFER.ngnAccountName,
          amount:
            details.BANKTRANSFER.amount /
            precisionByTransactionCurrency[TransactionCurrencies.NGNKOBO],
          targetAmount: details.BANKTRANSFER.targetAmount,
          currencySymbol: getCurrencySymbol(TransactionCurrencies.NGNKOBO), // NGN symbol TODO: use currency from the API to determine the currency symbol
          currency: TransactionCurrencies.NGNKOBO,
          expiresAt: details.BANKTRANSFER.expiresAt,
        }
      : undefined;

  // Build lightning details if available (regardless of selected method)
  const lightningInvoiceDetails: LightningInvoiceDetails | undefined =
    details.LIGHTNING
      ? {
          invoice: details.LIGHTNING.invoice,
          amount:
            details.LIGHTNING.amount /
            precisionByTransactionCurrency[TransactionCurrencies.BTCSAT],
          targetAmount: details.LIGHTNING.targetAmount,
          currencySymbol: getCurrencySymbol(TransactionCurrencies.BTCSAT),
          currency: details.settlementCurrency,
          satsAmount: details.LIGHTNING.amount,
          expiresAt: details.LIGHTNING.expiresAt,
          qrCodeData: details.LIGHTNING.invoice,
        }
      : undefined;

  // Determine amount and expiry based on selected method
  const amount =
    selectedMethod.type === PaymentMethods.LIGHTNING
      ? details.LIGHTNING?.amount || 0
      : (details.BANKTRANSFER?.amount || 0) /
        precisionByTransactionCurrency[TransactionCurrencies.NGNKOBO];

  const expiresAt =
    selectedMethod.type === PaymentMethods.LIGHTNING
      ? details.LIGHTNING?.expiresAt || ""
      : details.BANKTRANSFER?.expiresAt || "";

  return {
    id: details.id,
    merchantName: details.account.name,
    merchantLogo: details.account.logo || merchantLogo || "",
    description: details.description,
    amount,
    settlementCurrency: details.settlementCurrency,
    expiresAt,
    paymentMethods: availablePaymentMethods,
    selectedMethod,
    bankTransferDetails,
    lightningInvoiceDetails,
    status: "pending", // Always pending for new payments
    orderId: details.paymentLinkOrderId,
    callbackUrl: details.callbackUrl,
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("id");
    const paymentMethod = searchParams.get("paymentMethod");

    if (!paymentId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Payment ID is required",
        },
        { status: 400 }
      );
    }

    if (paymentMethod) {
      // ensure the payment method is valid
      if (
        !Object.values(PaymentMethods).includes(
          paymentMethod.toUpperCase() as PaymentMethodType
        )
      ) {
        return NextResponse.json(
          {
            status: "error",
            message: `Invalid payment method. Please use ${Object.values(
              PaymentMethods
            ).join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    const endpoints = getPaymentEndpoints({
      id: paymentId,
      paymentMethod: paymentMethod?.toUpperCase() as PaymentMethodType,
    });

    const response = await axios.get<ApiResponse<ApiPaymentData>>(
      endpoints.getPaymentDetails,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const apiResponse = response.data;

    if (apiResponse.status === "ok" && response.status === 200) {
      const transformedData = transformApiData(
        apiResponse.data,
        paymentMethod?.toUpperCase() as PaymentMethodType
      );
      return NextResponse.json({
        status: "ok",
        data: transformedData,
      });
    } else {
      throw new Error(apiResponse.message || "API returned error status");
    }
  } catch (error) {
    console.error("Error fetching payment data:", error);
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch payment data";
      return NextResponse.json(
        {
          status: "error",
          message,
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
            : "Failed to fetch payment data",
      },
      { status: 500 }
    );
  }
}
