"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Cookie, CupSoda, Minus, Plus, Popcorn, Salad, Sandwich, ShoppingBag, Utensils, X } from "lucide-react"

import { cn } from "@/lib/utils"

export const EASE = [0.22, 1, 0.36, 1] as const

const ICONOS = { arepa: Cookie, patacon: Sandwich, entrada: Salad, bolsa: ShoppingBag, papas: Popcorn, bebida: CupSoda } as const
export const ICONOS_DISPONIBLES = Object.keys(ICONOS)

export function CategoriaIcono({ icono, className }: { icono: string; className?: string }) {
  const Icono = ICONOS[icono as keyof typeof ICONOS] ?? Utensils
  return <Icono className={className} strokeWidth={1.5} />
}

/** Hoja inferior en móvil, modal centrado en desktop — misma pieza para
 *  detalle de producto, "¿le agregas algo más?" y carrito. */
export function Hoja({
  abierta,
  onCerrar,
  children,
  className,
  titulo,
}: {
  abierta: boolean
  onCerrar: () => void
  children: React.ReactNode
  className?: string
  titulo?: string
}) {
  useEffect(() => {
    if (!abierta) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar()
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [abierta, onCerrar])

  return (
    <AnimatePresence>
      {abierta && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-carbon/75 backdrop-blur-sm" onClick={onCerrar} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className={cn(
              "relative flex max-h-[92svh] w-full flex-col overflow-hidden border-t border-paper/15 bg-[#120E0B] text-paper sm:max-w-lg sm:border",
              className
            )}
          >
            <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-paper/20 sm:hidden" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function BotonCerrar({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar"
      className={cn(
        "flex h-9 w-9 items-center justify-center border border-paper/20 bg-carbon/70 text-paper backdrop-blur-sm transition hover:border-achiote",
        className
      )}
    >
      <X className="h-4 w-4" />
    </button>
  )
}

export function Contador({
  valor,
  onCambiar,
  min = 0,
  max = 50,
  compacto,
}: {
  valor: number
  onCambiar: (v: number) => void
  min?: number
  max?: number
  compacto?: boolean
}) {
  const t = compacto ? "h-7 w-7" : "h-9 w-9"
  return (
    <div className="flex items-center gap-1">
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        disabled={valor <= min}
        onClick={() => onCambiar(valor - 1)}
        aria-label="Quitar uno"
        className={cn(t, "flex items-center justify-center border border-paper/20 text-paper transition hover:border-achiote disabled:opacity-30")}
      >
        <Minus className="h-3.5 w-3.5" />
      </motion.button>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={valor}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={cn("text-center font-mono text-sm tabular-nums", compacto ? "w-6" : "w-8")}
        >
          {valor}
        </motion.span>
      </AnimatePresence>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        disabled={valor >= max}
        onClick={() => onCambiar(valor + 1)}
        aria-label="Agregar uno"
        className={cn(
          t,
          "flex items-center justify-center border transition disabled:opacity-30",
          valor > 0 ? "border-achiote text-tostado" : "border-paper/20 text-paper hover:border-achiote"
        )}
      >
        <Plus className="h-3.5 w-3.5" />
      </motion.button>
    </div>
  )
}

export function Aviso({ texto }: { texto: string | null }) {
  return (
    <AnimatePresence>
      {texto && (
        <motion.div
          key={texto}
          initial={{ opacity: 0, y: 16, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 16, x: "-50%" }}
          transition={{ duration: 0.3, ease: EASE }}
          className="fixed bottom-24 left-1/2 z-[90] border border-achiote/60 bg-carbon px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-paper shadow-[0_0_24px_rgba(201,154,62,0.35)]"
          role="status"
        >
          {texto}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Etiqueta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60", className)}>{children}</p>
}

export const inputCls =
  "w-full border border-paper/15 bg-paper/[0.03] px-3.5 py-3 text-sm text-paper placeholder:text-paper/35 outline-none transition focus:border-achiote focus:shadow-[0_0_0_3px_rgba(201,154,62,0.15)]"

export function Opcion({
  activa,
  onClick,
  children,
  grupo,
}: {
  activa: boolean
  onClick: () => void
  children: React.ReactNode
  grupo: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        "relative border px-3 py-3 font-mono text-[11px] uppercase tracking-[0.12em] transition",
        activa ? "border-transparent text-paper" : "border-paper/15 text-paper/70 hover:border-paper/40"
      )}
    >
      {activa && (
        <motion.span
          layoutId={`opcion-${grupo}`}
          className="absolute inset-0 border border-achiote bg-achiote/15 shadow-[0_0_16px_rgba(201,154,62,0.3)]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  )
}

export function Cargando({ texto = "Cargando" }: { texto?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
      <motion.span
        className="h-10 w-10 rounded-full border-2 border-paper/10 border-t-achiote"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
      <Etiqueta>{texto}</Etiqueta>
    </div>
  )
}
