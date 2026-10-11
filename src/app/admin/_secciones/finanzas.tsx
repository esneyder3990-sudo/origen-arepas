"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"

import { Tarjeta, useAdmin } from "@/components/tienda/admin"
import { Cargando, EASE, Etiqueta } from "@/components/tienda/ui"
import { Monto } from "@/components/tienda/vuelo"
import { formatCOP } from "@/lib/tienda"
import { cn } from "@/lib/utils"
import { ListaEditable } from "./comun"

interface Ganancia {
  mes: string
  pedidos: number
  ventas: number
  domicilios: number
  ventas_rappi: number
  compras: number
  gastos: number
  ganancia: number
  meses: string[]
}
interface Gasto { id: number; nombre: string; valor_mensual: number; activo: boolean }

const nombreMes = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
const hoyMes = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).slice(0, 7) + "-01"

export function SeccionFinanzas() {
  const { llamar } = useAdmin()
  const [mes, setMes] = useState(hoyMes)
  const [g, setG] = useState<Ganancia | null>(null)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    llamar<Ganancia>("tienda_admin_ganancia", { p_mes: mes }).then(setG).catch(() => {})
  }, [llamar, mes, recarga])

  if (!g) return <Cargando />
  const meses = g.meses.includes(hoyMes()) ? g.meses : [hoyMes(), ...g.meses]
  const max = Math.max(g.ventas, g.compras + g.gastos, 1)
  const positiva = g.ganancia >= 0
  const esMesActual = mes === hoyMes()

  const filas = [
    { label: "Ventas de productos", valor: g.ventas, tono: "bg-achiote", signo: "+" },
    { label: "Compras del mes", valor: g.compras, tono: "bg-paper/45", signo: "−" },
    { label: "Gastos fijos", valor: g.gastos, tono: "bg-paper/25", signo: "−" },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {meses.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMes(m.slice(0, 10))}
            className={cn("relative px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em]", mes === m.slice(0, 10) ? "text-carbon" : "border border-paper/15 text-paper/60")}
          >
            {mes === m.slice(0, 10) && <motion.span layoutId="mes-finanzas" className="absolute inset-0 bg-achiote" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative">{nombreMes(m)}</span>
          </button>
        ))}
      </div>

      <motion.div key={mes} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Tarjeta className={cn("p-6", positiva ? "border-achiote/50 shadow-[0_0_40px_rgba(201,154,62,0.12)]" : "border-red-400/40")}>
          <Etiqueta>Ganancia {esMesActual ? "del mes (hasta hoy)" : `de ${nombreMes(mes)}`}</Etiqueta>
          <Monto valor={g.ganancia} className={cn("mt-2 block font-display text-5xl sm:text-6xl", positiva ? "text-achiote" : "text-red-300")} />
          <p className="mt-2 text-sm text-paper/55">
            {g.pedidos} pedidos · ventas − compras − gastos fijos
          </p>
          <div className="mt-6 space-y-4">
            {filas.map((f, i) => (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-paper/75">{f.label}</span>
                  <span className="font-mono">
                    {f.signo} {formatCOP(f.valor)}
                  </span>
                </div>
                <div className="h-2 bg-paper/8">
                  <motion.div className={cn("h-full", f.tono)} initial={{ width: 0 }} animate={{ width: `${(f.valor / max) * 100}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.1, ease: EASE }} />
                </div>
              </div>
            ))}
          </div>
          {esMesActual && (
            <p className="mt-5 border-t border-paper/10 pt-3 text-xs text-paper/50">
              Los gastos fijos se cuentan completos desde el primer día del mes; la ganancia sube a medida que entran ventas.
            </p>
          )}
        </Tarjeta>

        <div className="grid grid-cols-2 gap-3 self-start">
          <Tarjeta className="p-4">
            <Etiqueta>Domicilios cobrados</Etiqueta>
            <p className="mt-1 font-display text-2xl">{formatCOP(g.domicilios)}</p>
            <p className="mt-1 text-xs text-paper/45">Van para el domiciliario; no cuentan como venta.</p>
          </Tarjeta>
          <Tarjeta className="p-4">
            <Etiqueta>Ventas por Rappi</Etiqueta>
            <p className="mt-1 font-display text-2xl">{formatCOP(g.ventas_rappi)}</p>
            <p className="mt-1 text-xs text-paper/45">Incluidas en las ventas (sin descontar comisión).</p>
          </Tarjeta>
          <Tarjeta className="col-span-2 p-4">
            <Etiqueta>Ticket promedio</Etiqueta>
            <p className="mt-1 font-display text-2xl">{formatCOP(g.pedidos ? Math.round(g.ventas / g.pedidos) : 0)}</p>
          </Tarjeta>
        </div>
      </motion.div>

      <section>
        <h2 className="mb-1 font-display text-2xl">Gastos fijos del mes</h2>
        <p className="mb-4 text-sm text-paper/55">Gas, agua, luz, arriendo, internet… Lo que pagas cada mes sin importar cuánto vendas.</p>
        <ListaEditable<Gasto & Record<string, unknown>>
          tabla="gastos"
          nombre="gasto"
          campos={[
            { k: "nombre", label: "Nombre", tipo: "texto", placeholder: "Arriendo" },
            { k: "valor_mensual", label: "Valor mensual (COP)", tipo: "numero" },
            { k: "activo", label: "Contar este gasto", tipo: "bool" },
          ]}
          nueva={{ nombre: "", valor_mensual: 0, activo: true }}
          onCambio={() => setRecarga((r) => r + 1)}
          render={(x) => (
            <div className="flex items-center justify-between gap-3 pr-2">
              <p className="text-sm">{x.nombre}</p>
              <p className="font-mono text-sm text-tostado">{formatCOP(x.valor_mensual)}/mes</p>
            </div>
          )}
        />
      </section>
    </div>
  )
}
