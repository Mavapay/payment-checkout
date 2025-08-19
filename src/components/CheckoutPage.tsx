"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { fetchPaymentData } from "@/services/api";
import { PaymentData, PaymentMethod } from "@/types/payment";
import { PaymentMethods, PaymentTypes } from "@/types/primitives";

import {
  PaymentActions,
  PaymentDetails,
  PaymentFooter,
  PaymentHeader,
  PaymentMethods as PaymentMethodsComponent,
} from "./";
import { Spinner } from "./Spinner";

interface CheckoutPageProps {
  paymentId: string;
}

interface ErrorDisplayProps {
  error: string | null;
}

const ErrorDisplay = ({ error }: ErrorDisplayProps) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <Card className="p-8 max-w-md w-full mx-4">
      <div className="text-center text-red-primary-text">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>{error || "Payment not found"}</p>
      </div>
    </Card>
  </div>
);

interface PaymentHeaderSectionProps {
  paymentData: PaymentData;
}

const PaymentHeaderSection = ({ paymentData }: PaymentHeaderSectionProps) => (
  <div className="bg-white border-b border-grey-dark-bg">
    <div className="max-w-7xl mx-auto">
      <PaymentHeader
        merchantName={paymentData.merchantName}
        merchantLogo={paymentData.merchantLogo}
        expiresAt={paymentData.expiresAt}
      />
    </div>
  </div>
);

interface PaymentContentSectionProps {
  paymentData: PaymentData;
  selectedMethod: PaymentMethod | null;
  onMethodSelect: (method: PaymentMethod) => void;
  onPaymentConfirmed: () => void;
  onCancel: () => void;
  isMethodSwitching: boolean;
}

const PaymentContentSection = ({
  paymentData,
  selectedMethod,
  onMethodSelect,
  onPaymentConfirmed,
  onCancel,
  isMethodSwitching,
}: PaymentContentSectionProps) => {
  if (!selectedMethod) {
    return <Spinner message="Loading payment details..." />;
  }
  const paymentType = () => {
    if (selectedMethod?.type === PaymentMethods.BANKTRANSFER) {
      return PaymentTypes.BANKTRANSFER;
    }
    return PaymentTypes.LIGHTNING;
  };

  return (
    <div className="max-w-4xl mx-auto p-10">
      <div className="flex justify-between border border-grey-dark-bg bg-white rounded-xl">
        <div className="space-y-6">
          <PaymentMethodsComponent
            paymentMethods={paymentData.paymentMethods}
            selectedMethod={selectedMethod || undefined}
            onMethodSelect={onMethodSelect}
            isLoading={isMethodSwitching}
          />
        </div>

        <div className="space-y-6 py-8 flex flex-col justify-center items-center w-full">
          <p className="font-sans font-normal text-sm leading-6 tracking-normal">
            {paymentData.description}
          </p>
          <PaymentDetails
            details={paymentData}
            paymentType={paymentType()}
            isLoading={isMethodSwitching}
          />
          <div className="">
            <PaymentActions
              paymentId={paymentData.id}
              onPaymentConfirmed={onPaymentConfirmed}
              onCancel={onCancel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export function CheckoutPage({ paymentId }: CheckoutPageProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMethodSwitching, setIsMethodSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        setIsLoading(true);
        const response = await fetchPaymentData(paymentId);

        if (response.status === "ok") {
          setPaymentData(response.data);
          // Use the selectedMethod from API response (which follows Lightning > Bank Transfer priority)
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

  const handleMethodSelect = async (method: PaymentMethod) => {
    if (selectedMethod?.type === method.type) return;

    try {
      setIsMethodSwitching(true);
      setError(null); // Clear any previous errors

      // Fetch payment data for the selected method
      const response = await fetchPaymentData(paymentId, method.type);

      if (response.status === "ok") {
        setPaymentData(response.data);
        // The selected method should match what we requested
        const newSelectedMethod =
          response.data.paymentMethods.find((m) => m.type === method.type) ||
          method;
        setSelectedMethod(newSelectedMethod);
      } else {
        setError(response.message || "Failed to load payment method data");
      }
    } catch (err) {
      console.error("Error switching payment method:", err);
      setError("Failed to switch payment method");
    } finally {
      setIsMethodSwitching(false);
    }
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
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="min-h-screen bg-green-accent-bg">
      <PaymentHeaderSection paymentData={paymentData} />

      <PaymentContentSection
        paymentData={paymentData}
        selectedMethod={selectedMethod}
        onMethodSelect={handleMethodSelect}
        onPaymentConfirmed={handlePaymentConfirmed}
        onCancel={handleCancel}
        isMethodSwitching={isMethodSwitching}
      />

      <PaymentFooter />
    </div>
  );
}
