import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider } from "@/components/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mafia Koi Marketplace — Tokopedia-nya Ikan Koi",
  description:
    "Marketplace premium khusus Nishikigoi. Multi-seller farm Indonesia, lelang realtime, live auction, dan komunitas elit koi.",
  keywords: [
    "koi",
    "nishikigoi",
    "lelang koi",
    "marketplace koi",
    "mafia koi",
    "showa",
    "kohaku",
    "sanke",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased selection:bg-koi-gold/40 selection:text-black`}
      >
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <SiteNavbar />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
