"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchPaymentStatus } from "@/services/api";

interface PaymentActionsProps {
  paymentId: string;
  onPaymentConfirmed: () => void;
  onCancel: () => void;
  onRefreshPayment: () => void;
  isPaymentExpired: boolean;
  setIsPaymentExpired: (isPaymentExpired: boolean) => void;
}

export function PaymentActions({
  paymentId,
  onPaymentConfirmed,
  onCancel,
  onRefreshPayment,
  isPaymentExpired,
  setIsPaymentExpired,
}: PaymentActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmPayment = async () => {
    setIsConfirming(true);
    try {
      const result = await fetchPaymentStatus(paymentId);
      if (result.status === "ok") {
        onPaymentConfirmed();
      } else {
        console.error("Payment confirmation failed:", result.message);
      }
    } catch (error) {
      console.error("Payment confirmation error:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRefreshPayment = async () => {
    onRefreshPayment();
    setIsPaymentExpired(false);
  };

  const secondButtonText = isPaymentExpired
    ? "Refresh Payment"
    : isConfirming
    ? "Processing..."
    : "I have Paid";

  return (
    <div className="flex gap-4 px-8 justify-center">
      <Button
        variant="outline"
        onClick={onCancel}
        className="flex-1 rounded-none py-10 px-18 w-full font-sans text-base font-medium text-black-text border-grey-dark-bg hover:text-red-primary-text hover:bg-red-accent-bg-light cursor-pointer"
        disabled={isConfirming}
      >
        Cancel
      </Button>

      <Button
        onClick={isPaymentExpired ? handleRefreshPayment : handleConfirmPayment}
        disabled={isConfirming}
        className="flex-1 rounded-none py-10 px-18 w-full font-sans text-base font-medium text-white bg-green-600 hover:bg-green-700 cursor-pointer"
      >
        {secondButtonText}
      </Button>
    </div>
  );
}
