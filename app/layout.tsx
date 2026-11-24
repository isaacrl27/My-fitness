import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { DatosProvider } from "@/lib/store";
import { SCRIPT_TEMA } from "@/lib/tema";
import { SCRIPT_TAMANO } from "@/lib/tamano";
import { CargaInicial } from "@/components/app/carga-inicial";

export const metadata: Metadata = {
  title: "My Fitness",
  description: "App personal para comer mejor y cuidarte",
  applicationName: "My Fitness",
  // Que no la indexe ningún buscador (la puerta la cierra el middleware).
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "My Fitness",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0e5f49" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1512" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased bg-bg text-ink" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <Script id="tema" strategy="beforeInteractive">
          {SCRIPT_TEMA}
        </Script>
        <Script id="tamano" strategy="beforeInteractive">
          {SCRIPT_TAMANO}
        </Script>
        <DatosProvider>
          <CargaInicial />
          {children}
        </DatosProvider>
      </body>
    </html>
  );
}
