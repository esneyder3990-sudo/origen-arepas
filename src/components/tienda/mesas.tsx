"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"

import { type Menu, type Mesa, type Pedido, formatCOP, mesaOcupada, rpc } from "@/lib/tienda"
import { EASE } from "@/components/tienda/ui"
import { cn } from "@/lib/utils"

export function useMenu() {
  const [menu, setMenu] = useState<Menu | null>(null)
  useEffect(() => {
    rpc<Menu>("tienda_menu").then(setMenu).catch(() => {})
  }, [])
  return menu
}

export function MesasGrid({ mesas, pedidos, onElegir }: { mesas: Mesa[]; pedidos: Pedido[]; onElegir: (m: Mesa, ocupada: boolean) => void }) {
  if (mesas.length === 0) return <p className="text-sm text-paper/50">No hay mesas activas. Créalas en Panel → Mesas.</p>
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {mesas.map((m, i) => {
        const abiertos = mesaOcupada(pedidos, m.id)
        const ocupada = abiertos.length > 0
        const total = abiertos.reduce((s, p) => s + p.total, 0)
        return (
          <motion.button
            key={m.id}
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.4, ease: EASE }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onElegir(m, ocupada)}
            className={cn(
              "flex aspect-[4/3] flex-col items-center justify-center gap-1 border text-center transition",
              ocupada ? "border-achiote bg-achiote text-carbon shadow-[0_0_20px_rgba(201,154,62,0.35)]" : "border-paper/20 text-paper hover:border-achiote"
            )}
          >
            <span className="text-sm font-bold">{m.nombre}</span>
            <span className={cn("font-mono text-[9px] uppercase tracking-[0.15em]", ocupada ? "text-carbon/75" : "text-paper/50")}>
              {ocupada ? `Ocupada · ${formatCOP(total)}` : "Libre"}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
