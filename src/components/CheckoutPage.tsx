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
  PaymentProcessing,
} from "./";
import { Spinner } from "./Spinner";
import { useRouter } from "next/navigation";

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
  isProcessing: boolean;
  showAccountDetails: boolean;
  onShowAccountNumber: () => void;
}

const PaymentContentSection = ({
  paymentData,
  selectedMethod,
  onMethodSelect,
  onPaymentConfirmed,
  onCancel,
  isMethodSwitching,
  isProcessing,
  showAccountDetails,
  onShowAccountNumber,
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

          {isProcessing && !showAccountDetails ? (
            <PaymentProcessing
              paymentData={paymentData}
              onShowAccountNumber={onShowAccountNumber}
            />
          ) : (
            <>
              <PaymentDetails
                details={paymentData}
                paymentType={paymentType()}
                isLoading={isMethodSwitching}
              />

              <PaymentActions
                paymentId={paymentData.paymentLinkId}
                onPaymentConfirmed={onPaymentConfirmed}
                onCancel={onCancel}
              />
            </>
          )}
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

  const handleMethodSelect = async (method: PaymentMethod) => {
    if (selectedMethod?.type === method.type) return;

    try {
      setIsMethodSwitching(true);
      setError(null);

      const response = await fetchPaymentData(paymentId, method.type);

      if (response.status === "ok") {
        setPaymentData(response.data);
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
    setIsProcessing(true);
    setShowAccountDetails(false);
  };

  const handleShowAccountNumber = () => {
    setShowAccountDetails(true);
  };

  const handleCancel = () => {
    router.push(paymentData?.callbackUrl || "/");
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
        isProcessing={isProcessing}
        showAccountDetails={showAccountDetails}
        onShowAccountNumber={handleShowAccountNumber}
      />

      <PaymentFooter />
    </div>
  );
}
