"use client";

import { PaymentMethod, PaymentMethodType } from "@/types/payment";
import { PaymentMethods as PaymentMethodsEnum } from "@/types/primitives";
import { Card } from "@/components/ui/card";

import { Bank, Bitcoin } from "@/public/icons";

interface PaymentMethodsProps {
  paymentMethods: PaymentMethod[];
  selectedMethod?: PaymentMethod;
  onMethodSelect: (method: PaymentMethod) => void;
  isLoading?: boolean;
}

interface IconConfig {
  icon: React.ComponentType<{ className?: string }>;
  padding: string;
  size: string;
}

const PAYMENT_METHOD_ICONS: Record<PaymentMethodType, IconConfig> = {
  [PaymentMethodsEnum.BANKTRANSFER]: {
    icon: Bank,
    padding: "p-2",
    size: "w-4 h-4",
  },
  [PaymentMethodsEnum.LIGHTNING]: {
    icon: Bitcoin,
    padding: "p-1",
    size: "w-6 h-6",
  },
};

const DEFAULT_ICON_CONFIG: IconConfig = {
  icon: Bitcoin,
  padding: "p-2",
  size: "w-4 h-4",
};

const getMethodIcon = (type: PaymentMethodType) => {
  const config = PAYMENT_METHOD_ICONS[type] || DEFAULT_ICON_CONFIG;
  const IconComponent = config.icon;

  return (
    <div className={`rounded-full bg-white ${config.padding}`}>
      <IconComponent className={config.size} />
    </div>
  );
};

const getCardClassName = (isSelected: boolean): string => {
  const baseClasses =
    "flex flex-col justify-center py-4 px-8 cursor-pointer transition-all border-none w-full h-24 rounded-none hover:border-none shadow-none";
  const conditionalClasses = isSelected
    ? "bg-grey-dark-bg"
    : "bg-transparent hover:bg-grey-dark-bg";

  return `${baseClasses} ${conditionalClasses}`;
};

const getTextClassName = (isSelected: boolean): string => {
  const baseClasses = "font-inter text-black-text text-sm leading-5";
  const conditionalClasses = isSelected ? "font-medium" : "font-normal";

  return `${baseClasses} ${conditionalClasses}`;
};

export function PaymentMethods({
  paymentMethods,
  selectedMethod,
  onMethodSelect,
  isLoading = false,
}: PaymentMethodsProps) {
  return (
    <div className="space-y-4 bg-grey-accent-bg py-8 rounded-l-xl h-full w-56 flex flex-col justify-left gap-5">
      <div className="flex flex-col gap-2 px-8">
        <h2 className="text-xl font-medium leading-5 font-inter tracking-wider text-grey-text-primary">
          PAY WITH
        </h2>
      </div>
      <div className="space-y-2">
        {paymentMethods.map((method) => {
          const isSelected = selectedMethod?.id === method.id;

          return (
            <Card
              key={method.id}
              className={getCardClassName(isSelected)}
              onClick={() => !isLoading && onMethodSelect(method)}
            >
              <div className="flex items-center gap-3 h-full">
                {getMethodIcon(method.type)}
                <span className={getTextClassName(isSelected)}>
                  {method.name}
                </span>
                {isLoading && !isSelected && (
                  <div className="ml-auto">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
