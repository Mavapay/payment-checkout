"use client";

import { Logo } from "../../public/icons/logo";

export function PaymentFooter() {
  return (
    <div className="text-center text-sm text-grey-text-accent font-inter py-4 md:py-0">
      <div className="flex items-center justify-center gap-2">
        <span className="font-Inter text-base font-normal leading-6">
          Powered by
        </span>
        <Logo />
      </div>
    </div>
  );
}
