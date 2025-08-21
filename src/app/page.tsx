import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Logo } from "@/public/icons/logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-green-accent-bg flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center font-sans">
        <div className="flex items-center justify-center mb-4 w-fit mx-auto">
          <Logo className="w-auto h-10" />
        </div>
        <h1 className="text-2xl font-bold mb-4 text-green-accent-text">
          Mavapay Payment Checkout App
        </h1>
        <p className="text-gray-600 mb-6 font-inter">
          This is the Mavapay Payment Checkout App. It is a simple app that
          allows you to receive payments from your customers anywhere in the
          world with Mavapay.
        </p>
        <p className="text-sm text-gray-500 mt-4 font-inter">
          To learn more about the Mavapay Payment Checkout App, please visit the{" "}
          <Link
            href="https://mavapay.co"
            className="text-green-accent-text underline"
          >
            Mavapay website
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
