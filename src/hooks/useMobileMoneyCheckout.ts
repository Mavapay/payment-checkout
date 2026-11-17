"use client";

import { useEffect, useRef, useState } from "react";

import { formatCountdown, formatMinutesSeconds, remainingMs, serverClockOffsetMs } from "@/lib/clock";
import {
  applyCheckoutFailure,
  applyCheckoutSuccess,
  applyStatusUpdate,
  beginSubmission,
  canContinueAfterExpiry,
  canRequestAnotherPrompt,
  canRetryInterruptedSubmission,
  clonePayer,
  createMobileMoneyView,
  markQuoteExpired,
  MobileMoneyView,
  retrySubmission,
} from "@/lib/checkout-machine";
import {
  clearPendingCheckout,
  pendingFromView,
  readPendingCheckout,
  viewPhaseFromPending,
  writePendingCheckout,
} from "@/lib/pending-checkout";
import { validatePayer, PayerFieldErrors, PayerInput } from "@/lib/payer";
import { createRequestId } from "@/lib/request-id";
import { createSubmitGate } from "@/lib/submit-gate";
import {
  mergeMobileMoneyCheckout,
  mergeViewIntoPayment,
} from "@/lib/payment-link";
import { fetchPaymentStatus, submitPaymentLinkCheckout } from "@/services/api";
import { PaymentData } from "@/types/payment";
import {
  CheckoutPhases,
  PromptStatuses,
  STATUS_POLL_INTERVAL_MS,
} from "@/types/primitives";

interface UseMobileMoneyCheckoutOptions {
  payment: PaymentData | null;
  enabled: boolean;
  onPaymentChange: (payment: PaymentData) => void;
  onSettled: (payment: PaymentData) => void;
}

const emptyForm: PayerInput = {
  phoneNumber: "",
  firstName: "",
  lastName: "",
};

export function useMobileMoneyCheckout({
  payment,
  enabled,
  onPaymentChange,
  onSettled,
}: UseMobileMoneyCheckoutOptions) {
  const [view, setView] = useState<MobileMoneyView>(createMobileMoneyView);
  const [form, setForm] = useState<PayerInput>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<PayerFieldErrors>({});
  const [now, setNow] = useState(() => Date.now());
  const viewRef = useRef(view);
  const formRef = useRef(form);
  const paymentRef = useRef(payment);
  const enabledRef = useRef(enabled);
  const onPaymentChangeRef = useRef(onPaymentChange);
  const onSettledRef = useRef(onSettled);
  const gateRef = useRef(createSubmitGate());
  const lockRef = useRef(false);
  const queuedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const settledNotifiedRef = useRef(false);
  const eligibilityKeyRef = useRef<string | null>(null);

  viewRef.current = view;
  formRef.current = form;
  paymentRef.current = payment;
  enabledRef.current = enabled;
  onPaymentChangeRef.current = onPaymentChange;
  onSettledRef.current = onSettled;

  const commit = (next: MobileMoneyView) => {
    viewRef.current = next;
    setView(next);
  };

  const persist = async (next: MobileMoneyView) => {
    const linkId = paymentRef.current?.id;
    if (!linkId) {
      return;
    }
    const record = pendingFromView(linkId, next);
    if (!record) {
      return;
    }
    await writePendingCheckout(record);
  };

  const refreshStatus = async () => {
    const current = viewRef.current;
    if (
      !enabledRef.current ||
      !current.pollOrderId ||
      current.settled ||
      current.orderFailed
    ) {
      return;
    }
    if (lockRef.current) {
      queuedRef.current = true;
      return;
    }
    lockRef.current = true;
    const generation = current.pollGeneration;
    const orderId = current.pollOrderId;
    const seq = ++seqRef.current;
    try {
      const response = await fetchPaymentStatus(
        orderId,
        abortRef.current?.signal,
      );
      if (
        !enabledRef.current ||
        response.cancelled ||
        response.status !== "ok"
      ) {
        return;
      }
      const receivedAt = Date.now();
      const next = applyStatusUpdate(
        viewRef.current,
        {
          generation,
          orderId,
          seq,
          status: response.data.status,
          collection: response.data.collection,
        },
        receivedAt,
      );
      if (next === viewRef.current) {
        return;
      }
      commit(next);
      const currentPayment = paymentRef.current;
      if (currentPayment) {
        const updatedPayment = mergeViewIntoPayment(currentPayment, next);
        paymentRef.current = updatedPayment;
        onPaymentChangeRef.current(updatedPayment);
      }
      await persist(next);
      if (next.settled && !settledNotifiedRef.current) {
        settledNotifiedRef.current = true;
        if (paymentRef.current?.id) {
          await clearPendingCheckout(paymentRef.current.id);
        }
        if (paymentRef.current) {
          onSettledRef.current(paymentRef.current);
        }
      }
    } catch {
      // A failed status check does not create another payment attempt.
    } finally {
      lockRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void refreshStatus();
      }
    }
  };

  const refreshStatusRef = useRef(refreshStatus);
  refreshStatusRef.current = refreshStatus;

  useEffect(() => {
    if (!enabled || !payment?.id) {
      return;
    }
    let cancelled = false;
    const linkId = payment.id;
    void (async () => {
      const record = await readPendingCheckout(linkId);
      if (cancelled || !record || record.paymentLinkId !== linkId) {
        return;
      }
      if (
        viewRef.current.phase === CheckoutPhases.SUBMITTING ||
        viewRef.current.submission
      ) {
        return;
      }
      const restored: MobileMoneyView = {
        ...createMobileMoneyView(),
        phase: viewPhaseFromPending(record),
        submission: {
          requestId: record.requestId,
          paymentSource: {
            phoneNumber: record.paymentSource.phoneNumber,
            firstName: record.paymentSource.firstName,
            lastName: record.paymentSource.lastName,
          },
        },
        pollGeneration: record.paymentLinkOrderId ? 1 : 0,
        pollOrderId: record.paymentLinkOrderId || "",
        paymentAlreadyReceived:
          record.promptStatus === PromptStatuses.SUCCEEDED ||
          record.paymentStatus === PromptStatuses.SUCCEEDED,
        canRetry: record.canRetry ?? false,
        retryAllowedAt: record.retryAllowedAt,
        quoteExpiresAt: record.quoteExpiresAt,
        serverTime: record.serverTime,
        clockReceivedAt: record.clockReceivedAt,
        promptStatus: record.promptStatus,
        paymentStatus: record.paymentStatus,
        payableMajor: record.payableMajor,
        targetMajor: record.targetMajor,
        sourceCurrency: record.sourceCurrency,
        quoteId: record.quoteId,
        attemptId: record.attemptId,
        internalOrderId: record.internalOrderId,
        quoteExpired: record.phase === CheckoutPhases.QUOTE_EXPIRED,
        orderFailed: record.phase === CheckoutPhases.FAILED,
        userMessage: null,
      };
      if (cancelled) {
        return;
      }
      commit(restored);
      seqRef.current = 0;
      const currentPayment = paymentRef.current;
      if (currentPayment && record.paymentLinkOrderId) {
        const updated = mergeViewIntoPayment(currentPayment, restored);
        paymentRef.current = updated;
        onPaymentChangeRef.current(updated);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, payment?.id]);

  useEffect(() => {
    if (!enabled || !view.pollOrderId || view.settled || view.orderFailed) {
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    seqRef.current = viewRef.current.appliedSeq;
    const starter = setTimeout(() => {
      void refreshStatusRef.current();
    }, 250);
    const interval = setInterval(() => {
      void refreshStatusRef.current();
    }, STATUS_POLL_INTERVAL_MS);
    return () => {
      clearTimeout(starter);
      clearInterval(interval);
      controller.abort();
    };
  }, [
    enabled,
    view.pollOrderId,
    view.pollGeneration,
    view.settled,
    view.orderFailed,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const tick = () => {
      const clientNow = Date.now();
      setNow(clientNow);
      const current = viewRef.current;
      const expired = markQuoteExpired(current, clientNow);
      if (expired !== current) {
        commit(expired);
      }
      if (!current.retryAllowedAt || !current.pollOrderId || current.settled) {
        return;
      }
      const offset = serverClockOffsetMs(
        current.serverTime,
        current.clockReceivedAt ?? clientNow,
      );
      const remaining = remainingMs(current.retryAllowedAt, offset, clientNow);
      if (
        remaining <= 0 &&
        eligibilityKeyRef.current !== current.retryAllowedAt
      ) {
        eligibilityKeyRef.current = current.retryAllowedAt;
        void refreshStatusRef.current();
      }
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    enabled,
    view.retryAllowedAt,
    view.quoteExpiresAt,
    view.serverTime,
    view.pollOrderId,
    view.settled,
  ]);

  const execute = async (submission: ReturnType<typeof retrySubmission>) => {
    const started = beginSubmission(viewRef.current, submission);
    commit(started);
    await persist(started);
    const paymentLinkId = paymentRef.current?.id || "";
    const settlementCurrency = paymentRef.current?.settlementCurrency || "";
    let result = await submitPaymentLinkCheckout({
      paymentLinkId,
      requestId: submission.requestId,
      paymentSource: submission.paymentSource,
      settlementCurrency,
    });
    if (!result.ok && result.error.reuseRequest) {
      result = await submitPaymentLinkCheckout({
        paymentLinkId,
        requestId: submission.requestId,
        paymentSource: submission.paymentSource,
        settlementCurrency,
      });
    }
    if (!result.ok && result.error.cancelled) {
      return;
    }
    const receivedAt = Date.now();
    if (result.ok) {
      const next = applyCheckoutSuccess(
        viewRef.current,
        result.details,
        receivedAt,
      );
      commit(next);
      setNow(receivedAt);
      if (paymentRef.current) {
        const updated = mergeMobileMoneyCheckout(
          paymentRef.current,
          result.details,
          receivedAt,
        );
        paymentRef.current = updated;
        onPaymentChangeRef.current(updated);
      }
      await persist(next);
      return;
    }
    const failed = applyCheckoutFailure(
      viewRef.current,
      result.error,
      receivedAt,
    );
    commit(failed);
    setNow(receivedAt);
    if (paymentRef.current && (failed.pollOrderId || result.error.collection)) {
      const updated = mergeViewIntoPayment(paymentRef.current, failed);
      paymentRef.current = updated;
      onPaymentChangeRef.current(updated);
    }
    await persist(failed);
  };

  const submit = () => {
    if (
      !enabled ||
      viewRef.current.settled ||
      viewRef.current.paymentAlreadyReceived
    ) {
      return;
    }
    if (!gateRef.current.tryEnter()) {
      return;
    }
    if (
      viewRef.current.submission &&
      (viewRef.current.phase === CheckoutPhases.NEEDS_RETRY ||
        viewRef.current.phase === CheckoutPhases.REQUEST_ID_REUSED)
    ) {
      if (viewRef.current.phase === CheckoutPhases.REQUEST_ID_REUSED) {
        gateRef.current.leave();
        return;
      }
      const submission = retrySubmission(viewRef.current.submission);
      void execute(submission).finally(() => gateRef.current.leave());
      return;
    }
    const validated = validatePayer(formRef.current);
    if (!validated.ok) {
      setFieldErrors(validated.errors);
      gateRef.current.leave();
      return;
    }
    setFieldErrors({});
    const submission = {
      requestId: createRequestId(),
      paymentSource: validated.value,
    };
    void execute(submission).finally(() => gateRef.current.leave());
  };

  const retry = () => {
    if (!canRetryInterruptedSubmission(viewRef.current)) {
      return;
    }
    if (!gateRef.current.tryEnter()) {
      return;
    }
    const submission = retrySubmission(viewRef.current.submission!);
    void execute(submission).finally(() => gateRef.current.leave());
  };

  const requestAnotherPrompt = () => {
    const clientNow = Date.now();
    if (!canRequestAnotherPrompt(viewRef.current, clientNow)) {
      return;
    }
    if (!gateRef.current.tryEnter()) {
      return;
    }
    const source = viewRef.current.submission?.paymentSource;
    if (!source) {
      gateRef.current.leave();
      return;
    }
    const submission = {
      requestId: createRequestId(),
      paymentSource: clonePayer(source),
    };
    void execute(submission).finally(() => gateRef.current.leave());
  };

  const continuePayment = () => {
    const clientNow = Date.now();
    if (!canContinueAfterExpiry(viewRef.current, clientNow)) {
      return;
    }
    if (!gateRef.current.tryEnter()) {
      return;
    }
    const source = viewRef.current.submission?.paymentSource;
    if (!source) {
      gateRef.current.leave();
      return;
    }
    const submission = {
      requestId: createRequestId(),
      paymentSource: clonePayer(source),
    };
    void execute(submission).finally(() => gateRef.current.leave());
  };

  const offset = serverClockOffsetMs(
    view.serverTime,
    view.clockReceivedAt ?? now,
  );
  const retryRemaining = remainingMs(view.retryAllowedAt, offset, now);
  const quoteRemaining = view.quoteExpiresAt
    ? remainingMs(view.quoteExpiresAt, offset, now)
    : undefined;

  return {
    view,
    form,
    fieldErrors,
    setPhoneNumber: (phoneNumber: string) =>
      setForm((current) => ({ ...current, phoneNumber })),
    setFirstName: (firstName: string) =>
      setForm((current) => ({ ...current, firstName })),
    setLastName: (lastName: string) =>
      setForm((current) => ({ ...current, lastName })),
    submit,
    retry,
    requestAnotherPrompt,
    continuePayment,
    isSubmitting: view.phase === CheckoutPhases.SUBMITTING,
    canRequestAnother: canRequestAnotherPrompt(view, now),
    canContinue: canContinueAfterExpiry(view, now),
    canRetrySubmission: canRetryInterruptedSubmission(view),
    retryCountdownLabel:
      view.retryAllowedAt && retryRemaining > 0
        ? formatMinutesSeconds(retryRemaining)
        : "",
    quoteCountdownLabel:
      quoteRemaining !== undefined ? formatCountdown(quoteRemaining) : "",
    quoteExpired:
      view.quoteExpired ||
      (quoteRemaining !== undefined &&
        quoteRemaining <= 0 &&
        Boolean(view.quoteExpiresAt) &&
        view.phase !== CheckoutPhases.COLLECTING &&
        view.phase !== CheckoutPhases.SUBMITTING),
  };
}
