import { AlertCircle } from "lucide-react";

import { Card } from "@/components/ui/card";

export function KesFeeNotice() {
  return (
    <Card className="p-4 bg-orange-accent-bg border-orange-accent-border rounded-xl border-1 shadow-none">
      <div className="flex items-center gap-3">
        <div className="bg-white rounded-full p-2">
          <AlertCircle className="w-5 h-5 text-orange-accent-text flex-shrink-0" />
        </div>
        <div className="space-y-2 text-xs text-orange-accent-text font-inter font-normal leading-5">
          <p>
            This is the transaction amount only. Your mobile money provider may
            charge extra fees, so the amount you pay on your phone can be higher.
          </p>
          <p>Please do not close this tab until your payment has been confirmed.</p>
        </div>
      </div>
    </Card>
  );
}
