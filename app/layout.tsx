import "@/lib/orpc/server";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { ProgressProvider } from "@/providers/progress-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { TanstackQueryProvider } from "@/providers/tanstack-query-provider";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settingsPath = path.join(process.cwd(), "public", "platform-settings.json");
    
    if (!existsSync(settingsPath)) {
      return {
        title: "Law Firm Dashboard",
        description: "Professional immigration law firm management system",
      };
    }

    const settingsData = await readFile(settingsPath, "utf-8");
    const settings = JSON.parse(settingsData);

    return {
      title: settings.title || "Law Firm Dashboard",
      description: settings.description || "Professional immigration law firm management system",
    };
  } catch (error) {
    console.error("Error loading metadata from platform settings:", error);
    return {
      title: "Law Firm Dashboard",
      description: "Professional immigration law firm management system",
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider attribute="class" enableSystem disableTransitionOnChange>
          <TanstackQueryProvider>
            <ProgressProvider>
              {children}
              <Toaster />
            </ProgressProvider>
          </TanstackQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
