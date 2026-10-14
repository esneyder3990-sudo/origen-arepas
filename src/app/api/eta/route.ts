import { type Pedido, rpc } from "@/lib/tienda"

// Tiempo aproximado de llegada de un domicilio que ya salió, con tráfico en vivo (Google Routes API).
// Se valida con el id y el token del pedido, igual que la página de seguimiento.
const CLAVE = process.env.GOOGLE_MAPS_API_KEY
const ORIGEN = process.env.ORIGEN_UBICACION // "lat,lng" o una dirección escrita

const punto = (texto: string) => {
  const m = texto.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  return m ? { location: { latLng: { latitude: +m[1], longitude: +m[2] } } } : { address: texto }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id") ?? ""
  const token = searchParams.get("token") ?? ""
  if (!CLAVE || !ORIGEN) return Response.json({ minutos: null })

  const pedido = await rpc<Pedido | null>("tienda_ver_pedido", { p_id: id, p_token: token }).catch(() => null)
  if (!pedido || pedido.tipo !== "domicilio" || pedido.estado !== "en_camino") return Response.json({ minutos: null })

  const destino =
    pedido.lat !== null && pedido.lng !== null
      ? { location: { latLng: { latitude: pedido.lat, longitude: pedido.lng } } }
      : { address: `${pedido.direccion}, ${pedido.zona_nombre}, Cundinamarca, Colombia` }

  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": CLAVE,
      "X-Goog-FieldMask": "routes.duration",
    },
    body: JSON.stringify({
      origin: punto(ORIGEN),
      destination: destino,
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      languageCode: "es-CO",
      regionCode: "CO",
    }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)

  const data = res?.ok ? ((await res.json().catch(() => null)) as { routes?: { duration?: string }[] } | null) : null
  const seg = parseInt(data?.routes?.[0]?.duration ?? "", 10)
  if (!Number.isFinite(seg)) return Response.json({ minutos: null })
  return Response.json({ minutos: Math.max(1, Math.round(seg / 60)) }, { headers: { "Cache-Control": "no-store" } })
}
