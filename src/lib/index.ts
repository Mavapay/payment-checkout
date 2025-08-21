import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export * from "./amount";
export * from "./time";

export const copyToClipboard = async (value: string) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (e) {
    console.error("Failed to copy, using fallback", e);
    // Fallback for browsers that don't support clipboard API
    const textArea = document.createElement("textarea");
    textArea.value = value;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      console.error("Failed to copy:", e);
    }
    document.body.removeChild(textArea);
  }
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
