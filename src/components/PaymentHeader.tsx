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
    <>
      {/* Mobile Layout */}
      {/* <div className="md:hidden flex flex-col items-center w-full py-4 px-4 space-y-3">
        <div className="flex items-center gap-3">
          {merchantLogo && (
            <div className="flex-shrink-0">
              <Image
                src={merchantLogo}
                alt={`${merchantName} logo`}
                width={100}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </div>
          )}
          {!merchantLogo && (
            <div className="text-xl font-bold tracking-wider">
              {merchantName}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 text-xs text-gray-600 text-center">
          <span>PAYMENT LINK FROM {merchantName.toUpperCase()}</span>
          <span>THIS LINK EXPIRES AFTER PAYMENT IS RECEIVED</span>
        </div>
      </div> */}

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between w-full h-32 py-0 px-4">
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
          <span>THIS LINK EXPIRES</span>
          <span className="font-mono text-green-600 font-semibold">
            AFTER PAYMENT IS RECEIVED
          </span>
        </div>
      </div>
    </>
  );
}
