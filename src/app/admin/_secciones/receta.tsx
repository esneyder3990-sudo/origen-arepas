"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { useAdmin } from "@/components/tienda/admin"
import { Cargando, Etiqueta, inputCls } from "@/components/tienda/ui"
import { type Insumo, type Zona, formatCOP } from "@/lib/tienda"
import { cn } from "@/lib/utils"

// Calculadora de costo y ganancia de un producto: receta con ingredientes y empaques del inventario.

type LineaReceta = { insumo_id: number | null; cantidad: number; rinde: number }
export type Receta = { ingredientes: LineaReceta[]; empaques: LineaReceta[]; zona_id: number | null; margen: number; precio_exacto: number | null }
const RECETA_VACIA: Receta = { ingredientes: [], empaques: [], zona_id: null, margen: 55, precio_exacto: null }

const redondear500 = (n: number) => Math.ceil(n / 500) * 500

export function CalculadoraReceta({
  receta,
  precio,
  onReceta,
  onPrecio,
}: {
  receta: unknown
  precio: number
  onReceta: (r: Receta, costo: number) => void
  onPrecio: (p: number) => void
}) {
  const { llamar } = useAdmin()
  const [insumos, setInsumos] = useState<Insumo[] | null>(null)
  const [zonas, setZonas] = useState<Zona[] | null>(null)

  useEffect(() => {
    llamar<Insumo[]>("tienda_admin_leer", { p_tabla: "insumos" }).then(setInsumos).catch(() => setInsumos([]))
    llamar<Zona[]>("tienda_admin_leer", { p_tabla: "zonas" }).then(setZonas).catch(() => setZonas([]))
  }, [llamar])

  const r: Receta = { ...RECETA_VACIA, ...((receta as Partial<Receta> | null) ?? {}) }
  if (!insumos || !zonas) return <Cargando />

  const porId = new Map(insumos.map((i) => [i.id, i]))
  const costoLinea = (l: LineaReceta) => {
    const i = l.insumo_id ? porId.get(l.insumo_id) : undefined
    return i ? (Number(i.costo_unidad) / Math.max(l.rinde || 1, 0.0001)) * (l.cantidad || 0) : 0
  }
  const total = (n: Receta) =>
    Math.round(
      [...n.ingredientes, ...n.empaques].reduce((a, l) => a + costoLinea(l), 0) + (zonas.find((z) => z.id === n.zona_id)?.tarifa ?? 0)
    )

  const subIng = r.ingredientes.reduce((a, l) => a + costoLinea(l), 0)
  const subEmp = r.empaques.reduce((a, l) => a + costoLinea(l), 0)
  const domicilio = zonas.find((z) => z.id === r.zona_id)?.tarifa ?? 0
  const costo = total(r)
  const margen = Math.min(Math.max(r.margen, 1), 90)
  const sugerido = costo > 0 ? redondear500(costo / (1 - margen / 100)) : 0
  const precioCalc = r.precio_exacto && r.precio_exacto > 0 ? r.precio_exacto : sugerido
  const ganancia = precioCalc - costo
  const margenReal = precioCalc > 0 ? Math.round((ganancia / precioCalc) * 100) : 0
  const gananciaActual = precio - costo
  const margenActual = precio > 0 ? Math.round((gananciaActual / precio) * 100) : 0

  const cambiar = (parcial: Partial<Receta>) => {
    const n = { ...r, ...parcial }
    onReceta(n, total(n))
  }

  const bloque = (clave: "ingredientes" | "empaques", titulo: string, tipo: "ingrediente" | "empaque", agregar: string) => (
    <div>
      <Etiqueta className="mb-2">{titulo}</Etiqueta>
      <div className="space-y-2">
        {r[clave].map((l, idx) => {
          const set = (p: Partial<LineaReceta>) => cambiar({ [clave]: r[clave].map((x, j) => (j === idx ? { ...x, ...p } : x)) })
          return (
            <div key={idx} className="border border-paper/12 p-2.5">
              <div className="flex gap-2">
                <select className={cn(inputCls, "min-w-0 flex-1")} value={l.insumo_id ?? ""} onChange={(e) => set({ insumo_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="" className="bg-carbon">Elige…</option>
                  {insumos
                    .filter((i) => i.tipo === tipo)
                    .map((i) => (
                      <option key={i.id} value={i.id} className="bg-carbon">
                        {i.nombre} · {String(i.unidad).slice(0, 28)} · {formatCOP(Number(i.costo_unidad))}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  aria-label="Quitar"
                  onClick={() => cambiar({ [clave]: r[clave].filter((_, j) => j !== idx) })}
                  className="flex w-10 shrink-0 items-center justify-center border border-paper/15 text-rose-300 hover:border-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.1em] text-paper/75">Lleva (cantidad)</span>
                  <input className={inputCls} type="number" inputMode="decimal" value={l.cantidad} onChange={(e) => set({ cantidad: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.1em] text-paper/75">El paquete rinde para</span>
                  <input className={inputCls} type="number" inputMode="decimal" value={l.rinde} onChange={(e) => set({ rinde: Number(e.target.value) })} />
                </label>
                <p className="pb-2.5 font-mono text-sm text-tostado">{formatCOP(Math.round(costoLinea(l)))}</p>
              </div>
            </div>
          )
        })}
        <button
          type="button"
          onClick={() => cambiar({ [clave]: [...r[clave], { insumo_id: null, cantidad: 1, rinde: 1 }] })}
          className="flex w-full items-center justify-center gap-2 border border-dashed border-achiote/50 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-tostado hover:bg-achiote/10"
        >
          <Plus className="h-4 w-4" /> {agregar}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 border-2 border-achiote/40 bg-achiote/[0.04] p-4">
      <div>
        <p className="font-display text-xl text-tostado">Costo y ganancia del producto</p>
        <p className="text-xs text-paper/80">
          Arma la receta con tus insumos. El costo se guarda solo con el producto. Ejemplo: si 1 Lb de carne alcanza para 6 arepas, elige la carne, cantidad 1 y rinde para 6.
        </p>
      </div>
      {bloque("ingredientes", "Ingredientes", "ingrediente", "Agregar ingrediente")}
      {bloque("empaques", "Empaques", "empaque", "Agregar empaque")}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <Etiqueta className="mb-2">Domicilio que tú asumes</Etiqueta>
          <select className={inputCls} value={r.zona_id ?? ""} onChange={(e) => cambiar({ zona_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="" className="bg-carbon">Sin domicilio</option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id} className="bg-carbon">
                {z.nombre} · {formatCOP(z.tarifa)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <Etiqueta className="mb-2">Margen de ganancia deseado {margen}%</Etiqueta>
          <input type="range" min={5} max={90} step={1} value={margen} onChange={(e) => cambiar({ margen: Number(e.target.value) })} className="mt-3 w-full accent-[#F5C400]" />
        </label>
      </div>

      <label className="block">
        <Etiqueta className="mb-2">Precio de venta exacto (opcional)</Etiqueta>
        <div className="flex gap-2">
          <input
            className={inputCls}
            type="number"
            inputMode="numeric"
            value={r.precio_exacto ?? ""}
            onChange={(e) => cambiar({ precio_exacto: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="Ej: 17500. Vacío usa el margen"
          />
          {r.precio_exacto !== null && (
            <button type="button" onClick={() => cambiar({ precio_exacto: null })} className="shrink-0 border border-paper/20 px-3 font-mono text-[10px] uppercase tracking-[0.1em] hover:border-achiote">
              Usar margen automático
            </button>
          )}
        </div>
      </label>

      <div className="space-y-1.5 border border-paper/12 bg-carbon/60 p-4 font-mono text-sm">
        <Fila k="Subtotal ingredientes" v={formatCOP(Math.round(subIng))} />
        <Fila k="Subtotal empaques" v={formatCOP(Math.round(subEmp))} />
        <Fila k="Domicilio que tú asumes" v={formatCOP(domicilio)} />
        <div className="border-t border-paper/10 pt-2">
          <Fila k="Costo total del producto" v={formatCOP(costo)} fuerte />
        </div>
        <Fila k="Precio de venta sugerido" v={formatCOP(precioCalc)} dorado />
        <Fila k="Ganancia por unidad" v={`${formatCOP(ganancia)} · ${margenReal}% margen real`} />
      </div>

      <button
        type="button"
        disabled={precioCalc <= 0}
        onClick={() => onPrecio(precioCalc)}
        className="w-full bg-achiote py-3 font-mono text-xs font-bold uppercase tracking-[0.15em] text-carbon disabled:opacity-40"
      >
        Usar {formatCOP(precioCalc)} como precio de venta
      </button>

      <p className={cn("text-sm", gananciaActual < 0 ? "text-rose-300" : "text-emerald-300")}>
        Con el precio actual del producto ({formatCOP(precio)}): ganancia {formatCOP(gananciaActual)} · {margenActual}% de margen.
      </p>
    </div>
  )
}

function Fila({ k, v, fuerte, dorado }: { k: string; v: string; fuerte?: boolean; dorado?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", fuerte && "font-bold", dorado && "font-bold text-tostado")}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  )
}
