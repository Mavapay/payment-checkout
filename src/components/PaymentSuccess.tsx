"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatAmount } from "@/lib/amount";
import { PaymentData } from "@/types/payment";
import { Success } from "@/public/icons/success";
import { PaymentMethods } from "@/types/primitives";

interface PaymentSuccessProps {
  paymentData: PaymentData;
  onCloseCheckout: () => void;
}

export function PaymentSuccess({
  paymentData,
  onCloseCheckout,
}: PaymentSuccessProps) {
  const selectedMethod = paymentData.selectedMethod;
  return (
    <div className="space-y-4 md:space-y-6 min-h-[calc(100vh-20rem)] md:h-[calc(100vh-30rem)] flex items-center justify-center px-4">
      <Card className="shadow-none rounded-3xl border border-grey-dark-bg p-0 max-w-lg w-full mx-auto overflow-hidden">
        <div className="flex flex-col items-center space-y-4 md:space-y-6 px-4 md:px-6 py-8 md:py-12 max-w-sm mx-auto">
          <div className="flex justify-center">
            <Success className="w-20 h-20 md:w-24 md:h-24" />
          </div>

          <div className="text-center space-y-2 pb-3 md:pb-5">
            <h2 className="text-xl md:text-2xl font-bold font-sans text-green-accent-text">
              Payment Successful
            </h2>
            <p className="text-sm md:text-base font-normal font-inter text-[#666666] px-2">
              Your payment of{" "}
              <span>
                {selectedMethod?.type === PaymentMethods.BANKTRANSFER
                  ? formatAmount(
                      paymentData.bankTransferDetails?.amount || 0,
                      paymentData.bankTransferDetails?.currency || "",
                      paymentData.bankTransferDetails?.currencySymbol || ""
                    )
                  : `${paymentData.lightningInvoiceDetails?.satsAmount.toLocaleString()} SATS`}
              </span>{" "}
              to {paymentData.merchantName} was successful!
            </p>
          </div>

          <div className="w-full max-w-md pt-4 md:pt-6">
            <Button
              onClick={onCloseCheckout}
              className="w-full py-6 md:py-10 bg-green-primary-bg hover:bg-green-700 text-white font-semibold font-sans text-sm md:text-base rounded-sm cursor-pointer"
            >
              Close Checkout
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
