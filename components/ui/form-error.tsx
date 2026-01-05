import { LuTriangleAlert } from "react-icons/lu";

export const FormError = ({ message }: { message?: string }) => {
  if (!message) return null;

  return (
    <p className="mt-4 flex items-center gap-2.5 rounded-md bg-amber-100 px-4 py-3 text-sm tracking-wide text-amber-700 dark:bg-amber-500/10 dark:text-amber-500">
      <LuTriangleAlert className="size-5 shrink-0 stroke-[1.5]" />
      <span>{message}</span>
    </p>
  );
};
