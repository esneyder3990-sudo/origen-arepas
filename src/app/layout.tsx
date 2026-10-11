import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  style: ["normal", "italic"],
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const SITE_URL = "https://arepasypataconesorigen.vercel.app";
const TITLE = "Origen — Pide en línea arepas y patacones | Chía, Cajicá y Cota";
const DESCRIPTION =
  "Arepas rellenas y patacones artesanales de maíz peto. Pide en línea: domicilio a Chía $5.000, a Cajicá y Cota $10.000. Sabores de Colombia.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: SITE_URL,
    siteName: "Origen",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/img/og-image-2026.jpg",
        width: 1200,
        height: 630,
        alt: "Origen — Pide en línea arepas y patacones. Domicilio a Chía, Cajicá y Cota",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/img/og-image-2026.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
