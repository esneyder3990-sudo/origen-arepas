"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import {
  Armchair,
  Bike,
  ChartColumn,
  PiggyBank,
  ChefHat,
  ClipboardList,
  Clock,
  ExternalLink,
  Heart,
  LogOut,
  Menu as MenuIcon,
  Package,
  Settings,
  Ticket,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react"

import { useAdmin } from "@/components/tienda/admin"
import { EASE } from "@/components/tienda/ui"
import { guardarLocal, leerLocal } from "@/lib/tienda"
import { cn } from "@/lib/utils"

import { SeccionPedidos } from "./_secciones/pedidos"
import { SeccionReportes } from "./_secciones/reportes"
import { SeccionFinanzas } from "./_secciones/finanzas"
import { SeccionMenu } from "./_secciones/menu"
import { SeccionInventario } from "./_secciones/inventario"
import { SeccionMesas } from "./_secciones/mesas"
import { SeccionCupones } from "./_secciones/cupones"
import { SeccionHorario } from "./_secciones/horario"
import { SeccionFidelizacion } from "./_secciones/fidelizacion"
import { SeccionAjustes } from "./_secciones/ajustes"

const SECCIONES = [
  { id: "pedidos", label: "Pedidos", icono: ClipboardList, C: SeccionPedidos },
  { id: "reportes", label: "Reportes", icono: ChartColumn, C: SeccionReportes },
  { id: "finanzas", label: "Finanzas", icono: PiggyBank, C: SeccionFinanzas },
  { id: "menu", label: "Menú", icono: UtensilsCrossed, C: SeccionMenu },
  { id: "inventario", label: "Inventario", icono: Package, C: SeccionInventario },
  { id: "mesas", label: "Mesas", icono: Armchair, C: SeccionMesas },
  { id: "cupones", label: "Cupones", icono: Ticket, C: SeccionCupones },
  { id: "horario", label: "Horario", icono: Clock, C: SeccionHorario },
  { id: "fidelizacion", label: "Fidelización", icono: Heart, C: SeccionFidelizacion },
  { id: "ajustes", label: "Ajustes", icono: Settings, C: SeccionAjustes },
] as const

const PANELES = [
  { href: "/admin/cocina", label: "Cocina", icono: ChefHat },
  { href: "/admin/mesero", label: "Mesero", icono: Users },
  { href: "/admin/caja", label: "Caja", icono: Wallet },
  { href: "/admin/domicilios", label: "Domicilios", icono: Bike },
]

type SeccionId = (typeof SECCIONES)[number]["id"]
const SECCION_KEY = "origen_admin_seccion"

export default function AdminPage() {
  const { salir } = useAdmin()
  // AdminGate solo monta esta página en el cliente (tras validar el PIN).
  const [seccion, setSeccion] = useState<SeccionId>(() => {
    const s = typeof window === "undefined" ? "pedidos" : leerLocal<SeccionId>(SECCION_KEY, "pedidos")
    return SECCIONES.some((x) => x.id === s) ? s : "pedidos"
  })
  const [abierto, setAbierto] = useState(false)

  const ir = (id: SeccionId) => {
    setSeccion(id)
    guardarLocal(SECCION_KEY, id)
    setAbierto(false)
  }

  const actual = SECCIONES.find((s) => s.id === seccion) ?? SECCIONES[0]
  const Contenido = actual.C

  const barra = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-paper/10 px-5">
        <Image src="/img/logo-origen-2026.png" alt="Origen" width={34} height={34} className="h-[34px] w-[34px] rounded-full object-cover" />
        <span className="font-display text-lg font-semibold uppercase tracking-tight">Origen</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 font-mono text-[9px] uppercase tracking-[0.25em] text-paper/35">General</p>
        {SECCIONES.map((s) => {
          const activa = s.id === seccion
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => ir(s.id)}
              className={cn("relative flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition", activa ? "text-carbon" : "text-paper/70 hover:text-paper")}
            >
              {activa && (
                <motion.span
                  layoutId="admin-seccion"
                  className="absolute inset-0 bg-achiote shadow-[0_0_20px_rgba(201,154,62,0.35)]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <s.icono className="relative h-4 w-4" strokeWidth={1.75} />
              <span className="relative font-medium">{s.label}</span>
            </button>
          )
        })}
        <p className="mb-2 mt-6 px-3 font-mono text-[9px] uppercase tracking-[0.25em] text-paper/35">Paneles</p>
        {PANELES.map((p) => (
          <Link key={p.href} href={p.href} className="flex items-center gap-3 px-3 py-2.5 text-sm text-paper/70 transition hover:text-tostado">
            <p.icono className="h-4 w-4" strokeWidth={1.75} />
            {p.label}
          </Link>
        ))}
        <Link href="/" target="_blank" className="flex items-center gap-3 px-3 py-2.5 text-sm text-paper/70 transition hover:text-tostado">
          <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          Ver sitio
        </Link>
      </nav>
      <button type="button" onClick={salir} className="flex items-center gap-3 border-t border-paper/10 px-8 py-4 text-sm text-paper/60 hover:text-paper">
        <LogOut className="h-4 w-4" /> Salir
      </button>
    </div>
  )

  return (
    <div className="flex min-h-svh flex-1 bg-carbon font-sans text-paper">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 border-r border-paper/10 bg-[#080605] lg:block">{barra}</aside>

      <AnimatePresence>
        {abierto && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-carbon/70 backdrop-blur-sm" onClick={() => setAbierto(false)} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: EASE }}
              className="relative h-full w-64 border-r border-paper/10 bg-[#080605]"
            >
              {barra}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-paper/10 bg-carbon/85 px-4 backdrop-blur-md sm:px-8">
          <button type="button" onClick={() => setAbierto((v) => !v)} aria-label="Abrir menú" className="lg:hidden">
            {abierto ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
          <h1 className="font-display text-2xl font-semibold">{actual.label}</h1>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={seccion}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <Contenido />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
