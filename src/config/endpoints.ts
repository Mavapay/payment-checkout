import { API_BASE_URL } from "./process";
import { PaymentMethodType } from "@/types/payment";

export const getPaymentEndpoints = ({
  id,
  orderId,
  paymentMethod,
}: {
  id?: string;
  orderId?: string;
  paymentMethod?: PaymentMethodType;
}) => {
  const baseUrl = API_BASE_URL;
  let getPaymentDetails = `${baseUrl}/paymentlink/details?id=${id}`;
  if (paymentMethod) {
    getPaymentDetails += `&paymentMethod=${paymentMethod}`;
  }
  return {
    getPaymentDetails,
    getPaymentStatus: `${baseUrl}/paymentlink/status?orderId=${orderId}`,
    refreshPayment: `${baseUrl}/paymentlink/refresh?id=${id}&paymentMethod=${paymentMethod}`,
  };
};
