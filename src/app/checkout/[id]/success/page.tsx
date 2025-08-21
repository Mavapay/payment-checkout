"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PaymentFooter, PaymentHeader } from "@/components";
import { PaymentSuccess } from "@/components/PaymentSuccess";
import { Spinner } from "@/components/Spinner";
import { Card } from "@/components/ui/card";
import { storage } from "@/lib/storage";
import { PaymentData } from "@/types/payment";
import { storageKeys } from "@/types/primitives";

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

const PaymentHeaderSection = ({
  paymentData,
}: {
  paymentData: PaymentData;
}) => (
  <div className="bg-white border-b border-grey-dark-bg">
    <div className="max-w-7xl mx-auto">
      <PaymentHeader
        merchantName={paymentData.merchantName}
        merchantLogo={paymentData.merchantLogo}
      />
    </div>
  </div>
);

export default function SuccessPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        setIsLoading(true);
        const item = await storage.getItem(storageKeys.paymentData);
        if (item) {
          const dataMatch = (item as PaymentData).id === paymentId;
          if (dataMatch) {
            setPaymentData(item as PaymentData);
          } else {
            setError("Unable to load payment data");
          }
          return;
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
    const timer = setTimeout(() => {
      handleCloseCheckout();
    }, 10000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCloseCheckout = async () => {
    const item = await storage.getItem(storageKeys.paymentData);
    const url = (item as PaymentData).callbackUrl || "/";
    router.push(url);
    storage.removeItem(storageKeys.paymentData);
  };

  if (isLoading) {
    return <Spinner message="Loading payment confirmation..." />;
  }

  if (error || !paymentData) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="min-h-screen bg-green-accent-bg">
      <PaymentHeaderSection paymentData={paymentData} />

      <div className="max-w-4xl mx-auto p-4 md:p-10">
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <PaymentSuccess
              paymentData={paymentData}
              onCloseCheckout={handleCloseCheckout}
            />
          </div>
        </div>
      </div>

      <PaymentFooter />
    </div>
  );
}
