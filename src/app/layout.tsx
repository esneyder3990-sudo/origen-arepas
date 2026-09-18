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
const TITLE = "Origen — Arepas y patacones artesanales | Chía y Cajicá";
const DESCRIPTION =
  "Arepas rellenas y patacones 100% artesanales, maíz peto cocido y molido a mano. Domicilio en Chía y Cajicá. Pide por WhatsApp.";

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
        url: "/img/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Origen — Arepas y patacones artesanales, hecho a mano",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/img/og-image.jpg"],
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
