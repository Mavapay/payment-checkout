import { cn } from "@/lib";

export const Spinner = ({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "min-h-screen bg-gray-50 flex items-center justify-center",
        className
      )}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        {message && <div className="text-gray-600">{message}</div>}
      </div>
    </div>
  );
};
