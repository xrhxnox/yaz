import type { MetadataRoute } from "next";
import { PAREJA } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PAREJA,
    short_name: PAREJA,
    description: "Nuestro espacio a distancia",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f2",
    theme_color: "#18181b",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
