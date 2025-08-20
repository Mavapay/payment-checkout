"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { calculateTimeLeft } from "@/lib/utils";

interface PaymentHeaderProps {
  merchantName: string;
  merchantLogo: string;
  expiresAt: string;
}

export function PaymentHeader({
  merchantName,
  merchantLogo,
  expiresAt,
}: PaymentHeaderProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(expiresAt));
    const timer = setInterval(
      () => setTimeLeft(calculateTimeLeft(expiresAt)),
      1000
    );

    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <div className="flex items-center justify-between w-full h-32 py-0 px-4">
      <div className="flex items-center gap-4">
        {merchantLogo && (
          <div className="flex-shrink-0">
            <Image
              src={merchantLogo}
              alt={`${merchantName} logo`}
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </div>
        )}
        {!merchantLogo && (
          <div className="text-2xl font-bold tracking-wider">
            {merchantName}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>PAYMENT LINK FROM {merchantName.toUpperCase()}</span>
        <span>•</span>
        <span>THIS LINK EXPIRES IN</span>
        <span className="font-mono text-green-600 font-semibold">
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
