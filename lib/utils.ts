import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

// CSS utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format only as date
export const formatDate = (date: string | Date) => {
  if (!date) return;

  return format(new Date(date), "dd MMM yyyy");
};

// Format as date and time
export const formatDateTime = (date: string | Date) => {
  if (!date) return;

  return format(new Date(date), "dd MMM yyyy - hh:mm a");
};

// Get initials from name (first 2 letters)
export const getInitials = (name: string): string => {
  if (!name) return "??";
  
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    // First letter of first two words
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  // If only one word, take first 2 characters
  return name.slice(0, 2).toUpperCase();
};
