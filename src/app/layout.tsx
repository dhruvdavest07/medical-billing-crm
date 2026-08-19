import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pras75299-openhealthcrm.vercel.app/"),
  title: {
    default: "Healthcare CRM | Patient, Appointment & Billing Management",
    template: "%s | Healthcare CRM",
  },
  description:
    "Healthcare CRM for managing patients, appointments, encounters, prescriptions, billing, inventory, communications, and analytics in one platform.",
  keywords: [
    "Healthcare CRM",
    "Patient management software",
    "Appointment scheduling system",
    "Medical billing software",
    "Clinic management system",
    "Electronic medical records",
    "Healthcare analytics",
    "Prescription management",
  ],
  applicationName: "Healthcare CRM",
  authors: [{ name: "pras75299" }],
  creator: "pras75299",
  publisher: "pras75299",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Healthcare CRM | Patient, Appointment & Billing Management",
    description:
      "A modern healthcare CRM to manage patients, appointments, billing, prescriptions, communications, and analytics.",
    url: "https://pras75299-openhealthcrm.vercel.app/",
    siteName: "Healthcare CRM",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Healthcare CRM Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Healthcare CRM | Patient, Appointment & Billing Management",
    description:
      "Manage patients, appointments, billing, prescriptions, and analytics with a modern healthcare CRM.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Healthcare CRM",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "A comprehensive healthcare CRM for managing patients, appointments, encounters, prescriptions, billing, inventory, communications, and analytics.",
    url: "https://pras75299-openhealthcrm.vercel.app/",
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${plexMono.variable} min-h-screen antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
