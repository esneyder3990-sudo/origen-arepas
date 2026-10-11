"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { Lock, LogOut } from "lucide-react"

import { type Pedido, guardarLocal, leerLocal, rpc } from "@/lib/tienda"
import { Cargando, EASE, Etiqueta, Opcion, inputCls } from "@/components/tienda/ui"
import { cn } from "@/lib/utils"

const PIN_KEY = "origen_admin_pin"

interface AdminCtx {
  pin: string
  salir: () => void
  llamar: <T>(fn: string, args?: Record<string, unknown>) => Promise<T>
}
const Ctx = createContext<AdminCtx | null>(null)

export function useAdmin() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useAdmin fuera de AdminGate")
  return c
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [pin, setPin] = useState<string | null>(null)
  const [estado, setEstado] = useState<"cargando" | "crear" | "entrar" | "listo">("cargando")

  useEffect(() => {
    const guardado = leerLocal<string | null>(PIN_KEY, null)
    const iniciar = async () => {
      if (guardado && (await rpc<boolean>("tienda_admin_login", { p_pin: guardado }).catch(() => false))) {
        setPin(guardado)
        setEstado("listo")
        return
      }
      const e = await rpc<{ pin_configurado: boolean }>("tienda_admin_estado").catch(() => ({ pin_configurado: true }))
      setEstado(e.pin_configurado ? "entrar" : "crear")
    }
    iniciar()
  }, [])

  const salir = useCallback(() => {
    try {
      localStorage.removeItem(PIN_KEY)
    } catch {}
    setPin(null)
    setEstado("entrar")
  }, [])

  const llamar = useCallback(
    async <T,>(fn: string, args: Record<string, unknown> = {}) => {
      try {
        return await rpc<T>(fn, { p_pin: pin, ...args })
      } catch (e) {
        if ((e as Error).message === "PIN incorrecto") salir()
        throw e
      }
    },
    [pin, salir]
  )

  if (estado === "cargando") return <div className="flex min-h-svh bg-carbon"><Cargando /></div>
  if (estado !== "listo" || !pin)
    return (
      <PantallaPin
        crear={estado === "crear"}
        onListo={(p) => {
          guardarLocal(PIN_KEY, p)
          setPin(p)
          setEstado("listo")
        }}
      />
    )

  return <Ctx.Provider value={{ pin, salir, llamar }}>{children}</Ctx.Provider>
}

function PantallaPin({ crear, onListo }: { crear: boolean; onListo: (pin: string) => void }) {
  const [pin, setPin] = useState("")
  const [pin2, setPin2] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (crear && pin !== pin2) return setError("Los PIN no coinciden")
    setEnviando(true)
    try {
      if (crear) await rpc("tienda_admin_crear_pin", { p_pin: pin })
      const ok = await rpc<boolean>("tienda_admin_login", { p_pin: pin })
      if (!ok) throw new Error("PIN incorrecto")
      onListo(pin)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-carbon px-4 font-sans text-paper">
      <motion.form
        onSubmit={enviar}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="w-full max-w-sm border border-paper/15 p-8"
      >
        <div className="mb-8 flex items-center gap-3">
          <Image src="/img/logo-origen-2026.png" alt="Origen" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
          <div>
            <p className="font-display text-xl font-semibold uppercase tracking-tight">Origen</p>
            <Etiqueta>Panel de administración</Etiqueta>
          </div>
        </div>
        <h1 className="mb-1 flex items-center gap-2 font-display text-3xl">
          <Lock className="h-5 w-5 text-tostado" /> {crear ? "Crea tu PIN" : "Ingresa tu PIN"}
        </h1>
        <p className="mb-6 text-sm text-paper/60">
          {crear ? "Es la primera vez que entras. Elige un PIN de al menos 6 caracteres para proteger el panel." : "Para entrar al panel y a los paneles de cocina, mesero, caja y domicilios."}
        </p>
        <input type="password" className={inputCls} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" autoFocus autoComplete={crear ? "new-password" : "current-password"} />
        {crear && (
          <input type="password" className={cn(inputCls, "mt-3")} value={pin2} onChange={(e) => setPin2(e.target.value)} placeholder="Repite el PIN" autoComplete="new-password" />
        )}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={enviando || pin.length < (crear ? 6 : 1)}
          className="mt-6 w-full bg-achiote py-3.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-carbon transition hover:bg-tostado disabled:opacity-40"
        >
          {enviando ? "Verificando…" : "Entrar"}
        </button>
      </motion.form>
    </div>
  )
}

/** Pedidos recientes con refresco automático — así cocina, caja y el panel
 *  ven entrar pedidos nuevos sin recargar. */
export function usePedidos(intervaloMs = 6000, dias = 2) {
  const { llamar } = useAdmin()
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recargar = useCallback(
    () =>
      llamar<Pedido[]>("tienda_admin_pedidos", { p_dias: dias })
        .then((p) => {
          setPedidos(p)
          setError(null)
        })
        .catch((e: Error) => setError(e.message)),
    [llamar, dias]
  )

  useEffect(() => {
    const t = window.setInterval(recargar, intervaloMs)
    const primero = window.setTimeout(recargar, 0)
    return () => {
      window.clearInterval(t)
      window.clearTimeout(primero)
    }
  }, [recargar, intervaloMs])

  const actualizar = useCallback(
    async (id: string, cambios: Partial<Pick<Pedido, "estado" | "pago_confirmado" | "metodo_pago" | "cuenta">>) => {
      setPedidos((ps) => ps?.map((p) => (p.id === id ? { ...p, ...cambios } : p)) ?? ps)
      await llamar("tienda_admin_actualizar_pedido", { p_id: id, p_cambios: cambios })
      recargar()
    },
    [llamar, recargar]
  )

  return { pedidos, error, recargar, actualizar }
}

/** Barra superior oscura de los paneles operativos (cocina, mesero, caja, domicilios). */
export function PanelBarra({ rol, icono: Icono, children }: { rol: string; icono: React.ElementType; children?: React.ReactNode }) {
  const { salir } = useAdmin()
  return (
    <header className="sticky top-0 z-40 border-b border-paper/10 bg-[#080605]/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center bg-achiote text-carbon">
            <Icono className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="font-display text-lg font-semibold uppercase tracking-tight">Origen</span>
          <span className="border-l border-paper/15 pl-3 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">{rol}</span>
        </div>
        <div className="flex items-center gap-2">
          {children}
          <Link href="/admin" className="hidden border border-paper/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-paper/70 hover:border-achiote sm:block">
            Panel
          </Link>
          <button type="button" onClick={salir} className="flex items-center gap-1.5 border border-paper/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-paper/70 hover:border-achiote">
            <LogOut className="h-3.5 w-3.5" /> Salir
          </button>
        </div>
      </div>
    </header>
  )
}

export function Toast({ texto }: { texto: string | null }) {
  return (
    <AnimatePresence>
      {texto && (
        <motion.div
          key={texto}
          initial={{ opacity: 0, y: 16, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 16, x: "-50%" }}
          className="fixed bottom-6 left-1/2 z-[95] max-w-[90vw] border border-achiote/60 bg-carbon px-5 py-3 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-paper shadow-[0_0_24px_rgba(201,154,62,0.35)]"
        >
          {texto}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function useToast() {
  const [texto, setTexto] = useState<string | null>(null)
  const mostrar = useCallback((t: string) => {
    setTexto(t)
    window.setTimeout(() => setTexto((x) => (x === t ? null : x)), 2400)
  }, [])
  return { texto, mostrar }
}

export function Tarjeta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("border border-paper/12 bg-paper/[0.02]", className)}>{children}</div>
}

export function Boton({
  children,
  onClick,
  variante = "primario",
  className,
  disabled,
  type = "button",
}: {
  children: React.ReactNode
  onClick?: () => void
  variante?: "primario" | "borde" | "peligro" | "exito"
  className?: string
  disabled?: boolean
  type?: "button" | "submit"
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition disabled:opacity-40",
        variante === "primario" && "bg-achiote font-bold text-carbon hover:bg-tostado",
        variante === "borde" && "border border-paper/20 text-paper hover:border-achiote",
        variante === "peligro" && "border border-red-400/40 bg-red-400/10 text-red-200 hover:bg-red-400/20",
        variante === "exito" && "bg-tostado font-bold text-carbon hover:bg-paper",
        className
      )}
    >
      {children}
    </motion.button>
  )
}

// ---------- cuentas de transferencia (Nequi, Bre-B, DaviPlata…) ----------
export const CUENTAS_POR_DEFECTO = ["Nequi", "Bre-B", "DaviPlata"]
let cacheCuentas: string[] | null = null

/** Lista de cuentas configurada en Ajustes (se pide una sola vez por sesión). */
export function useCuentas() {
  const [cuentas, setCuentas] = useState<string[]>(cacheCuentas ?? CUENTAS_POR_DEFECTO)
  useEffect(() => {
    if (cacheCuentas) return
    rpc<{ ajustes: { cuentas?: string[] } }>("tienda_menu")
      .then((m) => {
        cacheCuentas = m.ajustes.cuentas?.length ? m.ajustes.cuentas : CUENTAS_POR_DEFECTO
        setCuentas(cacheCuentas)
      })
      .catch(() => {})
  }, [])
  return cuentas
}
export const olvidarCuentas = () => {
  cacheCuentas = null
}

/** "¿A qué cuenta entró?" — botones Nequi / Bre-B / DaviPlata. */
export function SelectorCuenta({ valor, onCambio, grupo, titulo = "¿A qué cuenta?" }: { valor: string; onCambio: (c: string) => void; grupo: string; titulo?: string }) {
  const cuentas = useCuentas()
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
      <p className="mb-1.5 mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-tostado">{titulo}</p>
      <div className={cn("grid gap-2", cuentas.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
        {cuentas.map((c) => (
          <Opcion key={c} grupo={grupo} activa={valor === c} onClick={() => onCambio(c)}>
            {c}
          </Opcion>
        ))}
      </div>
    </motion.div>
  )
}
