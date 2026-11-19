"use client";

import { AlertCircle } from "lucide-react";
import { useState } from "react";

import { KesFeeNotice } from "@/components/KesFeeNotice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMobileMoneyCheckout } from "@/hooks/useMobileMoneyCheckout";
import { promptStatusMessage as describePrompt } from "@/lib/collection";
import { formatMajorAmount } from "@/lib/amount";
import { fetchPaymentStatus } from "@/services/api";
import { PaymentData } from "@/types/payment";
import { CheckoutPhases, PromptStatuses } from "@/types/primitives";

interface MobileMoneyCheckoutProps {
  payment: PaymentData;
  checkout: ReturnType<typeof useMobileMoneyCheckout>;
  onCancel: () => void;
  onPaymentConfirmed: () => void;
}

const inputClassName =
  "w-full rounded-lg border border-grey-dark-bg bg-white px-3 py-3 font-sans text-sm text-black-text outline-none focus:border-green-600 disabled:bg-grey-accent-bg";

const actionButtonClassName =
  "w-full min-w-0 py-7 md:py-9 font-sans text-base font-medium shadow-none cursor-pointer";

const greenButtonClassName = `${actionButtonClassName} border border-transparent text-white bg-green-600 hover:bg-green-700`;

export function MobileMoneyCheckout({
  payment,
  checkout,
  onCancel,
  onPaymentConfirmed,
}: MobileMoneyCheckoutProps) {
  const { view } = checkout;
  const [isConfirming, setIsConfirming] = useState(false);
  const currency = payment.paymentCurrency;
  const linkAmount =
    payment.configuredAmount !== undefined && currency
      ? formatMajorAmount(payment.configuredAmount, currency)
      : null;
  const payable =
    view.payableMajor !== undefined && view.sourceCurrency
      ? formatMajorAmount(view.payableMajor, view.sourceCurrency)
      : null;
  const asset =
    view.targetMajor !== undefined
      ? formatMajorAmount(view.targetMajor, payment.settlementCurrency)
      : null;
  const showInstructions = Boolean(view.pollOrderId) || view.phase === CheckoutPhases.RECEIVED;
  const inputsDisabled =
    checkout.isSubmitting ||
    view.phase === CheckoutPhases.RECEIVED ||
    view.phase === CheckoutPhases.FAILED ||
    view.settled ||
    Boolean(view.pollOrderId);
  const promptTimedOut = view.promptStatus === PromptStatuses.TIMED_OUT;
  const canProceed =
    showInstructions && view.phase !== CheckoutPhases.FAILED && !view.settled;
  const sameRequestWaiting =
    view.phase === CheckoutPhases.NEEDS_RETRY && !checkout.canRetrySubmission;
  const sendLabel = checkout.isSubmitting
    ? "Sending..."
    : view.collectionNotSubmitted
      ? `Resend Prompt${
          checkout.retryCountdownLabel && !checkout.canRequestAnother
            ? ` ${checkout.retryCountdownLabel}`
            : ""
        }`
      : view.phase === CheckoutPhases.NEEDS_RETRY
        ? `Retry submission${
            sameRequestWaiting && checkout.retryCountdownLabel
              ? ` ${checkout.retryCountdownLabel}`
              : ""
          }`
        : "Send payment prompt";

  const handleProceed = async () => {
    if (!view.pollOrderId || isConfirming || checkout.isSubmitting) return;
    setIsConfirming(true);
    try {
      const result = await fetchPaymentStatus(view.pollOrderId);
      if (result.status === "ok") {
        onPaymentConfirmed();
      }
    } catch (error) {
      console.error("Payment confirmation error:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 w-full min-w-0">
      <Card className="shadow-none rounded-3xl border border-grey-dark-bg p-0 gap-4 overflow-hidden">
        <div className="text-center bg-grey-accent-bg px-6 py-5">
          <p className="text-xs md:text-base tracking-wide font-sans font-normal text-black-text">
            {showInstructions && payable
              ? "Approve the amount on your phone"
              : "Payment link amount"}
            <span className="text-base font-semibold text-green-600 ml-1.5">
              {showInstructions && payable ? payable : linkAmount || "Amount pending"}
            </span>
            {showInstructions && asset ? (
              <span className="text-sm font-semibold text-green-600"> ({asset})</span>
            ) : null}
          </p>
        </div>

        <div className="space-y-4 px-6 pb-6">
          {!showInstructions && (
            <p className="text-sm text-grey-text-primary text-center">
              {linkAmount
                ? `This link is set for ${linkAmount}. The amount to pay is confirmed when you send the prompt.`
                : "The amount to pay is confirmed when you send the prompt."}{" "}
              The merchant receives {payment.settlementCurrency}.
            </p>
          )}

          {showInstructions && (
            <div className="space-y-2 text-sm text-black-text">
              {!checkout.quoteExpired && <p>{describePrompt(view.promptStatus)}</p>}
              {promptTimedOut && !checkout.quoteExpired && (
                <p>The prompt timed out. The purchase quote is still active.</p>
              )}
              {checkout.quoteCountdownLabel && view.quoteExpiresAt && !checkout.quoteExpired && (
                <p className="text-grey-text-primary">
                  Quote expires in{" "}
                  <span className="font-semibold text-green-600">
                    {checkout.quoteCountdownLabel}
                  </span>
                </p>
              )}
            </div>
          )}

          {!showInstructions && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                checkout.submit();
              }}
            >
              <label className="block text-sm text-black-text">
                Phone number
                <input
                  aria-label="Phone number"
                  value={checkout.form.phoneNumber}
                  onChange={(event) => checkout.setPhoneNumber(event.target.value)}
                  className={inputClassName}
                  inputMode="tel"
                  autoComplete="tel"
                  disabled={inputsDisabled}
                />
              </label>
              {checkout.fieldErrors.phoneNumber && (
                <p className="text-xs text-red-primary-text">{checkout.fieldErrors.phoneNumber}</p>
              )}
              <label className="block text-sm text-black-text">
                First name
                <input
                  aria-label="First name"
                  value={checkout.form.firstName}
                  onChange={(event) => checkout.setFirstName(event.target.value)}
                  className={inputClassName}
                  autoComplete="given-name"
                  disabled={inputsDisabled}
                />
              </label>
              {checkout.fieldErrors.firstName && (
                <p className="text-xs text-red-primary-text">{checkout.fieldErrors.firstName}</p>
              )}
              <label className="block text-sm text-black-text">
                Last name
                <input
                  aria-label="Last name"
                  value={checkout.form.lastName}
                  onChange={(event) => checkout.setLastName(event.target.value)}
                  className={inputClassName}
                  autoComplete="family-name"
                  disabled={inputsDisabled}
                />
              </label>
              {checkout.fieldErrors.lastName && (
                <p className="text-xs text-red-primary-text">{checkout.fieldErrors.lastName}</p>
              )}
              <Button
                type="submit"
                disabled={
                  checkout.isSubmitting ||
                  (view.collectionNotSubmitted && !checkout.canRequestAnother) ||
                  sameRequestWaiting
                }
                className={greenButtonClassName}
              >
                {sendLabel}
              </Button>
            </form>
          )}

          {checkout.view.userMessage && (
            <p className="text-sm text-red-primary-text">{checkout.view.userMessage}</p>
          )}
        </div>
      </Card>

      {showInstructions && payable && view.sourceCurrency === "KES" ? (
        <KesFeeNotice />
      ) : (
        <Card className="p-4 bg-orange-accent-bg border-orange-accent-border rounded-xl border-1 shadow-none">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-full p-2">
              <AlertCircle className="w-5 h-5 text-orange-accent-text flex-shrink-0" />
            </div>
            <div className="text-xs text-orange-accent-text font-inter font-normal max-w-xs leading-5">
              Please do not close this tab until your payment has been confirmed.
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-4 w-full min-w-0">
        {canProceed && (
          <Button
            onClick={handleProceed}
            disabled={isConfirming || checkout.isSubmitting}
            className={greenButtonClassName}
          >
            {isConfirming ? "Processing..." : "I have Paid"}
          </Button>
        )}
        {view.phase === CheckoutPhases.NEEDS_RETRY && showInstructions && (
          <Button
            onClick={checkout.retry}
            disabled={!checkout.canRetrySubmission || checkout.isSubmitting}
            className={greenButtonClassName}
          >
            Retry submission
            {sameRequestWaiting && checkout.retryCountdownLabel
              ? ` ${checkout.retryCountdownLabel}`
              : ""}
          </Button>
        )}
        {view.phase !== CheckoutPhases.NEEDS_RETRY &&
          (showInstructions || view.phase === CheckoutPhases.REQUEST_ID_REUSED) &&
          !checkout.quoteExpired && (
          <Button
            variant="outline"
            onClick={checkout.requestAnotherPrompt}
            disabled={!checkout.canRequestAnother || checkout.isSubmitting}
            className={`${actionButtonClassName} text-black-text border-grey-dark-bg`}
          >
            Resend Prompt
            {checkout.retryCountdownLabel &&
            !checkout.quoteExpired &&
            !checkout.canRequestAnother
              ? ` ${checkout.retryCountdownLabel}`
              : ""}
          </Button>
        )}
        {showInstructions && checkout.quoteExpired && (
          <Button
            variant="outline"
            onClick={checkout.continuePayment}
            disabled={!checkout.canContinue || checkout.isSubmitting}
            className={`${actionButtonClassName} text-black-text border-grey-dark-bg`}
          >
            Continue payment
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onCancel}
          className={`${actionButtonClassName} text-red-primary-text hover:bg-red-accent-bg-light hover:text-red-primary-text`}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}