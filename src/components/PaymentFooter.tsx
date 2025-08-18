"use client";

import { Logo } from "../../public/icons/logo";

export function PaymentFooter() {
  return (
    <div className="text-center text-sm text-grey-text-accent">
      <div className="flex items-center justify-center gap-2">
        <span className="font-Inter text-base font-normal leading-6">
          Powered by
        </span>
        <Logo />
      </div>
    </div>
  );
}
