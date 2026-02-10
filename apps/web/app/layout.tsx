import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/ui/providers/query-provider";
import { AuthProvider } from "@/ui/providers/auth-provider";
import { ToastProvider } from "@/ui/providers/toast-provider";
import { ErrorBoundary } from "@/ui/components/error-boundary";

const lato = Lato({
  weight: ["100", "300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SAL Accounting System",
  description: "Sistem akuntansi modern untuk pemasok F&B - Faktur, Stok, Laporan",
  keywords: ["akuntansi", "faktur", "inventaris", "F&B", "pemasok"],
};

/**
 * Root layout component that provides the HTML root and global application context.
 *
 * @param children - The page or app content to render inside the layout
 * @returns The HTML element tree with the Lato font applied and children wrapped by ErrorBoundary, QueryProvider, AuthProvider, and a sibling ToastProvider
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={lato.variable}>
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              {children}
              <ToastProvider />
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}