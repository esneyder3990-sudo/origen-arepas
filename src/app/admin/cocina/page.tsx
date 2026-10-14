"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Bell, BellOff, ChefHat, Printer } from "lucide-react"

import { PanelBarra, useAlarmaPendientes, usePedidos } from "@/components/tienda/admin"
import { Cargando, EASE } from "@/components/tienda/ui"
import { type EstadoPedido, type Pedido, TIPO_LABEL, hace, minutosDesde, numeroInterno, visibleEnCocina, textoAdiciones } from "@/lib/tienda"
import { imprimirTicket } from "@/lib/ticket"
import { cn } from "@/lib/utils"

const COLUMNAS: { estado: EstadoPedido; titulo: string; accion?: { label: string; siguiente: EstadoPedido } }[] = [
  { estado: "recibido", titulo: "Nuevos", accion: { label: "Empezar", siguiente: "preparacion" } },
  { estado: "preparacion", titulo: "En preparación", accion: { label: "Listo", siguiente: "listo" } },
  { estado: "listo", titulo: "Listos para entregar" },
]

// Un color por etapa: amarillo = nuevo, naranja = cocinando, verde = listo.
const COLOR_ETAPA: Partial<Record<EstadoPedido, { barra: string; texto: string; borde: string; punto: string }>> = {
  recibido: { barra: "bg-yellow-300", texto: "text-yellow-200", borde: "border-yellow-300/70", punto: "bg-yellow-300" },
  preparacion: { barra: "bg-orange-400", texto: "text-orange-300", borde: "border-orange-400/70", punto: "bg-orange-400" },
  listo: { barra: "bg-emerald-400", texto: "text-emerald-300", borde: "border-emerald-400/70", punto: "bg-emerald-400" },
}
// Un color por tipo de pedido.
const COLOR_TIPO: Record<string, string> = {
  mesa: "border-sky-400/60 bg-sky-400/15 text-sky-200",
  recoger: "border-violet-400/60 bg-violet-400/15 text-violet-200",
  domicilio: "border-orange-400/60 bg-orange-400/15 text-orange-200",
}

export default function CocinaPage() {
  const { pedidos, actualizar } = usePedidos(5000, 1)
  const [sonido, setSonido] = useState(true)
  const [, tic] = useState(0)

  useEffect(() => {
    const t = window.setInterval(() => tic((x) => x + 1), 30000)
    return () => window.clearInterval(t)
  }, [])

  const cola = useMemo(() => (pedidos ?? []).filter(visibleEnCocina), [pedidos])

  // Campanita repetida mientras haya pedidos nuevos sin empezar.
  useAlarmaPendientes(cola.filter((p) => p.estado === "recibido").length, sonido)

  return (
    <div className="min-h-svh bg-carbon font-sans text-paper">
      <PanelBarra rol="Cocina" icono={ChefHat}>
        <button
          type="button"
          onClick={() => setSonido((s) => !s)}
          aria-label={sonido ? "Silenciar alertas" : "Activar alertas"}
          className={cn("flex h-9 w-9 items-center justify-center border", sonido ? "border-achiote text-tostado" : "border-paper/15 text-paper")}
        >
          {sonido ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </button>
      </PanelBarra>
      {!pedidos ? (
        <Cargando />
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-3 sm:p-6">
          {COLUMNAS.map((col) => {
            const lista = cola
              .filter((p) => p.estado === col.estado)
              .sort((a, b) => +new Date(a.creado) - +new Date(b.creado))
              .slice(0, col.estado === "listo" ? 8 : undefined)
            return (
              <section key={col.estado}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={cn("flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.15em]", COLOR_ETAPA[col.estado]?.texto)}>
                    <i className={cn("h-2.5 w-2.5 rounded-full", COLOR_ETAPA[col.estado]?.punto)} />
                    {col.titulo}
                  </span>
                  <span className={cn("flex h-6 min-w-6 items-center justify-center px-1.5 font-mono text-xs font-bold text-carbon", COLOR_ETAPA[col.estado]?.barra)}>{lista.length}</span>
                </div>
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {lista.map((p) => (
                      <TarjetaCocina key={p.id} p={p} accion={col.accion} onAccion={(e) => actualizar(p.id, { estado: e })} />
                    ))}
                  </AnimatePresence>
                  {lista.length === 0 && <p className="border border-dashed border-paper/10 py-10 text-center text-sm text-paper">Sin pedidos</p>}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TarjetaCocina({ p, accion, onAccion }: { p: Pedido; accion?: { label: string; siguiente: EstadoPedido }; onAccion: (e: EstadoPedido) => void }) {
  const tarde = minutosDesde(p.creado) >= 25 && p.estado !== "listo"
  return (
    <motion.article
      layout
      layoutId={`cocina-${p.id}`}
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn("relative border bg-paper/[0.02]", COLOR_ETAPA[p.estado]?.borde ?? "border-paper/12")}
    >
      <div className={cn("h-1.5", COLOR_ETAPA[p.estado]?.barra ?? "bg-paper/20")} />
      {p.estado === "recibido" && (
        <motion.span
          className="pointer-events-none absolute inset-0 border-2 border-achiote shadow-[inset_0_0_30px_rgba(245,196,0,0.25)]"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className="relative flex items-start justify-between gap-2 border-b border-paper/10 px-4 py-3">
        <div>
          <p className="font-sans text-3xl font-bold leading-none">{numeroInterno(p)}</p>
          <span className={cn("mt-2 inline-block border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]", COLOR_TIPO[p.tipo] ?? "border-paper/30 text-paper")}>
            {p.tipo === "mesa" ? p.mesa_nombre : p.tipo === "recoger" ? "Para recoger" : `Domicilio · ${p.zona_nombre}`}
          </span>
        </div>
        <span className={cn("font-mono text-[11px] uppercase tracking-[0.1em]", tarde ? "animate-pulse font-bold text-rose-400" : "text-paper")}>{hace(p.creado)}</span>
      </div>
      <ul className="relative space-y-1.5 px-4 py-3 text-sm">
        {p.items.map((it, i) => (
          <li key={i}>
            <b className="text-tostado">{it.cantidad}x</b> {it.nombre}
            {it.adiciones.length > 0 && <span className="block pl-6 text-xs text-paper">+ {textoAdiciones(it.adiciones)}</span>}
            {it.nota && <span className="block pl-6 text-xs italic text-tostado/90">“{it.nota}”</span>}
          </li>
        ))}
      </ul>
      <div className="relative flex gap-2 px-4 pb-4">
        {accion && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onAccion(accion.siguiente)}
            className="flex-1 bg-achiote py-3 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-carbon hover:bg-tostado"
          >
            {accion.label}
          </motion.button>
        )}
        {!accion && p.tipo !== "domicilio" && (
          <button type="button" onClick={() => onAccion("entregado")} className="flex-1 border border-paper/20 py-3 font-mono text-[11px] uppercase tracking-[0.15em] hover:border-achiote">
            Entregado
          </button>
        )}
        {!accion && p.tipo === "domicilio" && <p className="flex-1 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-paper">Esperando domiciliario · {TIPO_LABEL[p.tipo]}</p>}
        <button type="button" aria-label="Imprimir" onClick={() => imprimirTicket(p)} className="flex w-11 items-center justify-center border border-paper/20 hover:border-achiote">
          <Printer className="h-4 w-4" />
        </button>
      </div>
    </motion.article>
  )
}
