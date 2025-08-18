"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { fetchPaymentData } from "@/services/api";
import {
  PaymentData,
  PaymentMethod,
  PaymentMethods as PaymentMethodsEnum,
} from "@/types/payment";

import {
  PaymentActions,
  PaymentFooter,
  PaymentHeader,
  PaymentMethods,
  BankTransferDetails,
} from "./";
import { Spinner } from "./Spinner";

interface CheckoutPageProps {
  paymentId: string;
}

export function CheckoutPage({ paymentId }: CheckoutPageProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        setIsLoading(true);
        const response = await fetchPaymentData(paymentId);

        if (response.status === "ok") {
          setPaymentData(response.data);
          setSelectedMethod(
            response.data.selectedMethod || response.data.paymentMethods[0]
          );
        } else {
          setError(response.message || "Failed to load payment data");
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Error loading payment data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (paymentId) {
      loadPaymentData();
    }
  }, [paymentId]);

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  const handlePaymentConfirmed = () => {
    // In a real app, you might redirect to a success page or show a success message
    alert("Payment confirmed! Thank you.");
  };

  const handleCancel = () => {
    // In a real app, you might redirect back to the merchant or show a cancellation page
    alert("Payment cancelled");
  };

  if (isLoading) {
    return <Spinner message="Loading payment details..." />;
  }

  if (error || !paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center text-red-600">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{error || "Payment not found"}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-accent-bg">
      <div className="bg-white border-b border-grey-dark-bg">
        <div className="max-w-7xl mx-auto">
          <PaymentHeader
            merchantName={paymentData.merchantName}
            merchantLogo={paymentData.merchantLogo}
            expiresAt={paymentData.expiresAt}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-10">
        <div className="flex justify-between border border-grey-dark-bg bg-white rounded-xl">
          <div className="space-y-6">
            <PaymentMethods
              paymentMethods={paymentData.paymentMethods}
              selectedMethod={selectedMethod || undefined}
              onMethodSelect={handleMethodSelect}
            />
          </div>

          <div className="space-y-6 py-8 flex flex-col justify-center items-center w-full">
            <p className="font-sans font-normal text-sm leading-6 tracking-normal">
              {paymentData.description}
            </p>

            {paymentData.bankTransferDetails && (
              <BankTransferDetails details={paymentData.bankTransferDetails} />
            )}
            <div className="">
              <PaymentActions
                paymentId={paymentData.id}
                onPaymentConfirmed={handlePaymentConfirmed}
                onCancel={handleCancel}
              />
            </div>
          </div>
        </div>
      </div>

      <PaymentFooter />
    </div>
  );
}
