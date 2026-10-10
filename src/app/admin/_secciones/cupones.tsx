"use client"

import { type Cupon, formatCOP } from "@/lib/tienda"
import { ListaEditable } from "./comun"
import { Insignia } from "./pedidos"

export function SeccionCupones() {
  return (
    <ListaEditable<Cupon & Record<string, unknown>>
      tabla="cupones"
      nombre="cupón"
      campos={[
        { k: "codigo", label: "Código", tipo: "texto", placeholder: "MAIZ10" },
        { k: "tipo", label: "Tipo", tipo: "select", opciones: [{ valor: "porcentaje", label: "% descuento" }, { valor: "valor", label: "$ valor fijo" }] },
        { k: "valor", label: "Valor (% o COP)", tipo: "numero" },
        { k: "compra_minima", label: "Compra mínima (opcional)", tipo: "numero" },
        { k: "activo", label: "Activo", tipo: "bool" },
      ]}
      nueva={{ codigo: "", tipo: "porcentaje", valor: 10, compra_minima: 0, activo: true }}
      vacio="Crea tu primer cupón para campañas en Instagram o clientes frecuentes."
      render={(c) => (
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-sm font-bold tracking-[0.1em]">{c.codigo}</p>
          <p className="font-mono text-xs text-tostado">{c.tipo === "porcentaje" ? `${c.valor}%` : formatCOP(c.valor)}</p>
          {c.compra_minima > 0 && <p className="font-mono text-xs text-paper/50">mín. {formatCOP(c.compra_minima)}</p>}
          <Insignia tono={c.activo ? "ok" : "neutro"}>{c.activo ? "Activo" : "Inactivo"}</Insignia>
        </div>
      )}
    />
  )
}
