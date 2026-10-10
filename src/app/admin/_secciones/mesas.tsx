"use client"

import { type Mesa } from "@/lib/tienda"
import { Tarjeta } from "@/components/tienda/admin"
import { ListaEditable } from "./comun"

export function SeccionMesas() {
  return (
    <div className="space-y-5">
      <Tarjeta className="p-4 text-sm leading-relaxed text-paper/70">
        Las mesas se usan en los paneles de <b className="text-paper">Mesero</b> y <b className="text-paper">Caja</b>. Para que los clientes también puedan
        elegir “Mesa” al pedir desde /pedir, actívalo en <b className="text-paper">Ajustes</b>.
      </Tarjeta>
      <ListaEditable<Mesa & Record<string, unknown>>
        tabla="mesas"
        nombre="mesa"
        campos={[
          { k: "nombre", label: "Nombre", tipo: "texto", placeholder: "Mesa 5" },
          { k: "orden", label: "Orden", tipo: "numero" },
          { k: "activo", label: "Activa", tipo: "bool" },
        ]}
        nueva={{ nombre: "", orden: 0, activo: true }}
        render={(m) => <p className="text-sm font-medium">{m.nombre}</p>}
      />
    </div>
  )
}
