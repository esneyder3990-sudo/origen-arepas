"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Bell, BellOff, ChefHat, Printer } from "lucide-react"

import { PanelBarra, sonidoOrigen, usePedidos } from "@/components/tienda/admin"
import { Cargando, EASE, Etiqueta } from "@/components/tienda/ui"
import { type EstadoPedido, type Pedido, TIPO_LABEL, hace, minutosDesde, numeroPedido, visibleEnCocina, textoAdiciones } from "@/lib/tienda"
import { imprimirTicket } from "@/lib/ticket"
import { cn } from "@/lib/utils"

const COLUMNAS: { estado: EstadoPedido; titulo: string; accion?: { label: string; siguiente: EstadoPedido } }[] = [
  { estado: "recibido", titulo: "Nuevos", accion: { label: "Empezar", siguiente: "preparacion" } },
  { estado: "preparacion", titulo: "En preparación", accion: { label: "Listo", siguiente: "listo" } },
  { estado: "listo", titulo: "Listos para entregar" },
]

export default function CocinaPage() {
  const { pedidos, actualizar } = usePedidos(5000, 1)
  const [sonido, setSonido] = useState(true)
  const vistos = useRef<Set<string> | null>(null)
  const [, tic] = useState(0)

  useEffect(() => {
    const t = window.setInterval(() => tic((x) => x + 1), 30000)
    return () => window.clearInterval(t)
  }, [])

  const cola = useMemo(() => (pedidos ?? []).filter(visibleEnCocina), [pedidos])

  useEffect(() => {
    if (!pedidos) return
    const ids = new Set(cola.filter((p) => p.estado === "recibido").map((p) => p.id))
    const pushActivo = typeof Notification !== "undefined" && Notification.permission === "granted"
    if (vistos.current && sonido && !pushActivo && [...ids].some((id) => !vistos.current!.has(id))) sonidoOrigen()
    vistos.current = new Set([...(vistos.current ?? []), ...ids])
  }, [pedidos, cola, sonido])

  return (
    <div className="min-h-svh bg-carbon font-sans text-paper">
      <PanelBarra rol="Cocina" icono={ChefHat}>
        <button
          type="button"
          onClick={() => setSonido((s) => !s)}
          aria-label={sonido ? "Silenciar alertas" : "Activar alertas"}
          className={cn("flex h-9 w-9 items-center justify-center border", sonido ? "border-achiote text-tostado" : "border-paper/15 text-paper/75")}
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
                  <Etiqueta className={col.estado === "recibido" ? "text-tostado" : ""}>{col.titulo}</Etiqueta>
                  <span className="font-mono text-xs text-paper/75">{lista.length}</span>
                </div>
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {lista.map((p) => (
                      <TarjetaCocina key={p.id} p={p} accion={col.accion} onAccion={(e) => actualizar(p.id, { estado: e })} />
                    ))}
                  </AnimatePresence>
                  {lista.length === 0 && <p className="border border-dashed border-paper/10 py-10 text-center text-sm text-paper/65">Sin pedidos</p>}
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
      className={cn("relative border bg-paper/[0.02]", p.estado === "recibido" ? "border-achiote/70" : "border-paper/12")}
    >
      {p.estado === "recibido" && (
        <motion.span
          className="pointer-events-none absolute inset-0 border-2 border-achiote shadow-[inset_0_0_30px_rgba(201,154,62,0.25)]"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className="relative flex items-start justify-between gap-2 border-b border-paper/10 px-4 py-3">
        <div>
          <p className="font-sans text-3xl font-bold leading-none">{numeroPedido(p.numero)}</p>
          <span className="mt-2 inline-block border border-achiote/50 bg-achiote/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-tostado">
            {p.tipo === "mesa" ? p.mesa_nombre : p.tipo === "recoger" ? "Para recoger" : `Domicilio · ${p.zona_nombre}`}
          </span>
        </div>
        <span className={cn("font-mono text-[10px] uppercase tracking-[0.1em]", tarde ? "text-tostado" : "text-paper/75")}>{hace(p.creado)}</span>
      </div>
      <ul className="relative space-y-1.5 px-4 py-3 text-sm">
        {p.items.map((it, i) => (
          <li key={i}>
            <b className="text-tostado">{it.cantidad}x</b> {it.nombre}
            {it.adiciones.length > 0 && <span className="block pl-6 text-xs text-paper/80">+ {textoAdiciones(it.adiciones)}</span>}
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
        {!accion && p.tipo === "domicilio" && <p className="flex-1 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/75">Esperando domiciliario · {TIPO_LABEL[p.tipo]}</p>}
        <button type="button" aria-label="Imprimir" onClick={() => imprimirTicket(p)} className="flex w-11 items-center justify-center border border-paper/20 hover:border-achiote">
          <Printer className="h-4 w-4" />
        </button>
      </div>
    </motion.article>
  )
}
