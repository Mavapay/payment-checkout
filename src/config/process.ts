export const API_BASE_URL =
  process.env.NEXT_PUBLIC_MAVAPAY_API_BASE_URL ||
  "http://localhost:8080/api/v1";
export const ZAR_INSTANT_PAYOUT_FEE = parseFloat(
  process.env.ZAR_INSTANT_PAYOUT_FEE || "20"
);
