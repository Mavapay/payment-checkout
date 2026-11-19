import { PayerPayload } from "@/types/payment";

import { isCanonicalKenyanPhone, normalizeKenyanPhone } from "./phone";

export interface PayerFieldErrors {
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
}

export interface PayerInput {
  phoneNumber: string;
  firstName: string;
  lastName: string;
}

const NAME_MAX_LENGTH = 100;

export const normalizePersonName = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > NAME_MAX_LENGTH) {
    return null;
  }
  return trimmed;
};

export const validatePayer = (
  input: PayerInput,
): { ok: true; value: PayerPayload } | { ok: false; errors: PayerFieldErrors } => {
  const errors: PayerFieldErrors = {};
  const phoneNumber = normalizeKenyanPhone(input.phoneNumber);
  const firstName = normalizePersonName(input.firstName);
  const lastName = normalizePersonName(input.lastName);

  if (!phoneNumber || !isCanonicalKenyanPhone(phoneNumber)) {
    errors.phoneNumber =
      "Enter a Kenyan mobile number, for example 0712345678 or +254712345678.";
  }
  if (!input.firstName.trim()) {
    errors.firstName = "First name is required.";
  } else if (!firstName) {
    errors.firstName = "First name must be 100 characters or fewer.";
  }
  if (!input.lastName.trim()) {
    errors.lastName = "Last name is required.";
  } else if (!lastName) {
    errors.lastName = "Last name must be 100 characters or fewer.";
  }

  if (errors.phoneNumber || errors.firstName || errors.lastName || !phoneNumber || !firstName || !lastName) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      phoneNumber,
      firstName,
      lastName,
    },
  };
};
