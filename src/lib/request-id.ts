export const createRequestId = (): string => {
  return crypto.randomUUID();
};
