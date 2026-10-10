import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo en `next dev`: permite abrir el sitio desde el celular en la misma red WiFi.
  allowedDevOrigins: ["192.168.1.3"],
};

export default nextConfig;
