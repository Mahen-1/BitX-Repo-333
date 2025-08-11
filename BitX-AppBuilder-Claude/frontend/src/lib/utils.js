import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"; // ✅ This is CORRECT
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
