"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, ScanLine, Sparkles } from "lucide-react"

import { Boton, useAdmin } from "@/components/tienda/admin"
import { BotonCerrar, EASE, Etiqueta, Hoja, inputCls } from "@/components/tienda/ui"
import { type Insumo, formatCOP } from "@/lib/tienda"
import { cn } from "@/lib/utils"
import { prepararFoto } from "./comun"

interface Linea {
  incluir: boolean
  descripcion: string
  cantidad: number
  unidad: string
  precio_total: number
  insumo_id: number | null
}
interface Lectura {
  es_factura: boolean
  proveedor: string
  fecha: string
  total: number
  items: Omit<Linea, "incluir">[]
}

const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })

/** Botón "Escanear factura": foto → IA lee las líneas → revisas → se registran y suman al stock. */
export function EscanearFactura({ insumos, onListo }: { insumos: Insumo[]; onListo: (n: number, fecha: string) => Promise<void> }) {
  const { pin, llamar } = useAdmin()
  const [estado, setEstado] = useState<"idle" | "leyendo" | "revisar">("idle")
  const [error, setError] = useState<string | null>(null)
  const [lectura, setLectura] = useState<{ proveedor: string; fecha: string; total: number; foto: string; lineas: Linea[] } | null>(null)

  const leer = async (file: File) => {
    setError(null)
    setEstado("leyendo")
    try {
      const imagen = await prepararFoto(file, 1600)
      // La foto se guarda como soporte de la compra, en paralelo con la lectura.
      const [res, fotoId] = await Promise.all([
        fetch("/api/factura", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, imagen }) }).then(
          async (r) => {
            const j = await r.json().catch(() => ({ error: "No se pudo leer la factura" }))
            if (!r.ok) throw new Error(j.error ?? "No se pudo leer la factura")
            return j as Lectura
          }
        ),
        llamar<string>("tienda_admin_subir_imagen", { p_datos: imagen, p_tipo: "image/jpeg" }).catch(() => ""),
      ])
      if (!res.es_factura || res.items.length === 0) throw new Error("No encontré productos en la foto. Toma la foto de frente, con buena luz y que se vea toda la factura.")
      setLectura({
        proveedor: res.proveedor,
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(res.fecha) ? res.fecha : hoy(),
        total: res.total,
        foto: fotoId ? `/fotos/${fotoId}.jpg` : "",
        lineas: res.items.map((i) => ({ ...i, incluir: true, insumo_id: insumos.some((x) => x.id === i.insumo_id) ? i.insumo_id : null })),
      })
      setEstado("revisar")
    } catch (e) {
      setError((e as Error).message)
      setEstado("idle")
    }
  }

  return (
    <>
      <label
        className={cn(
          "relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden border border-achiote bg-achiote/15 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-paper transition hover:bg-achiote/25",
          estado === "leyendo" && "pointer-events-none"
        )}
      >
        {estado === "leyendo" && (
          <motion.span className="absolute inset-0 bg-achiote/25" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }} />
        )}
        {estado === "leyendo" ? <Sparkles className="relative h-4 w-4 animate-pulse" /> : <ScanLine className="relative h-4 w-4" />}
        <span className="relative">{estado === "leyendo" ? "Leyendo factura…" : "Escanear factura"}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) leer(file)
          }}
        />
      </label>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 max-w-md text-right text-xs text-red-300">
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Hoja abierta={estado === "revisar" && !!lectura} onCerrar={() => setEstado("idle")} titulo="Revisar factura" className="sm:max-w-2xl">
        {lectura && (
          <Revision
            inicial={lectura}
            insumos={insumos}
            onCerrar={() => setEstado("idle")}
            onConfirmar={async (l) => {
              const elegidas = l.lineas.filter((x) => x.incluir && x.descripcion.trim() && x.precio_total >= 0)
              for (const x of elegidas) {
                await llamar("tienda_admin_registrar_compra", {
                  p_compra: {
                    fecha: l.fecha,
                    item: l.proveedor ? `${x.descripcion} · ${l.proveedor}` : x.descripcion,
                    cantidad: x.cantidad,
                    unidad: x.unidad,
                    precio: Math.round(x.precio_total),
                    insumo_id: x.insumo_id ?? "",
                    factura: l.foto,
                  },
                })
              }
              setEstado("idle")
              await onListo(elegidas.length, l.fecha)
            }}
          />
        )}
      </Hoja>
    </>
  )
}

function Revision({
  inicial,
  insumos,
  onCerrar,
  onConfirmar,
}: {
  inicial: { proveedor: string; fecha: string; total: number; foto: string; lineas: Linea[] }
  insumos: Insumo[]
  onCerrar: () => void
  onConfirmar: (l: { proveedor: string; fecha: string; total: number; foto: string; lineas: Linea[] }) => Promise<void>
}) {
  const [l, setL] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setLinea = (i: number, c: Partial<Linea>) => setL((x) => ({ ...x, lineas: x.lineas.map((y, j) => (j === i ? { ...y, ...c } : y)) }))
  const suma = l.lineas.filter((x) => x.incluir).reduce((s, x) => s + x.precio_total, 0)
  const cuadra = l.total > 0 && Math.abs(suma - l.total) <= Math.max(100, l.total * 0.01)
  const n = l.lineas.filter((x) => x.incluir).length

  return (
    <>
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <Sparkles className="h-5 w-5 text-tostado" /> Revisa la factura
          </h2>
          <p className="text-xs text-paper/55">La IA la leyó; corrige lo que haga falta antes de guardar.</p>
        </div>
        <BotonCerrar onClick={onCerrar} />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        <div className="grid grid-cols-2 gap-3">
          <label>
            <Etiqueta className="mb-1">Proveedor</Etiqueta>
            <input className={cn(inputCls, "py-2")} value={l.proveedor} onChange={(e) => setL((x) => ({ ...x, proveedor: e.target.value }))} />
          </label>
          <label>
            <Etiqueta className="mb-1">Fecha</Etiqueta>
            <input type="date" className={cn(inputCls, "py-2")} value={l.fecha} onChange={(e) => setL((x) => ({ ...x, fecha: e.target.value }))} />
          </label>
        </div>

        <div className="space-y-2">
          {l.lineas.map((x, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: EASE }}
              className={cn("border p-3 transition", x.incluir ? "border-paper/15" : "border-paper/8 opacity-45")}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setLinea(i, { incluir: !x.incluir })}
                  aria-pressed={x.incluir}
                  aria-label={x.incluir ? "Quitar esta línea" : "Incluir esta línea"}
                  className={cn("mt-2 flex h-5 w-5 shrink-0 items-center justify-center border", x.incluir ? "border-achiote bg-achiote text-carbon" : "border-paper/30")}
                >
                  {x.incluir && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_70px_70px_100px]">
                  <input className={cn(inputCls, "py-2")} value={x.descripcion} onChange={(e) => setLinea(i, { descripcion: e.target.value })} />
                  <input className={cn(inputCls, "py-2")} inputMode="decimal" aria-label="Cantidad" value={x.cantidad} onChange={(e) => setLinea(i, { cantidad: Number(e.target.value.replace(",", ".")) || 0 })} />
                  <input className={cn(inputCls, "py-2")} aria-label="Unidad" value={x.unidad} onChange={(e) => setLinea(i, { unidad: e.target.value })} />
                  <input className={cn(inputCls, "py-2 text-tostado")} inputMode="numeric" aria-label="Precio" value={x.precio_total} onChange={(e) => setLinea(i, { precio_total: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
                  <select
                    className={cn(inputCls, "py-2 sm:col-span-4", x.insumo_id ? "border-achiote/50 text-tostado" : "text-paper/55")}
                    value={x.insumo_id ?? ""}
                    onChange={(e) => setLinea(i, { insumo_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="" className="bg-carbon">No sumar al inventario</option>
                    {insumos.map((s) => (
                      <option key={s.id} value={s.id} className="bg-carbon">
                        Sumar al stock de: {s.nombre} ({s.unidad})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className={cn("flex items-baseline justify-between border p-3", cuadra ? "border-achiote/40 bg-achiote/10" : "border-paper/15")}>
          <span className="text-xs text-paper/65">
            Suma de líneas {l.total > 0 && <>· total de la factura {formatCOP(l.total)}</>}
            {l.total > 0 && !cuadra && <span className="block text-tostado">No cuadra con el total: revisa precios o líneas.</span>}
          </span>
          <span className="font-display text-2xl text-achiote">{formatCOP(suma)}</span>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
      <div className="border-t border-paper/10 p-4">
        <Boton
          className="w-full py-3.5"
          disabled={guardando || n === 0}
          onClick={async () => {
            setGuardando(true)
            setError(null)
            try {
              await onConfirmar(l)
            } catch (e) {
              setError((e as Error).message)
              setGuardando(false)
            }
          }}
        >
          <Check className="h-4 w-4" /> {guardando ? "Registrando…" : `Registrar ${n} ${n === 1 ? "compra" : "compras"}`}
        </Boton>
      </div>
    </>
  )
}
