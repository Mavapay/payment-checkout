"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { Copy, AlertCircle } from "lucide-react";
import { BankTransferDetails as BankTransferDetailsType } from "@/types/payment";

interface BankTransferDetailsProps {
  details: BankTransferDetailsType;
}

export function BankTransferDetails({ details }: BankTransferDetailsProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  // Calculate time left until expiry
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(details.expiresAt).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      } else {
        setTimeLeft("0:00");
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [details.expiresAt]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ ...copied, [field]: true });
      setTimeout(() => {
        setCopied({ ...copied, [field]: false });
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-none rounded-3xl border border-grey-dark-bg p-0 overflow-hidden">
        <div className="text-center bg-grey-accent-bg h-full px-6 py-5">
          <p className="text-base text-black-text tracking-wide font-sans font-normal">
            Transfer this exact amount
            <span className="text-base font-semibold text-green-600 ml-1.5">
              {formatAmount(details.amount, details.currency)}
            </span>
          </p>
        </div>

        <div className="space-y-4 px-6">
          <div>
            <label className="block text-sm font-normal tracking-wider text-black-text mb-2">
              BANK NAME
            </label>
            <div className="flex items-center justify-between py-1.5">
              <span className="font-sans text-base font-semibold text-black-text">
                {details.bankName}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-normal tracking-wider text-black-text mb-2">
              ACCOUNT NUMBER
            </label>
            <div className="flex items-center justify-between py-1.5">
              <span className="font-sans text-base font-semibold text-black-text">
                {details.accountNumber}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(details.accountNumber, "account")
                }
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-normal tracking-wider text-black-text mb-2">
              AMOUNT
            </label>
            <div className="flex items-center justify-between py-1.5">
              <span className="font-sans text-base font-semibold text-black-text">
                {formatAmount(details.amount, details.currency)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(details.amount.toString(), "amount")
                }
                className="text-grey-text-primary hover:text-black-text cursor-pointer"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="px-6">
          <Separator className="bg-grey-dark-bg" />
        </div>
        <div className="text-sm flex justify-center items-center px-6 mb-7">
          <div className="text-grey-text-primary">
            This account is for this transaction only and expires in{" "}
            <span className="font-semibold text-green-600">{timeLeft}</span>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-orange-accent-bg border-orange-accent-border rounded-xl border-1 shadow-none">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-full p-2">
            <AlertCircle className="w-5 h-5 text-orange-accent-text mt-0.5 flex-shrink-0" />
          </div>
          <div className="text-xs text-orange-accent-text font-inter font-normal max-w-xs">
            Please do not close this tab until your payment has been
            confirmed!!!
          </div>
        </div>
      </Card>
    </div>
  );
}
