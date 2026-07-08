import "./globals.css";
import type { Metadata } from "next";
import Shell from "@/components/Shell";
import AuthProvider from "@/components/AuthProvider";
import AuthGate from "@/components/AuthGate";
export const metadata: Metadata = { title: "Nexusaigear", description: "Multi-provider prompt assistant + generative studio" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* AuthProvider is inert (no session, passthrough) unless the web build
            has Supabase configured. AuthGate only gates content when WEB_MODE. */}
        <AuthProvider>
          <Shell><AuthGate>{children}</AuthGate></Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
