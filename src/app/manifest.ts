import type { MetadataRoute } from "next"

// Permite instalar Origen en la pantalla de inicio (necesario en iPhone para recibir avisos).
// Sin start_url: cada quien abre la app donde la instaló (clientes en el menú, cocina en /admin/cocina…).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Origen — Arepas y patacones",
    short_name: "Origen",
    description: "Pide arepas y patacones artesanales. Domicilio a Chía, Cajicá y Cota.",
    scope: "/",
    display: "standalone",
    background_color: "#0C0907",
    theme_color: "#0C0907",
    icons: [
      { src: "/img/logo-origen-2026.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  }
}
