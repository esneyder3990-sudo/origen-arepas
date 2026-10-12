"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"

import { Tarjeta, useAdmin } from "@/components/tienda/admin"
import { Cargando, EASE, Etiqueta } from "@/components/tienda/ui"
import { formatCOP } from "@/lib/tienda"
import { Dato } from "./pedidos"

interface Periodo {
  pedidos: number
  ingresos: number
  cancelados: number
  ticket: number
  domicilio: number
  local: number
  top: { nombre: string; cantidad: number }[]
}
type Reporte = Record<"hoy" | "semana" | "mes", Periodo>

const PERIODOS = [
  { id: "hoy", titulo: "Hoy" },
  { id: "semana", titulo: "Última semana (últimos 7 días)" },
  { id: "mes", titulo: "Último mes (últimos 30 días)" },
] as const

export function SeccionReportes() {
  const { llamar } = useAdmin()
  const [r, setR] = useState<Reporte | null>(null)

  useEffect(() => {
    llamar<Reporte>("tienda_admin_reporte").then(setR).catch(() => {})
  }, [llamar])

  if (!r) return <Cargando />

  return (
    <div className="space-y-10">
      {PERIODOS.map(({ id, titulo }, i) => {
        const p = r[id]
        const total = p.domicilio + p.local
        const max = Math.max(...p.top.map((t) => t.cantidad), 1)
        return (
          <motion.section key={id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}>
            <h2 className="mb-4 font-display text-2xl">{titulo}</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Dato etiqueta="Pedidos" valor={String(p.pedidos)} />
              <Dato etiqueta="Ingresos" valor={formatCOP(p.ingresos)} acento />
              <Dato etiqueta="Ticket promedio" valor={formatCOP(p.ticket)} />
              <Dato etiqueta="Cancelados" valor={String(p.cancelados)} />
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Tarjeta className="p-4">
                <Etiqueta className="mb-3">Domicilio vs. local</Etiqueta>
                <div className="flex h-2 overflow-hidden bg-paper/10">
                  <motion.div className="bg-achiote" initial={{ width: 0 }} animate={{ width: total ? `${(p.domicilio / total) * 100}%` : 0 }} transition={{ duration: 0.9, ease: EASE }} />
                  <motion.div className="bg-paper/40" initial={{ width: 0 }} animate={{ width: total ? `${(p.local / total) * 100}%` : 0 }} transition={{ duration: 0.9, delay: 0.1, ease: EASE }} />
                </div>
                <div className="mt-3 space-y-1 font-mono text-xs">
                  <p className="flex justify-between"><span className="flex items-center gap-2"><i className="h-2 w-2 bg-achiote" />Domicilio</span><span>{formatCOP(p.domicilio)} ({total ? Math.round((p.domicilio / total) * 100) : 0}%)</span></p>
                  <p className="flex justify-between"><span className="flex items-center gap-2"><i className="h-2 w-2 bg-paper/40" />Recoger / mesa</span><span>{formatCOP(p.local)} ({total ? Math.round((p.local / total) * 100) : 0}%)</span></p>
                </div>
              </Tarjeta>
              <Tarjeta className="p-4">
                <Etiqueta className="mb-3">Productos más vendidos</Etiqueta>
                {p.top.length === 0 && <p className="text-sm text-paper/75">Sin ventas en este periodo.</p>}
                <ul className="space-y-2.5">
                  {p.top.map((t, j) => (
                    <li key={t.nombre} className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="truncate">{t.nombre}</span>
                        <span className="font-mono text-tostado">{t.cantidad}x</span>
                      </div>
                      <div className="mt-1 h-1 bg-paper/10">
                        <motion.div className="h-full bg-achiote" initial={{ width: 0 }} animate={{ width: `${(t.cantidad / max) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 + j * 0.06, ease: EASE }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            </div>
          </motion.section>
        )
      })}
    </div>
  )
}
