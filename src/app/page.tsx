import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  const generateRandomId = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Payment Checkout Demo</h1>
        <p className="text-gray-600 mb-6">
          This is a demo of a payment checkout page built with Next.js and
          shadcn/ui.
        </p>
        <Link href={`/checkout/${generateRandomId()}`}>
          <Button className="w-full">View Demo Checkout Page</Button>
        </Link>
        <p className="text-sm text-gray-500 mt-4">
          In a real implementation, users would access checkout pages via unique
          payment URLs.
        </p>
      </Card>
    </div>
  );
}
