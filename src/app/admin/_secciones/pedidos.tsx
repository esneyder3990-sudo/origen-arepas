"use client"

import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { Check, ChevronLeft, ChevronRight, MessageCircle, Printer, Trash2, X } from "lucide-react"

import { Boton, SelectorCuenta, Tarjeta, Toast, useAdmin, usePedidos, useToast } from "@/components/tienda/admin"
import { BotonCerrar, Cargando, EASE, Etiqueta, Hoja, inputCls } from "@/components/tienda/ui"
import { type EstadoPedido, type Pedido, ESTADO_LABEL, TIPO_LABEL, formatCOP, mapaPedido, numeroInterno, resumenPedido, waLink, textoAdiciones } from "@/lib/tienda"
import { imprimirTicket } from "@/lib/ticket"
import { cn } from "@/lib/utils"
import { useAjustes } from "./horario"

const hoyBogota = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
const aFecha = (s: string) => new Date(`${s}T12:00:00Z`)
const sumarDias = (s: string, n: number) => {
  const d = aFecha(s)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const sumarMeses = (s: string, n: number) => {
  const d = aFecha(s)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}
const diasEntre = (a: string, b: string) => Math.round((+aFecha(b) - +aFecha(a)) / 86400000)
const corta = (s: string) => aFecha(s).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })

type Modo = "rapido" | "ciclo" | "fechas"

export function SeccionPedidos() {
  const { ajustes } = useAjustes()
  const [modo, setModo] = useState<Modo>("rapido")
  const [dias, setDias] = useState(7)
  const [desplazar, setDesplazar] = useState(0)
  const [propio, setPropio] = useState(() => ({ desde: sumarDias(hoyBogota(), -6), hasta: hoyBogota() }))

  // Ciclo de cuentas (por defecto del 27 al 26, igual que Finanzas): del día de corte hasta el día antes del mes siguiente.
  const corte = Math.min(Math.max(ajustes?.ciclo_dia ?? 27, 1), 28)
  const rango = useMemo(() => {
    if (modo === "rapido") return null
    if (modo === "fechas") return propio
    const hoy = hoyBogota()
    const base = `${hoy.slice(0, 7)}-${String(corte).padStart(2, "0")}`
    const ini = sumarMeses(Number(hoy.slice(8, 10)) >= corte ? base : sumarMeses(base, -1), desplazar)
    return { desde: ini, hasta: sumarDias(sumarMeses(ini, 1), -1) }
  }, [modo, propio, corte, desplazar])
  // Cuántos días hacia atrás hay que pedir al servidor para cubrir el período elegido.
  const diasPedir = rango ? Math.max(diasEntre(rango.desde, hoyBogota()) + 1, 1) : dias
  const { pedidos: todos, actualizar, recargar } = usePedidos(6000, diasPedir)
  const pedidos = todos && (rango ? todos.filter((p) => p.fecha >= rango.desde && p.fecha <= rango.hasta) : todos)
  const [sel, setSel] = useState<string | null>(null)
  const { texto, mostrar } = useToast()

  if (!pedidos) return <Cargando />
  const hoy = pedidos.filter((p) => p.fecha === hoyBogota() && p.estado !== "cancelado")
  const vendido = pedidos.filter((p) => p.estado !== "cancelado").reduce((s, p) => s + p.total, 0)
  const pendientes = pedidos.filter((p) => p.metodo_pago === "transferencia" && !p.pago_confirmado && p.estado !== "cancelado").length
  const pedido = pedidos.find((p) => p.id === sel) ?? null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Dato etiqueta="Pedidos hoy" valor={String(hoy.length)} />
        <Dato etiqueta="Ingresos hoy" valor={formatCOP(hoy.reduce((s, p) => s + p.total, 0))} acento />
        <Dato etiqueta="Pagos por confirmar" valor={String(pendientes)} className="col-span-2 sm:col-span-1" />
      </div>

      <Tarjeta>
        <div className="flex items-baseline justify-between gap-3 border-b border-paper/10 px-4 py-3">
          <p className="font-display text-xl">Todos los pedidos</p>
          <Etiqueta>Toca un pedido para ver el detalle</Etiqueta>
        </div>
        <div className="space-y-3 border-b border-paper/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {([[7, "7 días"], [30, "30 días"], [90, "90 días"], [3650, "Todo"]] as const).map(([d, nombre]) => (
              <button
                key={d}
                type="button"
                onClick={() => { setModo("rapido"); setDias(d) }}
                className={cn("border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition", modo === "rapido" && dias === d ? "border-achiote bg-achiote/15 text-paper" : "border-paper/15 text-paper/80 hover:border-paper/40")}
              >
                {nombre}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setModo("ciclo"); setDesplazar(0) }}
              className={cn("border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition", modo === "ciclo" ? "border-achiote bg-achiote/15 text-paper" : "border-paper/15 text-paper/80 hover:border-paper/40")}
            >
              Ciclo {corte}→{corte === 1 ? "fin de mes" : corte - 1}
            </button>
            <button
              type="button"
              onClick={() => setModo("fechas")}
              className={cn("border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition", modo === "fechas" ? "border-achiote bg-achiote/15 text-paper" : "border-paper/15 text-paper/80 hover:border-paper/40")}
            >
              Elegir fechas
            </button>
          </div>
          {modo === "ciclo" && rango && (
            <div className="flex items-center justify-between gap-2 border border-paper/12 px-3 py-2">
              <button type="button" aria-label="Ciclo anterior" onClick={() => setDesplazar((x) => x - 1)} className="p-1 text-paper/80 hover:text-tostado"><ChevronLeft className="h-4 w-4" /></button>
              <span className="font-mono text-xs">{corta(rango.desde)} → {corta(rango.hasta)}{desplazar === 0 ? " · ciclo actual" : ""}</span>
              <button type="button" aria-label="Ciclo siguiente" disabled={desplazar >= 0} onClick={() => setDesplazar((x) => Math.min(x + 1, 0))} className="p-1 text-paper/80 hover:text-tostado disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
          {modo === "fechas" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Etiqueta className="mb-1.5">Desde</Etiqueta>
                <input type="date" className={inputCls} max={propio.hasta} value={propio.desde} onChange={(e) => e.target.value && setPropio((r) => ({ ...r, desde: e.target.value }))} />
              </label>
              <label className="block">
                <Etiqueta className="mb-1.5">Hasta</Etiqueta>
                <input type="date" className={inputCls} min={propio.desde} max={hoyBogota()} value={propio.hasta} onChange={(e) => e.target.value && setPropio((r) => ({ ...r, hasta: e.target.value }))} />
              </label>
            </div>
          )}
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/80">
            {pedidos.length} pedidos · vendido {formatCOP(vendido)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.15em] text-paper/65">
                {["#", "Hora", "Tipo", "Pago", "Total", "Estado"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  onClick={() => setSel(p.id)}
                  className="cursor-pointer border-t border-paper/8 transition hover:bg-achiote/[0.06]"
                >
                  <td className="px-4 py-3 font-mono font-bold">{numeroInterno(p)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-paper/80">
                    {new Date(p.creado).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">{TIPO_LABEL[p.tipo]}{p.mesa_nombre ? ` · ${p.mesa_nombre}` : ""}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize">{p.cuenta || p.metodo_pago || "—"}</span>
                    {p.metodo_pago === "transferencia" && !p.pago_confirmado && p.estado !== "cancelado" && <Insignia className="ml-2">Sin confirmar</Insignia>}
                  </td>
                  <td className="px-4 py-3 font-mono text-tostado">{formatCOP(p.total)}</td>
                  <td className="px-4 py-3"><EstadoInsignia estado={p.estado} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {pedidos.length === 0 && <p className="px-4 py-12 text-center text-sm text-paper/75">Todavía no hay pedidos. Comparte el enlace /pedir con tus clientes.</p>}
        </div>
      </Tarjeta>

      <DetallePedido
        pedido={pedido}
        onCerrar={() => setSel(null)}
        onActualizar={async (cambios, msg) => {
          await actualizar(pedido!.id, cambios)
          mostrar(msg)
        }}
        onBorrado={() => {
          setSel(null)
          recargar()
          mostrar("Pedido borrado")
        }}
      />
      <Toast texto={texto} />
    </div>
  )
}

export function DetallePedido({
  pedido,
  onCerrar,
  onActualizar,
  onBorrado,
}: {
  pedido: Pedido | null
  onCerrar: () => void
  onActualizar: (cambios: Partial<Pick<Pedido, "estado" | "pago_confirmado" | "cuenta">>, msg: string) => Promise<void>
  onBorrado?: () => void
}) {
  const { llamar } = useAdmin()
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [cuenta, setCuenta] = useState("")
  const p = pedido
  const pendiente = p?.metodo_pago === "transferencia" && !p.pago_confirmado && p.estado !== "cancelado"
  const estados: EstadoPedido[] = p?.tipo === "domicilio" ? ["recibido", "preparacion", "listo", "en_camino", "entregado"] : ["recibido", "preparacion", "listo", "entregado"]

  return (
    <Hoja abierta={!!p} onCerrar={() => { setConfirmarBorrar(false); onCerrar() }} titulo="Detalle del pedido">
      {p && (
        <>
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <div>
              <p className="font-sans text-3xl font-bold">{numeroInterno(p)}</p>
              <Etiqueta>{TIPO_LABEL[p.tipo]}{p.mesa_nombre ? ` · ${p.mesa_nombre}` : ""} · {new Date(p.creado).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</Etiqueta>
            </div>
            <BotonCerrar onClick={onCerrar} />
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5">
            {(p.cliente_nombre || p.direccion) && (
              <div className="space-y-1 border-y border-paper/10 py-3 text-sm">
                {p.cliente_nombre && <p>{p.cliente_nombre} · <a className="text-tostado underline" href={`tel:${p.cliente_celular}`}>{p.cliente_celular}</a></p>}
                {p.tipo === "domicilio" && (
                  <>
                    <p className="text-paper/80">{p.direccion}</p>
                    <Etiqueta>Zona: {p.zona_nombre}</Etiqueta>
                    <a href={mapaPedido(p)} target="_blank" rel="noopener noreferrer" className="inline-block font-mono text-[10px] uppercase tracking-[0.12em] text-tostado underline">
                      {p.lat !== null ? "📍 Ver ubicación GPS" : "Ver dirección en el mapa"}
                    </a>
                    {p.nota_domiciliario && <p className="text-xs italic text-paper/80">“{p.nota_domiciliario}”</p>}
                  </>
                )}
              </div>
            )}
            <div>
              <Etiqueta className="mb-2">Productos</Etiqueta>
              <ul className="space-y-2 text-sm">
                {p.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      <b className="text-tostado">{it.cantidad}x</b> {it.nombre}
                      {it.adiciones.length > 0 && <span className="block text-xs text-paper/75">+ {textoAdiciones(it.adiciones)}</span>}
                      {it.nota && <span className="block text-xs italic text-paper/75">“{it.nota}”</span>}
                    </span>
                    <span className="font-mono">{formatCOP(it.total)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 border-t border-paper/10 pt-3 font-mono text-xs">
                {p.descuento > 0 && <p className="flex justify-between text-paper/80"><span>Descuento {p.cupon}</span><span>−{formatCOP(p.descuento)}</span></p>}
                {p.domicilio > 0 && <p className="flex justify-between text-paper/80"><span>Domicilio</span><span>{formatCOP(p.domicilio)}</span></p>}
                <p className="flex items-baseline justify-between"><span className="uppercase tracking-[0.1em] text-paper/80">Total</span><span className="font-display text-3xl text-achiote">{formatCOP(p.total)}</span></p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Etiqueta>Método de pago</Etiqueta>
              <span className="capitalize">{p.metodo_pago ?? "—"}{p.cuenta ? ` · ${p.cuenta}` : ""}</span>
              {pendiente && <Insignia>Pago sin confirmar</Insignia>}
              {p.metodo_pago === "transferencia" && p.pago_confirmado && <Insignia tono="ok">Confirmado</Insignia>}
            </div>

            {p.estado !== "cancelado" && (
              <div>
                <Etiqueta className="mb-2">Estado</Etiqueta>
                <div className="flex flex-wrap gap-2">
                  {estados.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => onActualizar({ estado: e }, `Estado: ${ESTADO_LABEL[e]}`)}
                      className={cn(
                        "border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition",
                        p.estado === e ? "border-achiote bg-achiote/20 text-paper" : "border-paper/15 text-paper/80 hover:border-paper/40"
                      )}
                    >
                      {ESTADO_LABEL[e]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              {pendiente && (
                <div className="space-y-2 border border-achiote/40 bg-achiote/[0.06] p-3">
                  <SelectorCuenta grupo={`confirmar-${p.id}`} valor={cuenta} onCambio={setCuenta} titulo="¿A qué cuenta llegó la transferencia?" />
                  <Boton
                    className="w-full"
                    disabled={!cuenta}
                    onClick={async () => {
                      await onActualizar({ pago_confirmado: true, cuenta }, `Pago confirmado en ${cuenta} — el pedido ya está visible en cocina`)
                      setCuenta("")
                    }}
                  >
                    <Check className="h-4 w-4" /> Confirmar pago {cuenta ? `en ${cuenta}` : ""} y enviar a cocina
                  </Boton>
                </div>
              )}
              {p.cliente_celular && (
                <a
                  href={waLink(p.cliente_celular.replace(/\D/g, "").length === 10 ? `57${p.cliente_celular.replace(/\D/g, "")}` : p.cliente_celular, `Hola ${p.cliente_nombre}, te escribimos de Origen 🌽\n\n${resumenPedido(p)}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-paper/20 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] hover:border-achiote"
                >
                  <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
                </a>
              )}
              <Boton variante="borde" onClick={() => imprimirTicket(p)}>
                <Printer className="h-4 w-4" /> Imprimir
              </Boton>
              {p.estado !== "cancelado" && (
                <Boton variante="peligro" onClick={() => onActualizar({ estado: "cancelado" }, "Pedido cancelado")}>
                  <X className="h-4 w-4" /> Cancelar pedido
                </Boton>
              )}
              {onBorrado &&
                (confirmarBorrar ? (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }} className="flex gap-2">
                    <Boton variante="peligro" className="flex-1" onClick={async () => { await llamar("tienda_admin_borrar_pedido", { p_id: p.id }); setConfirmarBorrar(false); onBorrado() }}>
                      Sí, borrar para siempre
                    </Boton>
                    <Boton variante="borde" onClick={() => setConfirmarBorrar(false)}>No</Boton>
                  </motion.div>
                ) : (
                  <Boton variante="peligro" onClick={() => setConfirmarBorrar(true)}>
                    <Trash2 className="h-4 w-4" /> Borrar pedido
                  </Boton>
                ))}
            </div>
          </div>
        </>
      )}
    </Hoja>
  )
}

export function Dato({ etiqueta, valor, acento, className }: { etiqueta: string; valor: string; acento?: boolean; className?: string }) {
  return (
    <Tarjeta className={cn("p-4", className)}>
      <Etiqueta>{etiqueta}</Etiqueta>
      <motion.p key={valor} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-1 font-display text-3xl", acento && "text-achiote")}>
        {valor}
      </motion.p>
    </Tarjeta>
  )
}

export function Insignia({ children, tono = "alerta", className }: { children: React.ReactNode; tono?: "alerta" | "ok" | "neutro"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]",
        tono === "alerta" && "border-achiote/60 bg-achiote/15 text-tostado",
        tono === "ok" && "border-paper/30 bg-paper/10 text-paper",
        tono === "neutro" && "border-paper/15 text-paper/75",
        className
      )}
    >
      {children}
    </span>
  )
}

export function EstadoInsignia({ estado }: { estado: EstadoPedido }) {
  const tono = estado === "cancelado" ? "neutro" : estado === "entregado" ? "ok" : "alerta"
  return <Insignia tono={tono} className={estado === "cancelado" ? "line-through" : ""}>{ESTADO_LABEL[estado]}</Insignia>
}
