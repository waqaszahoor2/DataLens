import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "DataLens — AI-Powered Data Analysis Platform",
  description: "DataLens: Import, clean, transform, and visualize your data with AI assistance. Build stunning dashboards in minutes.",
  keywords: ["data analysis", "AI", "dashboard", "visualization", "charts", "CSV", "analytics"],
  authors: [{ name: "DataLens" }],
  openGraph: {
    title: "DataLens — AI-Powered Data Analysis Platform",
    description: "Import, transform, and visualize your data with AI assistance.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased bg-surface2 text-text-primary">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { fontFamily: "DM Sans, sans-serif", fontSize: "14px" },
          }}
        />
      </body>
    </html>
  );
}
