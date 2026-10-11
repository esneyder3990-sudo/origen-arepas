// Cliente de la tienda de Origen. Todo pasa por funciones de Supabase
// (`tienda_*`) — las tablas no son legibles directo, así que la llave
// publicable puede vivir en el navegador sin exponer datos.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hlgiuidjbwjqlfqqhimf.supabase.co"
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_9YJZ7QXHJ4PsnYUoGvp8lA_nYjtwzII"

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message ?? "No se pudo conectar. Intenta de nuevo.")
  return data as T
}

export interface Categoria { id: number; nombre: string; icono: string; orden: number; activo: boolean }
export interface Producto {
  id: number; categoria_id: number; nombre: string; descripcion: string; precio: number; costo?: number
  imagen: string; aplica_adiciones: "arepa" | "patacon" | "ninguna"; sugerido: boolean; orden: number; activo: boolean
}
export interface Adicion { id: number; nombre: string; precio: number; imagen: string; aplica: "arepa" | "patacon" | "todos"; orden: number; activo: boolean }
export interface Zona { id: number; nombre: string; tarifa: number; orden: number; activo: boolean }
export interface Mesa { id: number; nombre: string; orden: number; activo: boolean }
export interface Cupon { id: number; codigo: string; tipo: "porcentaje" | "valor"; valor: number; compra_minima: number; activo: boolean }
export interface Insumo { id: number; nombre: string; unidad: string; tipo: "ingrediente" | "empaque"; stock: number; costo_unidad: number; stock_minimo: number }
export interface DiaHorario { abierto: boolean; abre: string; cierra: string }
export interface Ajustes {
  whatsapp: string
  transferencia: string
  pedido_minimo_domicilio: number
  tiempo_entrega: string
  mesas_activas: boolean
  cerrado_manual: boolean
  horario: DiaHorario[]
  fidelizacion: { activo: boolean; cada_n: number; recompensa: string }
  ciclo_dia?: number
}
export interface Menu {
  categorias: Categoria[]; productos: Producto[]; adiciones: Adicion[]; zonas: Zona[]; mesas: Mesa[]
  ajustes: Ajustes; abierto: boolean
}

export type TipoPedido = "domicilio" | "recoger" | "mesa"
export type EstadoPedido = "recibido" | "preparacion" | "listo" | "en_camino" | "entregado" | "cancelado"
export interface ItemPedido {
  producto_id: number; nombre: string; precio: number; cantidad: number
  adiciones: { id: number; nombre: string; precio: number }[]; nota: string; total: number
}
export interface Pedido {
  id: string; numero: number; fecha: string; creado: string; actualizado: string
  tipo: TipoPedido; estado: EstadoPedido
  cliente_nombre: string; cliente_celular: string; direccion: string
  zona_id: number | null; zona_nombre: string; nota_domiciliario: string
  lat: number | null; lng: number | null
  mesa_id: number | null; mesa_nombre: string
  metodo_pago: "efectivo" | "transferencia" | "rappi" | "otro" | null; pago_confirmado: boolean; cerrado: boolean
  items: ItemPedido[]; subtotal: number; descuento: number; cupon: string; domicilio: number; total: number
  origen: "cliente" | "personal" | "importado"
  transferencia?: string; whatsapp?: string
}

export const formatCOP = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("es-CO")}`
export const numeroPedido = (n: number) => `#${String(n).padStart(3, "0")}`

export const TIPO_LABEL: Record<TipoPedido, string> = { domicilio: "Domicilio", recoger: "Recoger", mesa: "Mesa" }
export const ESTADO_LABEL: Record<EstadoPedido, string> = {
  recibido: "Recibido",
  preparacion: "En preparación",
  listo: "Listo",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

// El pedido sale a cocina solo cuando ya se sabe que está pago (o es efectivo
// / lo tomó el personal): así no se cocina algo de una transferencia que nunca llegó.
export const visibleEnCocina = (p: Pedido) =>
  p.estado !== "cancelado" && (p.origen === "personal" || p.metodo_pago !== "transferencia" || p.pago_confirmado)

export const mesaOcupada = (pedidos: Pedido[], mesaId: number) =>
  pedidos.filter((p) => p.tipo === "mesa" && p.mesa_id === mesaId && !p.cerrado && p.estado !== "cancelado")

const minutos = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
export const hace = (iso: string) => {
  const m = minutos(iso)
  return m < 60 ? `Hace ${m} min` : `Hace ${Math.floor(m / 60)}h ${m % 60}m`
}
export const minutosDesde = minutos

/** Ruta en Google Maps: al punto GPS del cliente si lo compartió, si no a la dirección escrita. */
export const mapaPedido = (p: Pedido) =>
  p.lat !== null && p.lng !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.direccion}, ${p.zona_nombre}, Cundinamarca, Colombia`)}`

export const waLink = (numero: string, texto: string) =>
  `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`

/** "2× Queso extra, Piña" — agrupa adiciones repetidas (se pueden pedir varias veces). */
export function textoAdiciones(ads: { nombre: string }[]) {
  const n = new Map<string, number>()
  for (const a of ads) n.set(a.nombre, (n.get(a.nombre) ?? 0) + 1)
  return [...n].map(([nombre, c]) => (c > 1 ? `${c}× ${nombre}` : nombre)).join(", ")
}

export const resumenPedido = (p: Pedido) => {
  const lineas = p.items.map((i) => {
    const ads = i.adiciones.length ? ` (+ ${textoAdiciones(i.adiciones)})` : ""
    return `${i.cantidad}x ${i.nombre}${ads} — ${formatCOP(i.total)}`
  })
  const extra = [
    p.descuento ? `Descuento (${p.cupon}): -${formatCOP(p.descuento)}` : "",
    p.domicilio ? `Domicilio ${p.zona_nombre}: ${formatCOP(p.domicilio)}` : "",
  ].filter(Boolean)
  return [`Pedido ${numeroPedido(p.numero)} · Origen`, ...lineas, ...extra, `*Total: ${formatCOP(p.total)}*`].join("\n")
}

// ---------- almacenamiento local (siempre tolerante a fallos) ----------
export function leerLocal<T>(clave: string, defecto: T): T {
  try {
    const v = localStorage.getItem(clave)
    return v ? (JSON.parse(v) as T) : defecto
  } catch {
    return defecto
  }
}
export function guardarLocal(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {}
}
