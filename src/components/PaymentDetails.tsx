"use client";

import { AlertCircle, Copy } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { calculateTimeLeft, copyToClipboard, formatAmount } from "@/lib/utils";
import {
  BankTransferDetails,
  LightningInvoiceDetails,
  PaymentData,
  PaymentType,
} from "@/types/payment";
import { PaymentTypes } from "@/types/primitives";

import { Spinner } from "./Spinner";

interface PaymentDetailsProps {
  details: PaymentData;
  paymentType: PaymentType;
  isLoading: boolean;
}

export function PaymentDetails({
  details,
  paymentType,
  isLoading,
}: PaymentDetailsProps) {
  const isBankTransfer = paymentType === PaymentTypes.BANKTRANSFER;
  const isLightning = paymentType === PaymentTypes.LIGHTNING;

  const bankDetails = isBankTransfer
    ? (details.bankTransferDetails as BankTransferDetails)
    : null;
  const lightningDetails = isLightning
    ? (details.lightningInvoiceDetails as LightningInvoiceDetails)
    : null;

  const PAYMENT_DETAILS_OPTIONS =
    isBankTransfer && bankDetails
      ? [
          {
            label: "BANK NAME",
            value: bankDetails.bankName,
            copyable: false,
          },
          {
            label: "ACCOUNT NUMBER",
            value: bankDetails.accountNumber,
            copyable: true,
            copyKey: "account number",
          },
          {
            label: "AMOUNT",
            value: formatAmount(
              bankDetails.amount,
              bankDetails.currency,
              bankDetails.currencySymbol
            ),
            copyable: true,
            copyKey: "amount",
            copyValue: bankDetails?.amount?.toString(),
          },
        ]
      : [];

  const [timeLeft, setTimeLeft] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Generate QR code for Lightning invoice
  useEffect(() => {
    if (isLightning && lightningDetails) {
      QRCode.toDataURL(lightningDetails.invoice, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => {
          console.error("Error generating QR code:", err);
          toast("Failed to generate QR code. Please try again", {
            action: {
              label: "Retry",
              onClick: () => {
                window.location.reload();
              },
            },
            style: {
              background: "#dc2626",
              color: "white",
              border: "1px solid #dc2626",
            },
          });
        });
    }
  }, [isLightning, lightningDetails]);

  // Calculate time left until expiry
  useEffect(() => {
    setTimeLeft(calculateTimeLeft(details.expiresAt));
    const timer = setInterval(
      () => setTimeLeft(calculateTimeLeft(details.expiresAt)),
      1000
    );

    return () => clearInterval(timer);
  }, [details.expiresAt]);

  const handleCopyToClipboard = async ({
    value,
    copyKey,
  }: {
    value: string;
    copyKey: string;
  }) => {
    try {
      await copyToClipboard(value);
      toast(`Copied ${copyKey} to clipboard`, {
        description: "You can now paste it into your bank application",
        style: {
          background: "#16a34a",
          color: "#ffffff",
          border: "1px solid #16a34a",
        },
      });
    } catch (error) {
      console.error("Failed to copy invoice:", error);
      toast("Failed to copy. Please try again", {
        style: {
          background: "#dc2626",
          color: "white",
          border: "1px solid #dc2626",
        },
      });
    }
  };

  const getHeaderText = () => {
    if (isLightning && lightningDetails) {
      return (
        <>
          Pay this invoice
          <span className="text-base font-semibold text-green-600 ml-1.5">
            {lightningDetails.satsAmount.toLocaleString()} SATS (
            {formatAmount(
              lightningDetails.amount,
              lightningDetails.currency,
              lightningDetails.currencySymbol
            )}
            )
          </span>
        </>
      );
    }
    return (
      <>
        Transfer this exact amount
        <span className="text-base font-semibold text-green-600 ml-1.5">
          {formatAmount(
            details.amount,
            details.bankTransferDetails?.currency || "",
            details.bankTransferDetails?.currencySymbol || ""
          )}{" "}
          ({(details.bankTransferDetails?.targetAmount || 0).toLocaleString()}{" "}
          SATS)
        </span>
      </>
    );
  };

  const getExpiryText = () => {
    const baseText = isLightning
      ? "This Lightning invoice will expire in"
      : "This account is for this transaction only and expires in";

    return (
      <div className="text-grey-text-primary">
        {baseText}{" "}
        <span className="font-semibold text-green-600">{timeLeft}</span>
      </div>
    );
  };

  const LightningContent = () => {
    if (!lightningDetails) {
      return (
        <div className="flex flex-col items-center space-y-6 px-6 py-0">
          <p className="text-gray-500">Lightning invoice not available</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center space-y-6 px-6 py-0">
        {qrCodeDataUrl && (
          <div className="bg-white p-4 rounded-lg">
            <Image
              src={qrCodeDataUrl}
              alt="Lightning Invoice QR Code"
              width={200}
              height={200}
              className="rounded"
            />
          </div>
        )}

        <div className="w-full">
          <div className="flex items-center justify-between px-4 rounded-lg">
            <span className="font-mono text-sm text-black-text break-all mr-2 bg-grey-accent-bg p-2 rounded-lg">
              {lightningDetails.invoice.slice(0, 20)}...
              {lightningDetails.invoice.slice(-10)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleCopyToClipboard({
                  value: lightningDetails.invoice,
                  copyKey: "Lightning invoice",
                })
              }
              className="text-gray-500 hover:text-gray-700 cursor-pointer flex-shrink-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const BankTransferContent = () => (
    <div className="space-y-4 px-6">
      {PAYMENT_DETAILS_OPTIONS.map((field) => (
        <div key={field.label}>
          <label className="block text-sm font-normal tracking-wider text-black-text mb-2">
            {field.label}
          </label>
          <div className="flex items-center justify-between py-1.5">
            <span className="font-sans text-base font-semibold text-black-text">
              {field.value}
            </span>
            {field.copyable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopyToClipboard({
                    value: field.copyValue || field.value,
                    copyKey: field.copyKey || field.label,
                  })
                }
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const WarningCard = () => (
    <Card className="p-4 bg-orange-accent-bg border-orange-accent-border rounded-xl border-1 shadow-none">
      <div className="flex items-center gap-3">
        <div className="bg-white rounded-full p-2">
          <AlertCircle className="w-5 h-5 text-orange-accent-text mt-0.5 flex-shrink-0" />
        </div>
        <div className="text-xs text-orange-accent-text font-inter font-normal max-w-xs">
          Please do not close this tab until your payment has been confirmed!!!
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-none rounded-3xl border border-grey-dark-bg p-0 overflow-hidden">
        <div className="text-center bg-grey-accent-bg h-full px-6 py-5">
          <p className="text-base text-black-text tracking-wide font-sans font-normal">
            {getHeaderText()}
          </p>
        </div>

        {isLoading ? (
          <div className="max-h-80 flex justify-center items-center bg-transparent">
            <Spinner className="bg-transparent" />
          </div>
        ) : isLightning ? (
          <LightningContent />
        ) : (
          <BankTransferContent />
        )}

        <div className="px-6">
          <Separator className="bg-grey-dark-bg" />
        </div>
        <div className="text-sm flex justify-center items-center px-6 mb-7">
          {getExpiryText()}
        </div>
      </Card>

      <WarningCard />
    </div>
  );
}
