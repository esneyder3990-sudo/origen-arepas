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
          className="fixed bottom-24 left-1/2 z-[90] border border-achiote/60 bg-carbon px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-paper shadow-[0_0_24px_rgba(245,196,0,0.35)]"
          role="status"
        >
          {texto}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Etiqueta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[10px] uppercase tracking-[0.2em] text-paper/80", className)}>{children}</p>
}

export const inputCls =
  "w-full border border-paper/15 bg-paper/[0.03] px-3.5 py-3 text-sm text-paper placeholder:text-paper/65 outline-none transition focus:border-achiote focus:shadow-[0_0_0_3px_rgba(245,196,0,0.15)]"

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
        activa ? "border-transparent text-paper" : "border-paper/15 text-paper/85 hover:border-paper/40"
      )}
    >
      {activa && (
        <motion.span
          layoutId={`opcion-${grupo}`}
          className="absolute inset-0 border border-achiote bg-achiote/15 shadow-[0_0_16px_rgba(245,196,0,0.3)]"
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

/** Logo oficial de WhatsApp (se pinta con currentColor). */
export function WhatsAppIcono({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.45 1.32 4.95L2 22l5.24-1.37a9.9 9.9 0 0 0 4.8 1.22h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2zm0 18.2h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.23 8.23 0 0 1-1.26-4.4c0-4.55 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.25 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.41 1.02 2.58.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z" />
    </svg>
  )
}

/** Verde oficial de WhatsApp, para que el botón se reconozca de inmediato. */
export const waBotonCls =
  "bg-[#25D366] text-white shadow-[0_0_24px_rgba(37,211,102,0.35)] transition hover:bg-[#1ebe5b]"
