"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Bike, MapPin, Phone } from "lucide-react"

import { PanelBarra, sonidoOrigen, usePedidos } from "@/components/tienda/admin"
import { Cargando, EASE, Etiqueta } from "@/components/tienda/ui"
import { type Pedido, ESTADO_LABEL, formatCOP, hace, mapaPedido, numeroPedido, textoAdiciones, visibleEnCocina } from "@/lib/tienda"
import { cn } from "@/lib/utils"

export default function DomiciliosPage() {
  const { pedidos, actualizar } = usePedidos(6000, 1)

  // Campanita cuando entra un domicilio nuevo (no suena con los que ya estaban al abrir la pantalla).
  const vistos = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!pedidos) return
    const nuevos = pedidos.filter((p) => p.tipo === "domicilio" && p.estado === "recibido" && visibleEnCocina(p)).map((p) => p.id)
    if (vistos.current && nuevos.some((id) => !vistos.current!.has(id))) sonidoOrigen()
    vistos.current = new Set([...(vistos.current ?? []), ...nuevos])
  }, [pedidos])

  const activos = (pedidos ?? [])
    .filter((p) => p.tipo === "domicilio" && visibleEnCocina(p) && p.estado !== "entregado")
    .sort((a, b) => +new Date(a.creado) - +new Date(b.creado))
  const grupos = [
    { titulo: "Listos para salir", lista: activos.filter((p) => p.estado === "listo") },
    { titulo: "En camino", lista: activos.filter((p) => p.estado === "en_camino") },
    { titulo: "En cocina", lista: activos.filter((p) => p.estado === "recibido" || p.estado === "preparacion") },
  ]

  return (
    <div className="min-h-svh bg-carbon font-sans text-paper">
      <PanelBarra rol="Domicilios" icono={Bike} />
      {!pedidos ? (
        <Cargando />
      ) : (
        <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
          {grupos.map((g) => (
            <section key={g.titulo}>
              <div className="mb-3 flex items-center justify-between">
                <Etiqueta className={g.titulo === "Listos para salir" ? "text-tostado" : ""}>{g.titulo}</Etiqueta>
                <span className="font-mono text-xs text-paper/50">{g.lista.length}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <AnimatePresence initial={false}>
                  {g.lista.map((p) => (
                    <TarjetaDomicilio key={p.id} p={p} onEstado={(e) => actualizar(p.id, { estado: e })} />
                  ))}
                </AnimatePresence>
              </div>
              {g.lista.length === 0 && <p className="border border-dashed border-paper/10 py-8 text-center text-sm text-paper/35">Nada por aquí</p>}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function TarjetaDomicilio({ p, onEstado }: { p: Pedido; onEstado: (e: Pedido["estado"]) => void }) {
  const cel = p.cliente_celular.replace(/\D/g, "")
  const mapa = mapaPedido(p)
  const gps = p.lat !== null && p.lng !== null
  const cobrar = p.metodo_pago === "efectivo" ? p.total : 0
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn("border p-4", p.estado === "listo" ? "border-achiote shadow-[0_0_24px_rgba(201,154,62,0.2)]" : "border-paper/12")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-sans text-2xl font-bold leading-none">{numeroPedido(p.numero)}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/50">{ESTADO_LABEL[p.estado]} · {hace(p.creado)}</p>
        </div>
        <div className="text-right">
          <Etiqueta>{cobrar ? "Cobrar en efectivo" : "Ya pagado"}</Etiqueta>
          <p className={cn("font-display text-2xl", cobrar ? "text-achiote" : "text-paper/60")}>{cobrar ? formatCOP(cobrar) : "Transferencia"}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1 border-t border-paper/10 pt-3 text-sm">
        <p className="font-medium">{p.cliente_nombre}</p>
        <p className="text-paper/80">{p.direccion} — <span className="text-tostado">{p.zona_nombre}</span></p>
        <p className={cn("font-mono text-[10px] uppercase tracking-[0.12em]", gps ? "text-tostado" : "text-paper/40")}>
          {gps ? "📍 Ubicación GPS del cliente" : "Sin GPS — guíate por la dirección"}
        </p>
        {p.nota_domiciliario && <p className="text-xs italic text-paper/60">“{p.nota_domiciliario}”</p>}
        <ul className="space-y-0.5 pt-1 text-xs text-paper/70">
          {p.items.map((i, k) => (
            <li key={k}>
              <b className="text-tostado">{i.cantidad}x</b> {i.nombre}
              {i.adiciones.length > 0 && <span className="block pl-5 text-paper/55">+ {textoAdiciones(i.adiciones)}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 grid grid-cols-[auto_auto_1fr] gap-2">
        <a href={`tel:${cel}`} aria-label="Llamar al cliente" className="flex h-11 w-11 items-center justify-center border border-paper/20 hover:border-achiote">
          <Phone className="h-4 w-4" />
        </a>
        <a
          href={mapa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={gps ? "Abrir ruta al GPS del cliente" : "Abrir en el mapa"}
          className={cn("flex h-11 w-11 items-center justify-center border", gps ? "border-achiote bg-achiote/15 text-tostado" : "border-paper/20 hover:border-achiote")}
        >
          <MapPin className="h-4 w-4" />
        </a>
        {p.estado === "listo" && (
          <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => onEstado("en_camino")} className="bg-achiote font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-carbon hover:bg-tostado">
            Salió a entregar
          </motion.button>
        )}
        {p.estado === "en_camino" && (
          <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => onEstado("entregado")} className="bg-tostado font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-carbon hover:bg-paper">
            Entregado
          </motion.button>
        )}
        {(p.estado === "recibido" || p.estado === "preparacion") && (
          <p className="flex items-center justify-center border border-paper/12 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/45">En cocina…</p>
        )}
      </div>
    </motion.article>
  )
}
