"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatAmount } from "@/lib/utils";
import { PaymentData } from "@/types/payment";
import { Success } from "@/public/icons/success";

interface PaymentSuccessProps {
  paymentData: PaymentData;
  onCloseCheckout: () => void;
}

export function PaymentSuccess({
  paymentData,
  onCloseCheckout,
}: PaymentSuccessProps) {
  return (
    <div className="space-y-6 h-[calc(100vh-30rem)] flex items-center justify-center">
      <Card className="shadow-none rounded-3xl border border-grey-dark-bg p-0 max-w-lg w-full mx-auto overflow-hidden">
        <div className="flex flex-col items-center space-y-6 px-6 py-12 max-w-sm mx-auto">
          <div className="flex justify-center">
            <Success className="w-24 h-24" />
          </div>

          <div className="text-center space-y-2 pb-5">
            <h2 className="text-2xl font-bold font-sans text-green-accent-text">
              Payment Successful
            </h2>
            <p className="text-base font-normal font-inter text-[#666666]">
              Your payment of{" "}
              <span>
                {formatAmount(
                  paymentData.amount,
                  paymentData.settlementCurrency,
                  paymentData.bankTransferDetails?.currencySymbol ||
                    paymentData.lightningInvoiceDetails?.currencySymbol ||
                    ""
                )}
              </span>{" "}
              to {paymentData.merchantName} was successful!
            </p>
          </div>

          <div className="w-full max-w-md pt-6">
            <Button
              onClick={onCloseCheckout}
              className="w-full py-10 bg-green-primary-bg hover:bg-green-700 text-white font-semibold font-sans text-base rounded-sm cursor-pointer"
            >
              Close Checkout
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
