import webpush from "web-push"

import { formatCOP, numeroPedido, rpc } from "@/lib/tienda"

// Avisa a los celulares del equipo (cocina, caja, domicilios) que entró un pedido.
// Lo llama la página del cliente justo después de confirmar; la base de datos solo
// entrega los destinos una vez por pedido y si el pedido es real y reciente.

interface Destino { endpoint: string; keys: { p256dh: string; auth: string }; rol: string }
interface ParaPedido {
  vapid_publica: string
  vapid_privada: string
  pedido: { numero: number; tipo: string; zona: string; total: number; metodo: string | null; cliente: string; unidades: number }
  destinos: Destino[]
}

const RUTA_POR_ROL: Record<string, string> = { cocina: "/admin/cocina", caja: "/admin/caja", domicilios: "/admin/domicilios", mesero: "/admin/mesero" }

export async function POST(req: Request) {
  const secreto = process.env.PUSH_SECRETO
  if (!secreto) return Response.json({ ok: false, error: "Avisos no configurados" }, { status: 503 })

  const { id, token } = (await req.json().catch(() => ({}))) as { id?: string; token?: string }
  if (!id || !token) return Response.json({ ok: false }, { status: 400 })

  const datos = await rpc<ParaPedido | null>("tienda_push_para_pedido", { p_secreto: secreto, p_id: id, p_token: token }).catch(() => null)
  if (!datos || !datos.vapid_privada || datos.destinos.length === 0) return Response.json({ ok: true, enviados: 0 })

  webpush.setVapidDetails("https://arepasypataconesorigen.vercel.app", datos.vapid_publica, datos.vapid_privada)

  const p = datos.pedido
  const tipo = p.tipo === "domicilio" ? `Domicilio ${p.zona}` : p.tipo === "mesa" ? "Mesa" : "Para recoger"
  const pago = p.metodo === "transferencia" ? "Transferencia por confirmar" : p.metodo === "efectivo" ? "Efectivo" : ""
  const cuerpo = [tipo, `${p.unidades} ${p.unidades === 1 ? "producto" : "productos"}`, formatCOP(p.total), pago].filter(Boolean).join(" · ")

  const resultados = await Promise.allSettled(
    datos.destinos.map((d) =>
      webpush.sendNotification(
        { endpoint: d.endpoint, keys: d.keys },
        JSON.stringify({
          title: `🌽 Nuevo pedido ${numeroPedido(p.numero)} · Origen`,
          body: p.cliente ? `${p.cliente} — ${cuerpo}` : cuerpo,
          url: RUTA_POR_ROL[d.rol] ?? "/admin",
          tag: `pedido-${p.numero}`,
        }),
        { TTL: 600, urgency: "high" }
      )
    )
  )

  // Celulares que ya no aceptan avisos (desinstalaron o quitaron el permiso): se borran.
  await Promise.all(
    resultados.map((r, i) => {
      const code = r.status === "rejected" ? (r.reason as { statusCode?: number })?.statusCode : undefined
      return code === 404 || code === 410 ? rpc("tienda_push_borrar", { p_secreto: secreto, p_endpoint: datos.destinos[i].endpoint }).catch(() => {}) : null
    })
  )

  return Response.json({ ok: true, enviados: resultados.filter((r) => r.status === "fulfilled").length })
}
