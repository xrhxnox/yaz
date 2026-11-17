import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Geist, Geist_Mono, Nunito, Pixelify_Sans, Playfair_Display, Space_Grotesk } from "next/font/google";
import { PAREJA } from "@/lib/config";
import { SCRIPT_TEMA } from "@/lib/tema";
import Cargador from "./componentes/Cargador";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Serif para números grandes, títulos y la pregunta del día (estilo diario)
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Letras opcionales del perfil (Personalizar → Letra)
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], style: ["normal", "italic"], preload: false });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], style: ["normal", "italic"], preload: false });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], preload: false });
const pixelify = Pixelify_Sans({ variable: "--font-pixelify", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: PAREJA,
  description: "Nuestro espacio a distancia",
  appleWebApp: { capable: true, title: PAREJA, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#14120f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${playfair.variable} ${grotesk.variable} ${nunito.variable} ${caveat.variable} ${pixelify.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Aplica el tema de quien entró antes de pintar, para que no parpadee */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Como app en el celular: franja del color de acento detrás de la barra de estado */}
        <div aria-hidden className="franja-app" />
        {/* Pantalla de carga hasta que todo aparece */}
        <Cargador />
        {children}
      </body>
    </html>
  );
}
