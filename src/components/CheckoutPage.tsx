"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import {
  fetchPaymentData,
  fetchPaymentStatus,
  refreshPayment,
} from "@/services/api";
import { PaymentData, PaymentMethod } from "@/types/payment";
import {
  ApiPaymentStatus,
  PaymentMethods,
  PaymentTypes,
} from "@/types/primitives";

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
import Image from "next/image";

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
  selectedMethod: PaymentMethod | null;
  onMethodSelect: (method: PaymentMethod) => void;
  isMethodSwitching: boolean;
}

const PaymentHeaderSection = ({
  paymentData,
  selectedMethod,
  onMethodSelect,
  isMethodSwitching,
}: PaymentHeaderSectionProps) => {
  return (
    <div className="md:border-b md:bg-white border-grey-dark-bg">
      <div className="max-w-7xl mx-auto hidden md:block">
        <PaymentHeader
          merchantName={paymentData.merchantName}
          merchantLogo={paymentData.merchantLogo}
        />
      </div>
      <div className="md:hidden max-w-7xl mx-auto">
        <PaymentMethodsComponent
          paymentMethods={paymentData.paymentMethods}
          selectedMethod={selectedMethod || undefined}
          onMethodSelect={onMethodSelect}
          isLoading={isMethodSwitching}
        />
      </div>
      <div className="md:hidden flex items-center justify-center mx-auto px-10">
        <div className="flex justify-between gap-x-4 w-fit pt-2 space-y-3">
          <div className="flex items-center justify-center flex-shrink-0">
            <Image
              src={paymentData.merchantLogo || "/icons/favicon.svg"}
              alt={`${paymentData.merchantName} logo`}
              width={100}
              height={32}
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="flex flex-col leading-5 text-[10px] text-left text-gray-600 font-sans font-normal">
            <p className="p-0 m-0">
              PAYMENT LINK FROM {paymentData.merchantName.toUpperCase()}
            </p>
            <p className="p-0 m-0">
              THIS LINK EXPIRES AFTER PAYMENT IS RECEIVED
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PaymentContentSectionProps {
  paymentData: PaymentData;
  selectedMethod: PaymentMethod | null;
  onMethodSelect: (method: PaymentMethod) => void;
  onPaymentConfirmed: () => void;
  onCancel: () => void;
  isMethodSwitching: boolean;
  isProcessing: boolean;
  onShowAccountNumber: () => void;
  onRefreshPayment: () => void;
  isPaymentExpired: boolean;
  setIsPaymentExpired: (isPaymentExpired: boolean) => void;
}

const PaymentContentSection = ({
  paymentData,
  selectedMethod,
  onMethodSelect,
  onPaymentConfirmed,
  onCancel,
  isMethodSwitching,
  isProcessing,
  onShowAccountNumber,
  onRefreshPayment,
  isPaymentExpired,
  setIsPaymentExpired,
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
    <div className="max-w-4xl mx-auto p-2 md:p-10 mt-0">
      <div className="flex flex-col md:flex-row px-2 md:px-0 justify-between border border-grey-dark-bg bg-white rounded-xl">
        <div className="space-y-6 hidden md:block">
          <PaymentMethodsComponent
            paymentMethods={paymentData.paymentMethods}
            selectedMethod={selectedMethod || undefined}
            onMethodSelect={onMethodSelect}
            isLoading={isMethodSwitching}
          />
        </div>

        <div className="md:space-y-6 md:py-8 flex flex-col justify-center items-center w-full">
          <p className="font-sans font-normal text-sm leading-6 tracking-normal py-2 md:px-0">
            {paymentData.description}
          </p>

          {isProcessing ? (
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
                isPaymentExpired={isPaymentExpired}
                setIsPaymentExpired={setIsPaymentExpired}
              />

              <PaymentActions
                paymentId={paymentData.paymentLinkId}
                onPaymentConfirmed={onPaymentConfirmed}
                onCancel={onCancel}
                onRefreshPayment={onRefreshPayment}
                isPaymentExpired={isPaymentExpired}
                setIsPaymentExpired={setIsPaymentExpired}
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
  const [isPaymentExpired, setIsPaymentExpired] = useState(false);
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

  useEffect(() => {
    if (!paymentData || isProcessing || isPaymentExpired) return;

    const autoProcessInterval = setInterval(() => {
      const checkPaymentStatus = async () => {
        const response = await fetchPaymentStatus(paymentData.orderId);
        if (
          response.status === "ok" &&
          response.data.status === ApiPaymentStatus.SETTLED
        ) {
          setIsProcessing(true);
          clearInterval(autoProcessInterval);
        }
      };
      checkPaymentStatus();
    }, 5000); // 5 seconds

    return () => {
      clearInterval(autoProcessInterval);
    };
  }, [paymentData, isProcessing, isPaymentExpired]);

  const handleRefreshPayment = async () => {
    if (!paymentData) return;
    if (!isPaymentExpired) return;
    try {
      setIsLoading(true);
      const response = await refreshPayment(
        paymentData.id,
        selectedMethod?.type ||
          paymentData.selectedMethod?.type ||
          PaymentMethods.LIGHTNING
      );
      if (response.status === "ok") {
        setPaymentData(response.data);
        setIsPaymentExpired(false);
      }
    } catch (err) {
      console.error("Error refreshing payment:", err);
      setError("Failed to refresh payment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodSelect = async (method: PaymentMethod) => {
    if (selectedMethod?.type === method.type) return;

    try {
      setIsMethodSwitching(true);
      setError(null);
      setIsPaymentExpired(false);

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
  };

  const handleShowAccountNumber = () => {
    // Go back to payment details view
    setIsProcessing(false);
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
      <PaymentHeaderSection
        paymentData={paymentData}
        selectedMethod={selectedMethod}
        onMethodSelect={handleMethodSelect}
        isMethodSwitching={isMethodSwitching}
      />

      <PaymentContentSection
        paymentData={paymentData}
        selectedMethod={selectedMethod}
        onMethodSelect={handleMethodSelect}
        onPaymentConfirmed={handlePaymentConfirmed}
        onCancel={handleCancel}
        isMethodSwitching={isMethodSwitching}
        isProcessing={isProcessing}
        onShowAccountNumber={handleShowAccountNumber}
        onRefreshPayment={handleRefreshPayment}
        isPaymentExpired={isPaymentExpired}
        setIsPaymentExpired={setIsPaymentExpired}
      />

      <PaymentFooter />
    </div>
  );
}
