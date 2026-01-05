"use client";

import { ProgressProvider as AppProgressProvider } from "@bprogress/next/app";

export const ProgressProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <AppProgressProvider
      color="var(--primary)"
      options={{ showSpinner: false }}
    >
      {children}
    </AppProgressProvider>
  );
};
