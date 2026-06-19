import "./globals.css";
import type { Metadata } from "next";
import Shell from "@/components/Shell";
export const metadata: Metadata = { title: "Nexusaigear", description: "Multi-provider prompt assistant + generative studio" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `try{var s=JSON.parse(localStorage.getItem('nexus-settings')||'{}').state||{};var m=s.mode||'dark';document.documentElement.setAttribute('data-mode',m==='light'?'light':'dark');document.documentElement.setAttribute('data-palette',s.palette||'stitch');}catch(e){document.documentElement.setAttribute('data-mode','dark');document.documentElement.setAttribute('data-palette','stitch');}` }} />
      </head>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
