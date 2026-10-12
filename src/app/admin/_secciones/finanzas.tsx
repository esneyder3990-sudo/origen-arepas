"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Banknote, Bike, ChevronDown, ChevronLeft, ChevronRight, Clock, Landmark, ShoppingBasket, Smartphone, TrendingUp } from "lucide-react"

import { Tarjeta, useAdmin } from "@/components/tienda/admin"
import { Cargando, EASE, Etiqueta, inputCls } from "@/components/tienda/ui"
import { Monto } from "@/components/tienda/vuelo"
import { formatCOP } from "@/lib/tienda"
import { cn } from "@/lib/utils"
import { ListaEditable } from "./comun"
import { useAjustes } from "./horario"

/* ------------------------------------------------------------------ tipos */

interface Bolsa { ventas: number; domicilios: number; pedidos: number }
interface Finanzas {
  desde: string
  hasta: string
  dias: number
  pedidos: number
  ventas: number
  domicilios: number
  compras: number
  gastos: number
  balance: number
  bolsas: Partial<Record<"efectivo" | "cuentas" | "pendiente" | "rappi" | "otro", Bolsa>>
  compras_metodo: Partial<Record<"efectivo" | "transferencia", number>>
  por_cuenta: Record<string, number>
  compras_por_cuenta: Record<string, number>
  lista_pedidos: { numero: number; fecha: string; tipo: string; zona: string; mesa: string; cliente: string; metodo: string | null; cuenta: string; bolsa: string; venta: number; domicilio: number; origen: string }[]
  lista_compras: { fecha: string; item: string; cantidad: number; unidad: string; precio: number; metodo: string; cuenta: string; factura: string }[]
  lista_gastos: { nombre: string; mensual: number; prorrateo: number }[]
}
interface Gasto { id: number; nombre: string; valor_mensual: number; activo: boolean }

type Modo = "hoy" | "semana" | "mes" | "ciclo" | "rango"

/* ------------------------------------------------------------------ fechas (hora Colombia) */

const iso = (d: Date) => d.toISOString().slice(0, 10)
const hoyISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
const fecha = (s: string) => new Date(`${s}T12:00:00Z`)
const sumarDias = (s: string, n: number) => {
  const d = fecha(s)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}
const sumarMeses = (s: string, n: number) => {
  const d = fecha(s)
  d.setUTCMonth(d.getUTCMonth() + n)
  return iso(d)
}
const corto = (s: string) => fecha(s).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" })
const largo = (s: string) => fecha(s).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })

function rangoDe(modo: Modo, desplazar: number, cicloDia: number, propio: { desde: string; hasta: string }) {
  const hoy = hoyISO()
  if (modo === "hoy") {
    const d = sumarDias(hoy, desplazar)
    return { desde: d, hasta: d }
  }
  if (modo === "semana") {
    const dow = (fecha(hoy).getUTCDay() + 6) % 7 // lunes = 0
    const lunes = sumarDias(hoy, -dow + desplazar * 7)
    return { desde: lunes, hasta: sumarDias(lunes, 6) }
  }
  if (modo === "mes") {
    const ini = sumarMeses(`${hoy.slice(0, 7)}-01`, desplazar)
    return { desde: ini, hasta: sumarDias(sumarMeses(ini, 1), -1) }
  }
  if (modo === "ciclo") {
    const dia = Math.min(Math.max(cicloDia || 1, 1), 28)
    const base = `${hoy.slice(0, 7)}-${String(dia).padStart(2, "0")}`
    const ini = sumarMeses(Number(hoy.slice(8, 10)) >= dia ? base : sumarMeses(base, -1), desplazar)
    return { desde: ini, hasta: sumarDias(sumarMeses(ini, 1), -1) }
  }
  return propio
}

/* ------------------------------------------------------------------ pantalla */

const MODOS: { id: Modo; label: string }[] = [
  { id: "hoy", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "ciclo", label: "Ciclo" },
  { id: "rango", label: "Fechas" },
]

export function SeccionFinanzas() {
  const { llamar } = useAdmin()
  const { ajustes, guardar } = useAjustes()
  const [modo, setModo] = useState<Modo>("ciclo")
  const [desplazar, setDesplazar] = useState(0)
  const [propio, setPropio] = useState(() => ({ desde: sumarDias(hoyISO(), -6), hasta: hoyISO() }))
  const [hoy, setHoy] = useState<Finanzas | null>(null)
  const [per, setPer] = useState<Finanzas | null>(null)
  const [recarga, setRecarga] = useState(0)

  const cicloDia = ajustes?.ciclo_dia ?? 1
  const rango = useMemo(() => rangoDe(modo, desplazar, cicloDia, propio), [modo, desplazar, cicloDia, propio])

  useEffect(() => {
    const d = hoyISO()
    llamar<Finanzas>("tienda_admin_finanzas", { p_desde: d, p_hasta: d }).then(setHoy).catch(() => {})
  }, [llamar, recarga])

  useEffect(() => {
    llamar<Finanzas>("tienda_admin_finanzas", { p_desde: rango.desde, p_hasta: rango.hasta }).then(setPer).catch(() => {})
  }, [llamar, rango.desde, rango.hasta, recarga])

  if (!hoy || !per || !ajustes) return <Cargando />

  const nombrePeriodo =
    modo === "hoy" ? (desplazar === 0 ? "hoy" : "del día") : modo === "semana" ? "de la semana" : modo === "mes" ? "del mes" : modo === "ciclo" ? "del ciclo" : "del período"

  return (
    <div className="space-y-10">
      {/* ---------- selector de período ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {MODOS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setModo(m.id)
                setDesplazar(0)
              }}
              className={cn("relative px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em]", modo === m.id ? "text-carbon" : "border border-paper/15 text-paper/80 hover:border-paper/40")}
            >
              {modo === m.id && <motion.span layoutId="modo-finanzas" className="absolute inset-0 bg-achiote" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <span className="relative">{m.label}</span>
            </button>
          ))}
        </div>
        {modo === "rango" ? (
          <div className="flex items-center gap-2">
            <input type="date" className={cn(inputCls, "w-40 py-2")} value={propio.desde} onChange={(e) => setPropio((p) => ({ ...p, desde: e.target.value }))} />
            <span className="text-paper/65">→</span>
            <input type="date" className={cn(inputCls, "w-40 py-2")} value={propio.hasta} onChange={(e) => setPropio((p) => ({ ...p, hasta: e.target.value }))} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Período anterior" onClick={() => setDesplazar((d) => d - 1)} className="flex h-9 w-9 items-center justify-center border border-paper/15 hover:border-achiote">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[11rem] text-center font-mono text-xs uppercase tracking-[0.1em] text-paper/80">
              {rango.desde === rango.hasta ? largo(rango.desde) : `${corto(rango.desde)} – ${corto(rango.hasta)}`}
            </span>
            <button
              type="button"
              aria-label="Período siguiente"
              disabled={desplazar >= 0}
              onClick={() => setDesplazar((d) => Math.min(d + 1, 0))}
              className="flex h-9 w-9 items-center justify-center border border-paper/15 hover:border-achiote disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ---------- resumen del día + del período ---------- */}
      <section className="space-y-3">
        <Titulo icono={TrendingUp}>Resumen</Titulo>
        <FilaResumen titulo="Hoy" f={hoy} />
        {!(modo === "hoy" && desplazar === 0) && <FilaResumen titulo={`Período · ${corto(per.desde)} – ${corto(per.hasta)}`} f={per} />}
      </section>

      {/* ---------- dónde está la plata ---------- */}
      <DondeEstaLaPlata f={per} nombre={nombrePeriodo} />

      {/* ---------- cómo se llega al balance ---------- */}
      <Tarjeta className="p-5 sm:p-6">
        <Titulo icono={Landmark}>Cómo se llega al balance {nombrePeriodo}</Titulo>
        <p className="mb-4 mt-1 text-sm text-paper/75">
          La plata real del negocio: ventas cobradas (solo productos) menos todo lo que compraste, menos la parte de tus gastos fijos que le toca a {per.dias === 1 ? "este día" : `estos ${per.dias} días`}. El domicilio va aparte.
        </p>
        <Linea k={`Ventas (${per.pedidos} ${per.pedidos === 1 ? "pedido" : "pedidos"}, solo productos)`} v={per.ventas} />
        <Linea k={`− Compras (${per.lista_compras.length} ${per.lista_compras.length === 1 ? "ítem" : "ítems"})`} v={-per.compras} rojo />
        <Linea k={`− Gastos fijos (mensual ÷ 30 × ${per.dias} ${per.dias === 1 ? "día" : "días"})`} v={-per.gastos} rojo />
        <div className="mt-2 flex items-baseline justify-between border-t-2 border-achiote/30 pt-3">
          <span className="font-semibold">= Balance neto {nombrePeriodo}</span>
          <Monto valor={per.balance} className={cn("font-display text-3xl", per.balance >= 0 ? "text-[#8fc46a]" : "text-[#d0654a]")} />
        </div>
      </Tarjeta>

      {/* ---------- detalle del período ---------- */}
      <section className="space-y-3">
        <Titulo icono={ShoppingBasket}>Detalle {nombrePeriodo}</Titulo>
        <Desplegable titulo={`Pedidos (${per.lista_pedidos.length})`} total={per.ventas}>
          <Tabla
            cabecera={["Fecha", "#", "Tipo", "Pago", "Productos", "Domicilio"]}
            filas={per.lista_pedidos.map((p) => [
              corto(p.fecha),
              String(p.numero).padStart(3, "0"),
              p.tipo === "domicilio" ? `Domicilio ${p.zona}` : p.tipo === "mesa" ? p.mesa : "Recoger",
              p.bolsa === "cuentas" && p.cuenta ? p.cuenta : ETIQUETA_BOLSA[p.bolsa] ?? "—",
              formatCOP(p.venta),
              p.domicilio ? formatCOP(p.domicilio) : "—",
            ])}
          />
        </Desplegable>
        <Desplegable titulo={`Compras (${per.lista_compras.length})`} total={-per.compras}>
          <Tabla
            cabecera={["Fecha", "Ítem", "Cantidad", "Pagado con", "Precio"]}
            filas={per.lista_compras.map((c) => [corto(c.fecha), c.item, `${Number(c.cantidad).toLocaleString("es-CO")} ${c.unidad}`, c.metodo === "transferencia" ? c.cuenta || "Transferencia" : "Efectivo", formatCOP(c.precio)])}
          />
        </Desplegable>
        <Desplegable titulo={`Gastos fijos (repartidos × ${per.dias} ${per.dias === 1 ? "día" : "días"})`} total={-per.gastos} abierto>
          <Tabla cabecera={["Gasto", "Mensual", `Le toca a ${per.dias === 1 ? "este día" : "este período"}`]} filas={per.lista_gastos.map((g) => [g.nombre, formatCOP(g.mensual), formatCOP(g.prorrateo)])} />
        </Desplegable>
      </section>

      {/* ---------- configuración ---------- */}
      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <Titulo icono={Clock}>Gastos fijos mensuales</Titulo>
          <p className="mb-4 mt-1 text-sm text-paper/75">Gas, agua, luz, arriendo, personal… Se reparten por día (÷ 30) en cada período.</p>
          <ListaEditable<Gasto & Record<string, unknown>>
            tabla="gastos"
            nombre="gasto"
            campos={[
              { k: "nombre", label: "Nombre", tipo: "texto", placeholder: "Arriendo" },
              { k: "valor_mensual", label: "Valor mensual (COP)", tipo: "numero" },
              { k: "activo", label: "Contar este gasto", tipo: "bool" },
            ]}
            nueva={{ nombre: "", valor_mensual: 0, activo: true }}
            onCambio={() => setRecarga((r) => r + 1)}
            render={(x) => (
              <div className="flex items-center justify-between gap-3 pr-2">
                <p className="text-sm">{x.nombre}</p>
                <p className="font-mono text-sm text-tostado">
                  {formatCOP(x.valor_mensual)}/mes <span className="text-paper/65">· {formatCOP(Math.round(x.valor_mensual / 30))}/día</span>
                </p>
              </div>
            )}
          />
        </div>
        <Tarjeta className="h-fit p-4">
          <Etiqueta className="mb-2">Día de corte del ciclo</Etiqueta>
          <p className="mb-3 text-xs text-paper/75">El ciclo va de este día de un mes al día anterior del mes siguiente (ej. 20 → del 20 al 19).</p>
          <select
            className={inputCls}
            value={cicloDia}
            onChange={async (e) => {
              await guardar({ ciclo_dia: Number(e.target.value) })
              setRecarga((r) => r + 1)
            }}
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d} className="bg-carbon">
                Día {d}
              </option>
            ))}
          </select>
        </Tarjeta>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ piezas */

const ETIQUETA_BOLSA: Record<string, string> = { efectivo: "Efectivo", cuentas: "Nequi / Bre-B", pendiente: "Por confirmar", rappi: "Rappi", otro: "Otro" }

function Titulo({ icono: Icono, children }: { icono: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-2xl text-tostado">
      <Icono className="h-5 w-5" strokeWidth={1.75} /> {children}
    </h2>
  )
}

function FilaResumen({ titulo, f }: { titulo: string; f: Finanzas }) {
  const tarjetas = [
    { label: "Ventas (productos)", valor: f.ventas, tono: "text-achiote", nota: `${f.pedidos} ${f.pedidos === 1 ? "pedido" : "pedidos"}` },
    { label: "Domicilio (aparte)", valor: f.domicilios, tono: "text-paper", nota: "No cuenta como venta", icono: Bike, destacada: true },
    { label: "Compras", valor: f.compras, tono: "text-[#d0654a]", nota: `${f.lista_compras.length} ${f.lista_compras.length === 1 ? "ítem" : "ítems"}` },
    { label: "Balance neto", valor: f.balance, tono: f.balance >= 0 ? "text-[#8fc46a]" : "text-[#d0654a]", nota: "Ventas − compras − gastos fijos", signo: true },
  ]
  return (
    <div>
      <Etiqueta className="mb-2">{titulo}</Etiqueta>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.45, ease: EASE }}
            className={cn("border bg-paper/[0.02] p-4", t.destacada ? "border-achiote/40" : "border-paper/12")}
          >
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-paper/75">
              {t.icono && <t.icono className="h-3.5 w-3.5 text-[#d0654a]" />} {t.label}
            </p>
            <p className={cn("mt-2 font-display text-2xl sm:text-3xl", t.tono)}>
              {t.signo && t.valor > 0 ? "+" : ""}
              <Monto valor={t.valor} />
            </p>
            <p className="mt-1 text-[11px] text-paper/65">{t.nota}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function DondeEstaLaPlata({ f, nombre }: { f: Finanzas; nombre: string }) {
  const b = (k: keyof Finanzas["bolsas"]) => f.bolsas[k] ?? { ventas: 0, domicilios: 0, pedidos: 0 }
  const ef = b("efectivo"), cu = b("cuentas"), pe = b("pendiente"), ra = b("rappi")
  const comprasEf = f.compras_metodo.efectivo ?? 0
  const comprasCu = f.compras_metodo.transferencia ?? 0
  const cajas = [
    {
      label: "Debe haber en efectivo",
      icono: Banknote,
      valor: ef.ventas + ef.domicilios - comprasEf,
      detalle: [
        [`Cobrado en efectivo (${ef.pedidos})`, ef.ventas + ef.domicilios],
        ["− Compras pagadas en efectivo", -comprasEf],
      ],
      destacada: true,
    },
    {
      label: "Debe haber en cuentas",
      icono: Smartphone,
      valor: cu.ventas + cu.domicilios - comprasCu,
      detalle: [
        [`Transferencias recibidas (${cu.pedidos})`, cu.ventas + cu.domicilios],
        ["− Compras pagadas por transferencia", -comprasCu],
      ],
      destacada: true,
    },
    {
      label: "Por confirmar",
      icono: Clock,
      valor: pe.ventas + pe.domicilios,
      detalle: [[`Transferencias sin confirmar / mesas sin cobrar (${pe.pedidos})`, pe.ventas + pe.domicilios]],
    },
    {
      label: "Rappi te debe",
      icono: Landmark,
      valor: ra.ventas + ra.domicilios,
      detalle: [[`Pedidos por Rappi (${ra.pedidos}), sin descontar comisión`, ra.ventas + ra.domicilios]],
    },
  ] as const

  return (
    <section>
      <Titulo icono={Banknote}>¿Dónde está la plata {nombre}?</Titulo>
      <p className="mb-4 mt-1 text-sm text-paper/75">Para cuadrar caja: lo que entró por cada medio de pago (incluye domicilios) menos lo que pagaste de ahí.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cajas.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.45, ease: EASE }}
            className={cn("flex flex-col border p-4", "destacada" in c && c.destacada ? "border-achiote/50 bg-achiote/[0.06]" : "border-paper/12")}
          >
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-paper/80">
              <c.icono className="h-4 w-4 text-tostado" /> {c.label}
            </p>
            <Monto valor={c.valor} className={cn("mt-2 block font-display text-3xl", c.valor < 0 ? "text-[#d0654a]" : "text-paper")} />
            <div className="mt-3 space-y-1 border-t border-paper/10 pt-2 text-[11px] text-paper/75">
              {c.detalle.map(([k, v]) => (
                <p key={k} className="flex justify-between gap-2">
                  <span>{k}</span>
                  <span className="font-mono">{formatCOP(v)}</span>
                </p>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <PorCuenta f={f} />
    </section>
  )
}

/** Cuánto debe haber en cada cuenta: lo que entró por transferencia menos lo que se pagó desde ahí. */
function PorCuenta({ f }: { f: Finanzas }) {
  const nombres = [...new Set([...Object.keys(f.por_cuenta ?? {}), ...Object.keys(f.compras_por_cuenta ?? {})])].sort((a, b) =>
    a === "Sin especificar" ? 1 : b === "Sin especificar" ? -1 : a.localeCompare(b)
  )
  if (nombres.length === 0) return null
  return (
    <div className="mt-4">
      <Etiqueta className="mb-2">Por cuenta</Etiqueta>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {nombres.map((n, i) => {
          const entro = f.por_cuenta?.[n] ?? 0
          const salio = f.compras_por_cuenta?.[n] ?? 0
          return (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05, ease: EASE }}
              className={cn("border p-3", n === "Sin especificar" ? "border-dashed border-paper/15" : "border-paper/12")}
            >
              <p className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-3.5 w-3.5 text-tostado" /> {n}
              </p>
              <Monto valor={entro - salio} className={cn("mt-1 block font-display text-2xl", entro - salio < 0 ? "text-[#d0654a]" : "text-paper")} />
              <p className="mt-1 font-mono text-[10px] text-paper/75">
                Entró {formatCOP(entro)} · salió {formatCOP(salio)}
              </p>
              {n === "Sin especificar" && <p className="mt-1 text-[10px] text-paper/65">Transferencias anteriores, sin cuenta registrada.</p>}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function Linea({ k, v, rojo }: { k: string; v: number; rojo?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-paper/8 py-2.5 text-sm">
      <span className="text-paper/85">{k}</span>
      <span className={cn("font-mono", rojo ? "text-[#d0654a]" : "text-paper")}>{formatCOP(v)}</span>
    </div>
  )
}

function Desplegable({ titulo, total, children, abierto = false }: { titulo: string; total: number; children: React.ReactNode; abierto?: boolean }) {
  const [open, setOpen] = useState(abierto)
  return (
    <Tarjeta>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-paper/80">
          <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-tostado" />
          </motion.span>
          {titulo}
        </span>
        <span className={cn("font-mono text-sm", total < 0 ? "text-[#d0654a]" : "text-achiote")}>{formatCOP(total)}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden border-t border-paper/10">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Tarjeta>
  )
}

function Tabla({ cabecera, filas }: { cabecera: string[]; filas: string[][] }) {
  if (filas.length === 0) return <p className="px-4 py-6 text-center text-sm text-paper/65">Nada en este período.</p>
  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="sticky top-0 bg-[#120E0B]">
          <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/65">
            {cabecera.map((h, i) => (
              <th key={i} className={cn("px-4 py-2 font-normal", i === cabecera.length - 1 ? "text-right" : "text-left")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-paper/8">
              {f.map((c, j) => (
                <td key={j} className={cn("px-4 py-2", j === f.length - 1 ? "text-right font-mono" : "", j === 0 && "whitespace-nowrap text-paper/80")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
