"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronLeft, Info, Plus, Users } from "lucide-react"

import { PanelBarra, Toast, usePedidos, useToast } from "@/components/tienda/admin"
import { MesasGrid, useMenu } from "@/components/tienda/mesas"
import { TomarPedido } from "@/components/tienda/tomar-pedido"
import { Cargando, EASE, Etiqueta } from "@/components/tienda/ui"
import { type Mesa, ESTADO_LABEL, formatCOP, mesaOcupada, numeroPedido, textoAdiciones } from "@/lib/tienda"

export default function MeseroPage() {
  const menu = useMenu()
  const { pedidos, recargar } = usePedidos(6000, 2)
  const [mesa, setMesa] = useState<{ m: Mesa; tomar: boolean } | null>(null)
  const { texto, mostrar } = useToast()

  return (
    <div className="min-h-svh bg-carbon font-sans text-paper">
      <PanelBarra rol="Mesero" icono={Users} />
      {!menu || !pedidos ? (
        <Cargando />
      ) : (
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {!mesa ? (
              <motion.div key="mesas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ ease: EASE }}>
                <p className="mb-4 flex items-center gap-2 border border-paper/12 bg-paper/[0.03] px-4 py-3 text-sm text-paper/85">
                  <Info className="h-4 w-4 shrink-0 text-tostado" /> Toca una mesa libre para tomar un pedido nuevo, o una ocupada para agregar otra ronda o ver la cuenta.
                </p>
                <MesasGrid mesas={menu.mesas} pedidos={pedidos} onElegir={(m, ocupada) => setMesa({ m, tomar: !ocupada })} />
              </motion.div>
            ) : (
              <motion.div key={`mesa-${mesa.m.id}-${mesa.tomar}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ ease: EASE }}>
                <button type="button" onClick={() => setMesa(null)} className="mb-4 flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-paper/80 hover:text-paper">
                  <ChevronLeft className="h-4 w-4" /> Mesas
                </button>
                {mesa.tomar ? (
                  <TomarPedido
                    menu={menu}
                    tipo="mesa"
                    mesaId={mesa.m.id}
                    titulo={mesa.m.nombre}
                    onEnviado={(n) => {
                      mostrar(`Pedido ${numeroPedido(n)} enviado a cocina`)
                      recargar()
                      setMesa(null)
                    }}
                  />
                ) : (
                  <Cuenta mesa={mesa.m} pedidos={mesaOcupada(pedidos, mesa.m.id)} onAgregar={() => setMesa({ m: mesa.m, tomar: true })} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <Toast texto={texto} />
    </div>
  )
}

function Cuenta({ mesa, pedidos, onAgregar }: { mesa: Mesa; pedidos: ReturnType<typeof mesaOcupada>; onAgregar: () => void }) {
  const total = pedidos.reduce((s, p) => s + p.total, 0)
  return (
    <div className="space-y-4">
      <h2 className="font-display text-3xl">{mesa.nombre}</h2>
      {pedidos.map((p) => (
        <div key={p.id} className="border border-paper/12 p-4">
          <div className="flex justify-between font-mono text-xs">
            <span className="font-bold">{numeroPedido(p.numero)} · {formatCOP(p.total)}</span>
            <span className="text-tostado">{ESTADO_LABEL[p.estado]}</span>
          </div>
          <ul className="mt-1 space-y-0.5 text-sm text-paper/75">
            {p.items.map((i, k) => (
              <li key={k}>
                <b className="text-tostado">{i.cantidad}x</b> {i.nombre}
                {i.adiciones.length > 0 && <span className="block pl-6 text-xs text-paper/75">+ {textoAdiciones(i.adiciones)}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-paper/10 pt-3">
        <Etiqueta>Total cuenta</Etiqueta>
        <span className="font-display text-3xl text-achiote">{formatCOP(total)}</span>
      </div>
      <p className="flex items-center gap-2 border border-paper/12 bg-paper/[0.03] px-4 py-3 text-sm text-paper/85">
        <Info className="h-4 w-4 shrink-0 text-tostado" /> El cobro se hace desde Caja — el mesero solo puede agregar más pedidos a esta mesa.
      </p>
      <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onAgregar} className="flex w-full items-center justify-center gap-2 bg-achiote py-3.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-carbon hover:bg-tostado">
        <Plus className="h-4 w-4" /> Agregar pedido a esta mesa
      </motion.button>
    </div>
  )
}
