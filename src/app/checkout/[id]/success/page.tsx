"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PaymentSuccess } from "@/components/PaymentSuccess";
import { PaymentFooter, PaymentHeader } from "@/components";
import { Spinner } from "@/components/Spinner";
import { Card } from "@/components/ui/card";
import { fetchPaymentData } from "@/services/api";
import { PaymentData } from "@/types/payment";

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
        expiresAt={paymentData.expiresAt}
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
        const response = await fetchPaymentData(paymentId);

        if (response.status === "ok") {
          setPaymentData(response.data);
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

  const handleCloseCheckout = () => {
    // In a real app, you might redirect to merchant's website or a specific URL
    // For now, we'll redirect to the home page
    router.push("/");
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

      <div className="max-w-4xl mx-auto p-10">
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
