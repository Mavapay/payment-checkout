"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatAmount } from "@/lib";
import { Check, Hourglass } from "@/public/icons";
import { fetchPaymentStatus } from "@/services/api";
import { PaymentData, ProcessingStatusType } from "@/types/payment";
import {
  ApiPaymentStatus,
  PaymentMethods,
  ProcessingStatus,
  storageKeys,
} from "@/types/primitives";
import { storage } from "@/lib/storage";

interface PaymentProcessingProps {
  paymentData: PaymentData;
  onShowAccountNumber: () => void;
}

interface ProcessingStep {
  id: ProcessingStatusType;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  active: boolean;
}

export function PaymentProcessing({
  paymentData,
  onShowAccountNumber,
}: PaymentProcessingProps) {
  const router = useRouter();

  const [showSpinner, setShowSpinner] = useState(true);
  const alternatingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentStatus, setCurrentStatus] = useState<ProcessingStatusType>(
    ProcessingStatus.SENT
  );

  useEffect(() => {
    let statusCheckInterval: NodeJS.Timeout;

    const checkPaymentStatus = async () => {
      try {
        const response = await fetchPaymentStatus(paymentData.orderId);

        if (response.status === "ok") {
          const apiStatus = response.data.status;

          switch (apiStatus) {
            case ApiPaymentStatus.PENDING:
              await storage.setItem(storageKeys.paymentData, paymentData);
              if (currentStatus === ProcessingStatus.SENT) {
                setTimeout(() => setCurrentStatus("confirming"), 2000);
              }
              break;
            case ApiPaymentStatus.SUCCESS:
              setCurrentStatus("received");
              await storage.setItem(storageKeys.paymentData, paymentData);
              setTimeout(() => {
                router.push(`/checkout/${paymentData.id}/success`);
              }, 2000);
              if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
              }
              break;
            case ApiPaymentStatus.FAILED:
              // Handle failed payment - could show error state TODO!
              console.error("Payment failed");
              // For now, keep in confirming state
              break;
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        // TODO: Handle error
      }
    };

    // Initial status check after 2 seconds
    const initialTimer = setTimeout(() => {
      setCurrentStatus("confirming");
      checkPaymentStatus();

      // Then check every 3 seconds
      statusCheckInterval = setInterval(checkPaymentStatus, 3000);
    }, 2000);

    return () => {
      clearTimeout(initialTimer);
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
    // paymentData is not a dependency because it is not changing when checking status
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, paymentData.id, paymentData.orderId, currentStatus]);

  /*
   * Effect to handle alternating display of spinner and text during confirming state
   */
  useEffect(() => {
    if (currentStatus === ProcessingStatus.CONFIRMING) {
      setShowSpinner(true);

      alternatingTimerRef.current = setInterval(() => {
        setShowSpinner((prev) => !prev);
      }, 2000);
    } else {
      // Clear the alternating timer when not confirming
      if (alternatingTimerRef.current) {
        clearInterval(alternatingTimerRef.current);
        alternatingTimerRef.current = null;
      }
      setShowSpinner(true);
    }

    return () => {
      if (alternatingTimerRef.current) {
        clearInterval(alternatingTimerRef.current);
      }
    };
  }, [currentStatus]);

  const getSteps = (): ProcessingStep[] => [
    {
      id: "sent",
      label: "Sent",
      icon: <Check className="w-4 h-4 text-white" />,
      completed: true,
      active: currentStatus === ProcessingStatus.SENT,
    },
    {
      id: "confirming",
      label: "Confirming",
      icon:
        currentStatus === ProcessingStatus.CONFIRMING ? (
          showSpinner ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <div className="text-xs text-white font-sans font-medium whitespace-nowrap">
              Hold on a little...
            </div>
          )
        ) : (
          <Check className="w-4 h-4" />
        ),
      completed: currentStatus === ProcessingStatus.RECEIVED,
      active: currentStatus === ProcessingStatus.CONFIRMING,
    },
    {
      id: "received",
      label: "Received",
      icon:
        currentStatus === ProcessingStatus.RECEIVED ? (
          <Check className="w-4 h-4 text-white" />
        ) : (
          <Hourglass className="w-4 h-4 text-grey-text-primary" />
        ),
      completed: currentStatus === ProcessingStatus.RECEIVED,
      active: currentStatus === ProcessingStatus.RECEIVED,
    },
  ];

  const steps = getSteps();
  const isBankTransfer =
    paymentData.selectedMethod?.type === PaymentMethods.BANKTRANSFER;

  const amountToDisplay = isBankTransfer
    ? formatAmount(
        paymentData.bankTransferDetails?.amount || 0,
        paymentData.bankTransferDetails?.currency || "",
        paymentData.bankTransferDetails?.currencySymbol || ""
      )
    : `${paymentData.lightningInvoiceDetails?.satsAmount.toLocaleString()} SATS`;

  return (
    <div className="space-y-6">
      <Card className="shadow-none rounded-3xl border border-grey-dark-bg p-0 overflow-hidden">
        <div className="text-center bg-grey-accent-bg h-full px-6 py-5">
          <p className="text-base text-black-text tracking-wide font-sans font-normal">
            {isBankTransfer
              ? "Transfer this exact amount"
              : "Pay this exact amount"}
            <span className="text-base font-semibold text-green-600 ml-1.5">
              {amountToDisplay}
            </span>
          </p>
        </div>

        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-base font-medium leading-8 max-w-sm mx-auto text-black-text">
              We are confirming your payment. Please keep this tab open.
            </h3>
            <p className="text-sm text-grey-text-primary pt-6">
              Please wait for the payment to be confirmed
            </p>
          </div>

          <div className="relative flex items-center justify-center w-full px-4">
            <div className="relative border py-1.5 bg-grey-accent-bg rounded-full w-full h-12">
              {/* Sent Step - Fixed Left Position */}
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="relative">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 z-10 ${
                      steps[0].completed || steps[0].active
                        ? "bg-green-600 text-white"
                        : "bg-grey-dark-bg text-grey-text-accent"
                    }`}
                  >
                    {steps[0].icon}
                  </div>
                  {/* Connection line from Sent to Confirming */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-full w-32 h-0.5 bg-grey-dark-bg z-0">
                    <div
                      className={`h-full transition-all duration-500 ${
                        steps[1].completed || steps[1].active
                          ? "bg-green-600 w-full"
                          : "bg-grey-dark-bg w-0"
                      }`}
                    />
                  </div>
                </div>
                <span className="text-sm font-normal text-grey-text-accent absolute -bottom-8">
                  {steps[0].label}
                </span>
              </div>

              {/* Confirming Step - Fixed Center Position */}
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="relative">
                  <div
                    className={`flex items-center justify-center transition-all duration-500 z-10 ${
                      steps[1].completed || steps[1].active
                        ? "bg-green-600 text-white"
                        : "bg-grey-dark-bg text-grey-text-accent"
                    } ${
                      steps[1].id === "confirming" &&
                      currentStatus === ProcessingStatus.CONFIRMING
                        ? showSpinner
                          ? "w-9 h-9 rounded-full"
                          : "w-32 h-9 px-4 rounded-full"
                        : "w-9 h-9 rounded-full"
                    }`}
                  >
                    {steps[1].icon}
                  </div>
                  {/* Connection line from Confirming to Received */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 left-full h-0.5 bg-grey-dark-bg z-0 transition-all duration-500 ${
                      showSpinner ? "w-[7.65rem]" : "w-[7rem]"
                    }`}
                  >
                    <div
                      className={`h-full transition-all duration-500 ${
                        steps[2].completed || steps[2].active
                          ? "bg-green-600 w-full"
                          : "bg-grey-dark-bg w-0"
                      }`}
                    />
                  </div>
                </div>
                <span className="text-sm font-normal text-grey-text-accent absolute -bottom-8">
                  {steps[1].label}
                </span>
              </div>

              {/* Received Step - Fixed Right Position */}
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="relative">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 z-10 ${
                      steps[2].completed || steps[2].active
                        ? "bg-green-600 text-white"
                        : "bg-grey-dark-bg text-grey-text-accent"
                    }`}
                  >
                    {steps[2].icon}
                  </div>
                </div>
                <span className="text-sm font-normal text-grey-text-accent absolute -bottom-8">
                  {steps[2].label}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center pt-12 pb-4 px-4 w-full">
            <Button
              variant="outline"
              onClick={onShowAccountNumber}
              className="text-green-600 bg-grey-accent-bg shadow-none w-full py-6 cursor-pointer hover:text-green-600 hover:bg-grey-dark-bg"
            >
              {isBankTransfer ? "Show account number" : "Show invoice details"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-orange-accent-bg border-orange-accent-border rounded-xl border-1 shadow-none">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-full p-2">
            <AlertCircle className="w-5 h-5 text-orange-accent-text flex-shrink-0" />
          </div>
          <div className="text-xs text-orange-accent-text font-inter font-normal max-w-xs">
            Please do not close this tab until your payment has been
            confirmed!!!
          </div>
        </div>
      </Card>

      <div className="text-center w-full">
        <Button
          variant="outline"
          className="w-full py-9 text-red-primary-text shadow-none hover:bg-red-accent-bg-light hover:text-red-primary-text cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
