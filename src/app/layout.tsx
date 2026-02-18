import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ToastProvider } from "@/components/Toast";
import { ClientProvider } from "@/context/ClientContext";
import { getClientConfig, getClientId } from "@/config/clients";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Dynamic metadata based on client
export async function generateMetadata(): Promise<Metadata> {
  const config = getClientConfig();
  return {
    title: `${config.brandName} Design Studio`,
    description: config.content.homeDescription,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clientId = getClientId();
  const config = getClientConfig(clientId);
  const themeClass = `theme-${config.id}`;

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJP.variable} ${themeClass} antialiased`}
      >
        <ClientProvider clientId={clientId}>
          <ToastProvider>
            <Navigation />
            <main>{children}</main>
          </ToastProvider>
        </ClientProvider>
      </body>
    </html>
  );
}
