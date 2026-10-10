"use client"

import { useState } from "react"
import { motion } from "motion/react"

import { Tarjeta } from "@/components/tienda/admin"
import { Cargando, EASE, Etiqueta } from "@/components/tienda/ui"
import { type Insumo, type Producto, formatCOP } from "@/lib/tienda"
import { cn } from "@/lib/utils"
import { ListaEditable, Pestanas, useTabla } from "./comun"
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
                <p className={cn("font-mono text-xs", bajo ? "text-tostado" : "text-paper/60")}>
                  stock {Number(i.stock).toLocaleString("es-CO")}
                </p>
                <p className="font-mono text-xs text-paper/45">{formatCOP(Number(i.costo_unidad))} · {i.unidad}</p>
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
      <p className="border-b border-paper/10 px-4 py-3 text-sm text-paper/60">
        El costo de cada producto se edita en <b className="text-paper">Menú → Editar</b>. El margen se calcula sobre el precio de venta.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[0.15em] text-paper/45">
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
                  <td className="px-4 py-3 font-mono text-paper/60">{costo ? formatCOP(costo) : "—"}</td>
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

interface Compra { id: number; fecha: string; item: string; cantidad: number; unidad: string; precio: number }

function Compras() {
  const { filas } = useTabla<Compra & Record<string, unknown>>("compras")
  const [mes, setMes] = useState<string | null>(null)
  if (!filas) return <Cargando />
  const meses = [...new Set(filas.map((c) => c.fecha.slice(0, 7)))].sort().reverse()
  const actual = mes ?? meses[0] ?? ""
  const delMes = filas.filter((c) => c.fecha.startsWith(actual)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
  const total = delMes.reduce((s, c) => s + c.precio, 0)
  const nombreMes = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {meses.map((m) => (
          <button key={m} type="button" onClick={() => setMes(m)} className={cn("border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em]", m === actual ? "border-achiote text-tostado" : "border-paper/15 text-paper/55")}>
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
            <tr className="font-mono text-[10px] uppercase tracking-[0.15em] text-paper/45">
              {["Fecha", "Ítem", "Cantidad", "Precio"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-normal">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {delMes.map((c) => (
              <tr key={c.id} className="border-t border-paper/8">
                <td className="px-4 py-2.5 font-mono text-xs text-paper/60">{c.fecha}</td>
                <td className="px-4 py-2.5">{c.item}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{Number(c.cantidad).toLocaleString("es-CO")} {c.unidad}</td>
                <td className="px-4 py-2.5 font-mono text-tostado">{formatCOP(c.precio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {delMes.length === 0 && <p className="px-4 py-8 text-center text-sm text-paper/45">Sin compras registradas.</p>}
      </Tarjeta>
    </div>
  )
}
