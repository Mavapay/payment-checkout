"use client";

import {
  PaymentMethod,
  PaymentMethods as PaymentMethodsEnum,
  PaymentMethodType,
} from "@/types/payment";
import { Card } from "@/components/ui/card";

import { Bank, Bitcoin } from "@/public/icons";

interface PaymentMethodsProps {
  paymentMethods: PaymentMethod[];
  selectedMethod?: PaymentMethod;
  onMethodSelect: (method: PaymentMethod) => void;
}

const getMethodIcon = (type: PaymentMethodType) => {
  switch (type) {
    case PaymentMethodsEnum.BANKTRANSFER:
      return (
        <div className="rounded-full p-2 bg-white">
          <Bank className="w-4 h-4" />
        </div>
      );
    case PaymentMethodsEnum.LIGHTNING:
      return (
        <div className="rounded-full p-1 bg-white">
          <Bitcoin className="w-6 h-6" />
        </div>
      );
    default:
      return (
        <div className="rounded-full p-2 bg-white">
          <Bitcoin className="w-4 h-4" />
        </div>
      );
  }
};

export function PaymentMethods({
  paymentMethods,
  selectedMethod,
  onMethodSelect,
}: PaymentMethodsProps) {
  return (
    <div className="space-y-4 bg-grey-accent-bg py-8 rounded-l-xl h-full w-56 flex flex-col justify-left gap-5">
      <div className="flex flex-col gap-2 px-8">
        <h2 className="text-xl font-medium leading-5 font-inter tracking-wider text-grey-text-primary">
          PAY WITH
        </h2>
      </div>
      <div className="space-y-2">
        {paymentMethods.map((method) => (
          <Card
            key={method.id}
            className={`flex flex-col justify-center py-4 px-8 cursor-pointer transition-all border-none w-full h-24 rounded-none hover:border-none shadow-none ${
              selectedMethod?.id === method.id
                ? "bg-grey-dark-bg"
                : "bg-transparent hover:bg-grey-dark-bg"
            }`}
            onClick={() => onMethodSelect(method)}
          >
            <div className="flex items-center gap-3 h-full">
              {getMethodIcon(method.type)}
              <span
                className={`font-inter text-black-text text-sm leading-5 ${
                  selectedMethod?.id === method.id
                    ? "font-medium"
                    : "font-normal"
                }`}
              >
                {method.name}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
