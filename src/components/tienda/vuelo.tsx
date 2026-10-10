"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent } from "motion/react"

import { formatCOP } from "@/lib/tienda"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------
   Vuelos: la foto del producto (o una etiqueta "+$X") viaja en arco
   desde donde el cliente tocó hasta el total, con estela dorada, y el
   total "recibe" el golpe al aterrizar. Misma firma visual de la landing.
   ------------------------------------------------------------------ */

type Destino = string // nombre del destino registrado ("barra", "boton-hoja", "total-datos"…)

interface Vuelo {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  img?: string
  texto?: string
  destino: Destino
}

interface Ctx {
  lanzar: (o: { desde: Element | DOMRect | null; destino: Destino; img?: string; texto?: string; retraso?: number }) => void
  registrar: (destino: Destino, el: HTMLElement | null) => void
  golpes: Record<Destino, number>
}

const VueloCtx = createContext<Ctx | null>(null)

export function useVuelo() {
  const c = useContext(VueloCtx)
  if (!c) throw new Error("useVuelo fuera de VueloProvider")
  return c
}

const DURACION = 0.95

export function VueloProvider({ children }: { children: React.ReactNode }) {
  const [vuelos, setVuelos] = useState<Vuelo[]>([])
  const [golpes, setGolpes] = useState<Record<Destino, number>>({})
  const destinos = useRef(new Map<Destino, HTMLElement>())
  const n = useRef(0)

  const registrar = useCallback((destino: Destino, el: HTMLElement | null) => {
    if (el) destinos.current.set(destino, el)
    else destinos.current.delete(destino)
  }, [])

  const lanzar = useCallback<Ctx["lanzar"]>(({ desde, destino, img, texto, retraso = 0 }) => {
    if (!desde) return
    const r = desde instanceof Element ? desde.getBoundingClientRect() : desde
    const salir = () =>
      // doble rAF: el destino puede moverse (la barra entra, el total crece) — medimos después de pintar
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const el = destinos.current.get(destino)
          if (!el) return
          const d = el.getBoundingClientRect()
          const x = r.left + r.width / 2
          const y = r.top + r.height / 2
          n.current += 1
          const v: Vuelo = { id: n.current, x, y, dx: d.left + d.width / 2 - x, dy: d.top + d.height / 2 - y, img, texto, destino }
          setVuelos((vs) => [...vs, v])
          window.setTimeout(() => {
            setVuelos((vs) => vs.filter((w) => w.id !== v.id))
            setGolpes((g) => ({ ...g, [destino]: (g[destino] ?? 0) + 1 }))
          }, DURACION * 1000 - 60)
        })
      )
    if (retraso) window.setTimeout(salir, retraso)
    else salir()
  }, [])

  return (
    <VueloCtx.Provider value={{ lanzar, registrar, golpes }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[95]" aria-hidden>
        <AnimatePresence>
          {vuelos.map((v) => (
            <VueloPieza key={v.id} v={v} />
          ))}
        </AnimatePresence>
      </div>
    </VueloCtx.Provider>
  )
}

function VueloPieza({ v }: { v: Vuelo }) {
  // Arco: sube primero (más alto cuanto más lejos viaja) y cae sobre el destino.
  const alto = Math.min(160, 60 + Math.abs(v.dx) * 0.25 + Math.abs(v.dy) * 0.1)
  const x = [0, v.dx * 0.35, v.dx * 0.8, v.dx]
  const y = [0, Math.min(0, v.dy) * 0.35 - alto, v.dy * 0.7 - alto * 0.25, v.dy]
  const tiempos = [0, 0.35, 0.75, 1]
  const transicion = { duration: DURACION, times: tiempos, ease: [0.45, 0, 0.2, 1] as const }

  return (
    <div className="absolute" style={{ left: v.x, top: v.y }}>
      {/* estela: tres destellos dorados que siguen el mismo arco con retraso */}
      {[0.06, 0.12, 0.18].map((d, i) => (
        <motion.span
          key={i}
          className="absolute -ml-2 -mt-2 h-4 w-4 rounded-full bg-achiote blur-[3px]"
          initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
          animate={{ x, y, opacity: [0, 0.55 - i * 0.15, 0.3, 0], scale: [1, 0.8, 0.5, 0.2] }}
          transition={{ ...transicion, delay: d }}
        />
      ))}
      {v.img ? (
        <motion.div
          className="absolute -ml-9 -mt-9 h-[72px] w-[72px] overflow-hidden rounded-full border-2 border-achiote shadow-[0_0_30px_rgba(201,154,62,0.75)]"
          initial={{ x: 0, y: 0, scale: 0.6, rotate: -10, opacity: 0 }}
          animate={{ x, y, scale: [0.6, 1.15, 0.75, 0.3], rotate: [-10, 0, 8, 14], opacity: [0, 1, 1, 0.9] }}
          transition={transicion}
        >
          <Image src={v.img} alt="" fill sizes="72px" className="object-cover" />
        </motion.div>
      ) : (
        <motion.span
          className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border border-achiote bg-carbon px-2.5 py-1 font-mono text-[11px] font-bold text-tostado shadow-[0_0_20px_rgba(201,154,62,0.6)]"
          initial={{ x: 0, y: 0, scale: 0.6, opacity: 0 }}
          animate={{ x, y, scale: [0.6, 1.1, 0.9, 0.5], opacity: [0, 1, 1, 0.8] }}
          transition={transicion}
        >
          {v.texto}
        </motion.span>
      )}
    </div>
  )
}

/** Marca un elemento como destino de vuelos y lo hace "rebotar" con brillo al recibir uno. */
export function Destino({
  nombre,
  children,
  className,
  as = "div",
}: {
  nombre: Destino
  children: React.ReactNode
  className?: string
  as?: "div" | "span"
}) {
  const { registrar, golpes } = useVuelo()
  const golpe = golpes[nombre] ?? 0
  const ref = useCallback((el: HTMLElement | null) => registrar(nombre, el), [registrar, nombre])
  const M = as === "span" ? motion.span : motion.div
  return (
    <M
      ref={ref}
      key={golpe}
      className={cn("relative", as === "span" ? "inline-block" : "", className)}
      initial={golpe ? { scale: 1.12 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 14 }}
    >
      {golpe > 0 && (
        <motion.span
          className="pointer-events-none absolute -inset-2 rounded-full bg-achiote/40 blur-md"
          initial={{ opacity: 0.9, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}
      <span className="relative">{children}</span>
    </M>
  )
}

/** Cifra en pesos que cuenta hacia el nuevo valor en vez de saltar. */
export function Monto({ valor, className }: { valor: number; className?: string }) {
  const mv = useMotionValue(valor)
  const [txt, setTxt] = useState(formatCOP(valor))
  useMotionValueEvent(mv, "change", (v) => setTxt(formatCOP(v)))
  useEffect(() => {
    const c = animate(mv, valor, { duration: 0.7, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [mv, valor])
  return <span className={cn("tabular-nums", className)}>{txt}</span>
}
