import { CheckoutPage } from '@/components/CheckoutPage';

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
}

export default async function Checkout({ params }: CheckoutPageProps) {
  const { id } = await params;
  
  return <CheckoutPage paymentId={id} />;
}
