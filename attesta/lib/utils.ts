import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard shadcn/ui helper for conditionally joining and de-duping Tailwind
// classes. Requires `clsx` and `tailwind-merge` (both installed by
// `npx shadcn-ui@latest init`).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
