import {
  formatAmountToHighestDenomination,
  getCurrencySymbol,
} from "@/lib/utils";
import {
  ApiPaymentData,
  ApiResponse,
  BankTransferDetails,
  PaymentData,
  PaymentMethod,
} from "@/types/payment";
import { PaymentMethods } from "@/types/primitives";

// Helper function to convert kobo/cent to main currency
const convertToMainCurrency = (amount: number, currency: string): number => {
  if (currency === "NGNKOBO" || currency === "ZARCENT") {
    return amount / 100; // Convert kobo/cent to naira/rand
  }
  return amount;
};

// Transform API data to internal format
const transformApiData = (
  apiData: ApiPaymentData,
  merchantLogo?: string
): PaymentData => {
  // Build available payment methods based on what's supported
  const availablePaymentMethods: PaymentMethod[] = [
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      type: PaymentMethods.BANKTRANSFER,
    },
  ];

  // Add Lightning method only if invoice is available
  if (apiData.invoice) {
    availablePaymentMethods.push({
      id: "lightning_invoice",
      name: "Lightning Invoice",
      type: PaymentMethods.LIGHTNING,
    });
  }

  // Default priority: Lightning > Bank Transfer
  const getDefaultMethod = () => {
    const lightningMethod = availablePaymentMethods.find(m => m.type === PaymentMethods.LIGHTNING);
    const bankTransferMethod = availablePaymentMethods.find(m => m.type === PaymentMethods.BANKTRANSFER);
    
    return lightningMethod || bankTransferMethod || availablePaymentMethods[0];
  };

  const selectedMethod =
    availablePaymentMethods.find(
      (method) => method.type === apiData.paymentMethod
    ) || getDefaultMethod();

  const bankTransferDetails: BankTransferDetails | undefined =
    apiData.paymentMethod === PaymentMethods.BANKTRANSFER
      ? {
          bankName: apiData.bankName,
          accountNumber: apiData.ngnBankAccountNumber,
          accountName: apiData.ngnAccountName,
          amount: formatAmountToHighestDenomination(
            apiData.amountInSourceCurrency,
            apiData.sourceCurrency
          ),
          currency: getCurrencySymbol(apiData.sourceCurrency),
          expiresAt: apiData.expiry,
          orderId: apiData.orderId,
        }
      : undefined;

  return {
    id: apiData.id,
    merchantName: apiData?.merchantName,
    merchantLogo:
      merchantLogo ||
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAiCAYAAADI+15nAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAARHSURBVHgB5VrtkdQ4EH1M3f+bi4C+CG4zOBEBm8GaCNgMxkSwSwRjIgAi8BABSwQ2EewSAVhlq9D2PH3afFTxqrrGlrqlVqu73bIH+Pk44vdBM5HBCjxZfmWinvQ/TPR+orvlOgZmmDcTtd69Web5h4xnvOv9RDeq/8NEnWrbL3JPJxon+jTRabnOQb/IXGMlZKKvHt1j3p1cvFTyjkTxHZf2FmX6fEXccy1/p3gFeXPYte6xEuJNPiA9uZYdcL7gW8J7v/T1GWOWGNDhFo+d4DLC23i8l1gJQZ3xLI44Xywbp1E8Bml9Sg1oPeleyV0FeP1NT21oErIM1KAMAh66DeF9i7SHxsbNMaBFi/N0JIrngoy/KowF846U4iO497HxNd894vrUGtAgnU5Y1LSowM67fo0yNJh3UuMZabO7eyJtBtvjjrQ9V/dfCM//WAFB+WL8HJLyEmvoa8L/FmF9aj0Q4GnF14XlylRejkJQlgMO4CEpgbHd+ExmH5D5UQY0y2+HdKhno8R4Aq5gG+D3S4SeyF1nzrHGgMPSbtfp0o4B39AfjmNEQQajrrVsT2QE9QZknu42SefsTcM4B5fIL1ssRN2Hcs+eyG31FB4i+rTIz8ubYEDZwgxpu0U6/KVwHh9+hAz4bjRBXj24ydGOoQH3Pgnw+/nGh0E6BQjqDCiK3zfERUCmRzjkN4OAe18bkTGRPjaWUfOVGNAa6oC5BrwNzG0Csqy86pGJXSafVU5U24jz10s+HiJ9b0hb6kD/L2YjiCIr12B+RTYseo1K1nrfXWDcjrQZbBjGgrIHh5ORSH+qJhTUh7Dz7t7T0STkWBi32Ahs8CEhI6gb13jyNQa0sJvgn9FvkNbHoHyNWWhQ9uDwFUohlnsE9QZ08/uyhwT/5kc7hwHlC3FnzRRiNaFUzJvSvUnws/IqebT7K9Jnd01U2zjRK8SRa0CLE84fHs1E77AeIx7rf0D8Wwnru8KcC2MPRAoBD902UzYXBjyMBes9sEd5SNbIUBxRl1RZsSoR/lAYsyPjFgZMFcjFNSGrAw14vkiFrkXo1VQINjRqasIcsLBLpZYO/HNrUI4Z8BgYuEMcdpKRtF8k5Fi+u8KvgfsOrtGEBHaEUQhfjvcJ+AkgtesnVCTpDAjq0JG25yHmnZrwQHis8UakwYzwEnko/R6TgoB7Ug5O4GFsGLNvwFDZ0iENCbQ1yEOHbSE4/4hVArahhjHuvAkb0p/rfVB8grKP1SPWLdiHSxn25cFDoC+FE2mj0eQMeEP6RuR7hq+Y4HstV4LakNOwefeE2Xjak/5DHk4o+AzboO686+D4DPjXujZvmGBNWFoH6qe+rgcFXH+N6xwd7N/bWsx/D/MRepwzyEJPA/12nHcJWQdb//0d4P2Mx14xLqTffNt7F7oujFvMpZEsMi+W34vl170rNGocvRkPUO8Vn+DPgsHjHDliJb4BHBJc030hTZgAAAAASUVORK5CYII=",
    description: `Payment for order ${apiData.orderId}`,
    amount: convertToMainCurrency(
      apiData.amountInSourceCurrency,
      apiData.sourceCurrency
    ),
    totalAmount: convertToMainCurrency(
      apiData.totalAmountInSourceCurrency,
      apiData.sourceCurrency
    ),
    fees: convertToMainCurrency(
      apiData.transactionFeesInSourceCurrency,
      apiData.sourceCurrency
    ),
    currency: getCurrencySymbol(apiData.sourceCurrency),
    targetCurrency: getCurrencySymbol(apiData.targetCurrency),
    expiresAt: apiData.expiry,
    paymentMethods: availablePaymentMethods,
    selectedMethod,
    bankTransferDetails,
    lightningInvoiceDetails: apiData.invoice ? {
      invoice: apiData.invoice,
      amount: convertToMainCurrency(apiData.totalAmountInSourceCurrency, apiData.sourceCurrency),
      currency: getCurrencySymbol(apiData.sourceCurrency),
      satsAmount: 126248, // Convert from amount - this would be calculated from the invoice
      expiresAt: apiData.expiry,
      qrCodeData: apiData.invoice,
    } : undefined,
    status: apiData.isValid ? "pending" : "expired",
    orderId: apiData.orderId,
    exchangeRate: apiData.exchangeRate,
    hash: apiData.hash,
  };
};

// Mock API data to match the original design image
const mockApiData: ApiPaymentData = {
  id: "808a172a-082d-45f5-b410-14d93c58245e",
  exchangeRate: 2063641.875,
  usdToTargetCurrencyRate: 17.5708238,
  sourceToTargetCurrencyRate: 87.84,
  sourceCurrency: "NGNKOBO",
  targetCurrency: "BTCSAT",
  transactionFeesInSourceCurrency: 0,
  transactionFeesInTargetCurrency: 0,
  amountInSourceCurrency: 95_000_000, // 950,000.00 NGN in kobo
  amountInTargetCurrency: 95_000, // 950,000.00 BTC in satoshis
  paymentMethod: "BANKTRANSFER",
  expiry: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
  isValid: true,
  invoice: "lntbs1u1p52f24wpp5m2ncw230r7zhluz5zucqmyz6zl8va9w5rry7ap6w5vrdszntq7hsdz4f4shvctsv9ujq3r9wphhx6t58gsxzv3cv3nrgeph94jrwwp3956r2cnr95uxgerz956k2wtpvvcrwv3h8ymnycqzpuxqyp2xqsp55lh6nh3pdtkuwtw4y0m6rpkskkrnu8d3a7efsr79c0p0cehp78pq9qxpqysgqv9gr2cp2vmuvrndmn9p9lfutp45jcesfdwp3yzakeeu5h42vjq2476nr3nmy9y84f0ztzwfuws0mjeknrlevef3j3t0y7vrecjgcj3sqp6yvxs",
  hash: "689e426b86037b0012075e28",
  totalAmountInSourceCurrency: 95_000_000, // 950,000.00 NGN in kobo
  customerInternalFee: 0,
  bankName: "Guaranty TrustBank",
  ngnBankAccountNumber: "2008113584",
  ngnAccountName: "Mava Digital Solutions Limited",
  orderId: "17491-4010",
  merchantName: "ZARA",
};

export async function fetchPaymentData(
  paymentId: string,
  paymentMethod?: string,
  merchantLogo?: string
): Promise<ApiResponse<PaymentData>> {
  try {
    // Real API implementation - uncomment and modify for production:
    /*
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/payments/${paymentId}`);
    if (paymentMethod) {
      url.searchParams.append('paymentMethod', paymentMethod);
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers if needed
        // 'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const apiResponse: ApiResponse<ApiPaymentData> = await response.json();
    
    if (apiResponse.status === 'ok') {
      const transformedData = transformApiData(apiResponse.data, merchantLogo);
      return {
        status: 'ok',
        data: transformedData,
      };
    } else {
      throw new Error(apiResponse.message || 'API returned error status');
    }
    */

    // For demo purposes, simulate API delay and return mock data
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Simulate different responses based on payment method
    const responseData = { ...mockApiData };
    
    // Always keep the invoice available so Lightning remains an option
    responseData.invoice = "lnbc10760n1pnyx5x8x3sqq6s7mw";
    
    if (paymentMethod === PaymentMethods.LIGHTNING) {
      // Set Lightning as the current method
      responseData.paymentMethod = PaymentMethods.LIGHTNING;
    } else if (paymentMethod === PaymentMethods.BANKTRANSFER) {
      // Set Bank Transfer as the current method
      responseData.paymentMethod = PaymentMethods.BANKTRANSFER;
    }
    // If no specific method requested, use default (Lightning if available, otherwise bank transfer)
    
    const transformedData = transformApiData(responseData, merchantLogo);

    return {
      status: "ok",
      data: transformedData,
    };
  } catch (error) {
    console.error("Error fetching payment data:", error);
    return {
      status: "error",
      data: transformApiData(mockApiData, merchantLogo), // Fallback
      message:
        error instanceof Error ? error.message : "Failed to fetch payment data",
    };
  }
}

export async function confirmPayment(
  _paymentId: string
): Promise<ApiResponse<{ status: string }>> {
  try {
    // Real API implementation - uncomment and modify for production:
    /*
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/${paymentId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers if needed
        // 'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        paymentId,
        // Add any additional confirmation data
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const apiResponse: ApiResponse<{ status: string }> = await response.json();
    return apiResponse;
    */

    // For demo purposes, simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      status: "ok",
      data: { status: "confirmed" },
    };
  } catch (error) {
    console.error("Error confirming payment:", error);
    return {
      status: "error",
      data: { status: "error" },
      message:
        error instanceof Error ? error.message : "Failed to confirm payment",
    };
  }
}
