const CANONICAL_KENYAN_PHONE = /^\+254[17]\d{8}$/;

export const normalizeKenyanPhone = (input: string): string | null => {
  const compact = input.trim().replace(/[\s()-]/g, "");
  if (!compact) {
    return null;
  }
  if (CANONICAL_KENYAN_PHONE.test(compact)) {
    return compact;
  }
  if (/^254[17]\d{8}$/.test(compact)) {
    return `+${compact}`;
  }
  if (/^0[17]\d{8}$/.test(compact)) {
    return `+254${compact.slice(1)}`;
  }
  if (/^[17]\d{8}$/.test(compact)) {
    return `+254${compact}`;
  }
  return null;
};

export const isCanonicalKenyanPhone = (phoneNumber: string): boolean => {
  return CANONICAL_KENYAN_PHONE.test(phoneNumber);
};
