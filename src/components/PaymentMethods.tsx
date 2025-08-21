"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Bank, Bitcoin } from "@/public/icons";
import { Caret } from "@/public/icons/caret";
import { PaymentMethod, PaymentMethodType } from "@/types/payment";
import { PaymentMethods as PaymentMethodsEnum } from "@/types/primitives";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

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
  const baseClasses = "font-inter text-black-text text-xs md:text-sm leading-5";
  const conditionalClasses = isSelected ? "font-medium" : "font-normal";

  return `${baseClasses} ${conditionalClasses}`;
};

export function PaymentMethods({
  paymentMethods,
  selectedMethod,
  onMethodSelect,
  isLoading = false,
}: PaymentMethodsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMethodSelect = (method: PaymentMethod) => {
    setIsOpen(false);
    onMethodSelect(method);
  };

  return (
    <div className="md:space-y-4 bg-white md:bg-grey-accent-bg md:py-8 md:rounded-l-xl h-16 md:h-full w-full md:w-56 flex flex-col justify-center md:justify-start md:gap-5">
      <div className="md:hidden flex justify-between items-center py-0 px-4">
        <div className="flex items-center gap-2">
          {selectedMethod && getMethodIcon(selectedMethod.type)}
          <span className={getTextClassName(true)}>{selectedMethod?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="text-green-600 hover:text-green-700 hover:bg-transparent p-0 h-auto font-medium text-xs flex items-center gap-1"
                disabled={isLoading}
              >
                Change payment method{" "}
                <span className="text-xs">
                  <Caret className="w-4 h-4" />
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm mx-auto rounded-3xl p-0 border-none shadow-lg">
              <div className="bg-white rounded-3xl overflow-hidden">
                <AlertDialogHeader className="p-6 pb-4 relative">
                  <AlertDialogCancel
                    asChild
                    className="flex justify-end border-none outline-none shadow-none"
                  >
                    <div className="">
                      <Button
                        variant="ghost"
                        className="h-auto w-auto hover:bg-gray-100 rounded-full border outline-none "
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </AlertDialogCancel>
                  <AlertDialogTitle className="text-base font-medium text-left">
                    Choose your preferred payment method
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <div className="px-6 pb-6 space-y-3">
                  {paymentMethods.map((method) => {
                    const isSelected = selectedMethod?.id === method.id;
                    return (
                      <AlertDialogCancel key={method.id} asChild>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            !isLoading && handleMethodSelect(method)
                          }
                          className={`w-full justify-start p-4 h-auto rounded-xl border transition-all text-xs md:text-sm ${
                            isSelected
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                          disabled={isLoading}
                        >
                          <div className="flex items-center gap-3">
                            {getMethodIcon(method.type)}
                            <span className="font-medium">{method.name}</span>
                            {isLoading && !isSelected && (
                              <div className="ml-auto">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                              </div>
                            )}
                          </div>
                        </Button>
                      </AlertDialogCancel>
                    );
                  })}
                </div>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="hidden md:flex flex-col gap-2 px-8">
        <h2 className=" text-xl font-medium leading-5 font-inter tracking-wider text-grey-text-primary">
          PAY WITH
        </h2>
      </div>
      <div className="hidden md:block space-y-2">
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
