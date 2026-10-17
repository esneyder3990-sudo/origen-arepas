"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Check, FileText, Plus, Trash2 } from "lucide-react"

import { Boton, SelectorCuenta, Tarjeta, Toast, useAdmin, useToast } from "@/components/tienda/admin"
import { BotonCerrar, Cargando, EASE, Etiqueta, Hoja, Opcion, inputCls } from "@/components/tienda/ui"
import { type Insumo, type Producto, formatCOP } from "@/lib/tienda"
import { cn } from "@/lib/utils"
import { ListaEditable, Pestanas, useTabla } from "./comun"
import { EscanearFactura } from "./factura"
import { Insignia } from "./pedidos"

export function SeccionInventario() {
  const [tab, setTab] = useState<"insumos" | "compras" | "costos">("insumos")
  return (
    <div>
      <Pestanas valor={tab} onCambiar={setTab} opciones={[{ id: "insumos", label: "Insumos" }, { id: "compras", label: "Compras" }, { id: "costos", label: "Costos y márgenes" }]} />
      {tab === "compras" && <Compras />}
      {tab === "insumos" && (
        <ListaEditable<Insumo & Record<string, unknown>>
          tabla="insumos"
          nombre="insumo"
          campos={[
            { k: "nombre", label: "Nombre", tipo: "texto", placeholder: "Maíz peto" },
            { k: "unidad", label: "Presentación / unidad", tipo: "texto", placeholder: "3 kg, paquete x 100, und…" },
            { k: "tipo", label: "Tipo", tipo: "select", opciones: [{ valor: "ingrediente", label: "Ingrediente" }, { valor: "empaque", label: "Empaque" }] },
            { k: "stock", label: "Stock actual", tipo: "numero" },
            { k: "costo_unidad", label: "Precio de la presentación (COP)", tipo: "numero" },
            { k: "stock_minimo", label: "Stock mínimo (alerta)", tipo: "numero" },
          ]}
          nueva={{ nombre: "", unidad: "und", tipo: "ingrediente", stock: 0, costo_unidad: 0, stock_minimo: 0 }}
          vacio="Agrega tus insumos (maíz peto, plátano verde, carne, queso…) para llevar el stock."
          render={(i) => {
            const bajo = Number(i.stock) <= Number(i.stock_minimo)
            return (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="text-sm font-medium">{i.nombre}</p>
                {i.tipo === "empaque" && <Insignia tono="neutro">Empaque</Insignia>}
                <p className={cn("font-mono text-xs", bajo ? "text-tostado" : "text-paper/80")}>
                  stock {Number(i.stock).toLocaleString("es-CO")}
                </p>
                <p className="font-mono text-xs text-paper/65">{formatCOP(Number(i.costo_unidad))} · {i.unidad}</p>
                {bajo && <Insignia>Stock bajo</Insignia>}
              </div>
            )
          }}
        />
      )}
      {tab === "costos" && <Margenes />}
    </div>
  )
}

function Margenes() {
  const { filas } = useTabla<Producto & Record<string, unknown>>("productos")
  if (!filas) return <Cargando />
  return (
    <Tarjeta>
      <p className="border-b border-paper/10 px-4 py-3 text-sm text-paper/80">
        El costo de cada producto se edita en <b className="text-paper">Menú → Editar</b>. El margen se calcula sobre el precio de venta.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[0.15em] text-paper/65">
              {["Producto", "Precio", "Costo", "Ganancia", "Margen"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((p, i) => {
              const costo = p.costo ?? 0
              const margen = p.precio ? ((p.precio - costo) / p.precio) * 100 : 0
              return (
                <tr key={p.id} className="border-t border-paper/8">
                  <td className="px-4 py-3">{p.nombre}</td>
                  <td className="px-4 py-3 font-mono">{formatCOP(p.precio)}</td>
                  <td className="px-4 py-3 font-mono text-paper/80">{costo ? formatCOP(costo) : "—"}</td>
                  <td className="px-4 py-3 font-mono text-tostado">{costo ? formatCOP(p.precio - costo) : "—"}</td>
                  <td className="px-4 py-3">
                    {costo ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-paper/10">
                          <motion.div className="h-full bg-achiote" initial={{ width: 0 }} animate={{ width: `${Math.max(Math.min(margen, 100), 0)}%` }} transition={{ delay: i * 0.03, duration: 0.7, ease: EASE }} />
                        </div>
                        <span className="font-mono text-xs">{Math.round(margen)}%</span>
                      </div>
                    ) : (
                      <Etiqueta>Sin costo</Etiqueta>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  )
}

interface Compra { id: number; fecha: string; item: string; cantidad: number; unidad: string; precio: number; factura: string }

function Compras() {
  const { filas, recargar, borrar } = useTabla<Compra & Record<string, unknown>>("compras")
  const { filas: insumos, recargar: recargarInsumos } = useTabla<Insumo & Record<string, unknown>>("insumos")
  const [mes, setMes] = useState<string | null>(null)
  const [nueva, setNueva] = useState(false)
  const [borrando, setBorrando] = useState<number | null>(null)
  const { texto, mostrar } = useToast()
  if (!filas) return <Cargando />
  const meses = [...new Set(filas.map((c) => c.fecha.slice(0, 7)))].sort().reverse()
  const actual = mes ?? meses[0] ?? ""
  const delMes = filas.filter((c) => c.fecha.startsWith(actual)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
  const total = delMes.reduce((s, c) => s + c.precio, 0)
  const nombreMes = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-2">
          <EscanearFactura
            insumos={insumos ?? []}
            onListo={async (n, fecha) => {
              await Promise.all([recargar(), recargarInsumos()])
              setMes(fecha.slice(0, 7))
              mostrar(`${n} ${n === 1 ? "compra registrada" : "compras registradas"} desde la factura`)
            }}
          />
          <Boton variante="borde" onClick={() => setNueva(true)}>
            <Plus className="h-4 w-4" /> Registrar a mano
          </Boton>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {meses.map((m) => (
          <button key={m} type="button" onClick={() => setMes(m)} className={cn("border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em]", m === actual ? "border-achiote text-tostado" : "border-paper/15 text-paper/75")}>
            {nombreMes(m)}
          </button>
        ))}
      </div>
      <Tarjeta className="flex items-baseline justify-between p-4">
        <Etiqueta>Total compras · {actual ? nombreMes(actual) : "—"} · {delMes.length} registros</Etiqueta>
        <span className="font-display text-3xl text-achiote">{formatCOP(total)}</span>
      </Tarjeta>
      <Tarjeta className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[0.15em] text-paper/65">
              {["Fecha", "Ítem", "Cantidad", "Precio", ""].map((h, i) => <th key={i} className="px-4 py-2.5 text-left font-normal">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {delMes.map((c) => (
              <tr key={c.id} className="border-t border-paper/8">
                <td className="px-4 py-2.5 font-mono text-xs text-paper/80">{c.fecha}</td>
                <td className="px-4 py-2.5">
                  {c.item}
                  {c.factura && (
                    <a href={c.factura} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 align-middle font-mono text-[10px] uppercase text-tostado underline">
                      <FileText className="h-3 w-3" /> factura
                    </a>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{Number(c.cantidad).toLocaleString("es-CO")} {c.unidad}</td>
                <td className="px-4 py-2.5 font-mono text-tostado">{formatCOP(c.precio)}</td>
                <td className="px-2 py-2.5 text-right">
                  {borrando === c.id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await borrar(c.id)
                        setBorrando(null)
                        mostrar("Compra eliminada")
                      }}
                      className="border border-red-400/40 bg-red-400/10 px-2 py-1 font-mono text-[10px] uppercase text-red-200"
                    >
                      ¿Borrar?
                    </button>
                  ) : (
                    <button type="button" aria-label="Borrar compra" onClick={() => setBorrando(c.id)} className="p-1 text-paper/65 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {delMes.length === 0 && <p className="px-4 py-8 text-center text-sm text-paper/65">Sin compras registradas.</p>}
      </Tarjeta>
      <Hoja abierta={nueva} onCerrar={() => setNueva(false)} titulo="Registrar compra">
        <FormCompra
          insumos={insumos ?? []}
          onCerrar={() => setNueva(false)}
          onGuardada={async (fecha, sumoStock, costoActualizado) => {
            await Promise.all([recargar(), recargarInsumos()])
            setMes(fecha.slice(0, 7))
            setNueva(false)
            mostrar(costoActualizado ? "Compra registrada, stock y costos de productos actualizados" : sumoStock ? "Compra registrada y sumada al stock" : "Compra registrada")
          }}
        />
      </Hoja>
      <Toast texto={texto} />
    </div>
  )
}

// Se monta de cero cada vez que se abre la hoja.
function FormCompra({
  insumos,
  onCerrar,
  onGuardada,
}: {
  insumos: Insumo[]
  onCerrar: () => void
  onGuardada: (fecha: string, sumoStock: boolean, costoActualizado?: boolean) => Promise<void>
}) {
  const { llamar } = useAdmin()
  const [f, setF] = useState(() => ({
    fecha: new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }),
    item: "",
    cantidad: "",
    unidad: "",
    precio: "",
    insumo_id: "",
    metodo: "efectivo",
    cuenta: "",
  }))
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))
  const insumo = insumos.find((i) => String(i.id) === f.insumo_id)

  return (
    <>
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="font-display text-2xl">Registrar compra</h2>
        <BotonCerrar onClick={onCerrar} />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        <label className="block">
          <Etiqueta className="mb-2">¿Es un insumo del inventario? (opcional)</Etiqueta>
          <select
            className={inputCls}
            value={f.insumo_id}
            onChange={(e) => {
              const i = insumos.find((x) => String(x.id) === e.target.value)
              setF((x) => ({ ...x, insumo_id: e.target.value, item: i ? i.nombre : x.item, unidad: i ? i.unidad : x.unidad }))
            }}
          >
            <option value="" className="bg-carbon">— No, es otra compra —</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id} className="bg-carbon">
                {i.nombre}
              </option>
            ))}
          </select>
          {insumo && <p className="mt-1 text-xs text-tostado">La cantidad se sumará al stock de {insumo.nombre} (hoy: {Number(insumo.stock).toLocaleString("es-CO")}).</p>}
        </label>
        <label className="block">
          <Etiqueta className="mb-2">¿Qué compraste?</Etiqueta>
          <input className={inputCls} value={f.item} onChange={(e) => set("item", e.target.value)} placeholder="Maíz peto, queso, gas…" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <Etiqueta className="mb-2">Cantidad</Etiqueta>
            <input className={inputCls} inputMode="decimal" value={f.cantidad} onChange={(e) => set("cantidad", e.target.value.replace(",", "."))} placeholder="2" />
          </label>
          <label>
            <Etiqueta className="mb-2">Unidad</Etiqueta>
            <input className={inputCls} value={f.unidad} onChange={(e) => set("unidad", e.target.value)} placeholder="kg, bulto, und…" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <Etiqueta className="mb-2">Precio total (COP)</Etiqueta>
            <input className={inputCls} inputMode="numeric" value={f.precio} onChange={(e) => set("precio", e.target.value.replace(/\D/g, ""))} placeholder="16400" />
          </label>
          <label>
            <Etiqueta className="mb-2">Fecha</Etiqueta>
            <input type="date" className={inputCls} value={f.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </label>
        </div>
        <div>
          <Etiqueta className="mb-2">Pagado con</Etiqueta>
          <div className="grid grid-cols-2 gap-2">
            <Opcion grupo="metodo-compra" activa={f.metodo === "efectivo"} onClick={() => set("metodo", "efectivo")}>Efectivo</Opcion>
            <Opcion grupo="metodo-compra" activa={f.metodo === "transferencia"} onClick={() => set("metodo", "transferencia")}>Transferencia</Opcion>
          </div>
          {f.metodo === "transferencia" && <SelectorCuenta grupo="compra-cuenta" valor={f.cuenta} onCambio={(c) => set("cuenta", c)} titulo="¿De qué cuenta salió?" />}
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
      <div className="border-t border-paper/10 p-4">
        <Boton
          className="w-full py-3.5"
          disabled={guardando || !f.item.trim() || !f.precio || (f.metodo === "transferencia" && !f.cuenta)}
          onClick={async () => {
            setGuardando(true)
            setError(null)
            try {
              const r = await llamar<{ costo_actualizado?: boolean }>("tienda_admin_registrar_compra", {
                p_compra: { fecha: f.fecha, item: f.item, cantidad: Number(f.cantidad || 0), unidad: f.unidad, precio: Number(f.precio), insumo_id: f.insumo_id, metodo: f.metodo, cuenta: f.metodo === "transferencia" ? f.cuenta : "" },
              })
              await onGuardada(f.fecha, !!f.insumo_id && Number(f.cantidad) > 0, !!r?.costo_actualizado)
            } catch (e) {
              setError((e as Error).message)
              setGuardando(false)
            }
          }}
        >
          <Check className="h-4 w-4" /> {guardando ? "Guardando…" : "Guardar compra"}
        </Boton>
      </div>
    </>
  )
}
