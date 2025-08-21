"use client";

import Image from "next/image";

interface PaymentHeaderProps {
  merchantName: string;
  merchantLogo: string;
}

export function PaymentHeader({
  merchantName,
  merchantLogo,
}: PaymentHeaderProps) {
  return (
      <div className="hidden md:flex items-center justify-between w-full h-32 py-0 px-4">
        <div className="flex items-center gap-4">
          {merchantLogo && (
            <div className="flex-shrink-0">
              <Image
                src={merchantLogo}
                alt={`${merchantName} logo`}
                width={100}
                height={100}
                className="h-20 w-auto object-contain"
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
          <span>THIS LINK EXPIRES</span>
          <span className="font-mono text-green-600 font-semibold">
            AFTER PAYMENT IS RECEIVED
          </span>
        </div>
      </div>
  );
}
