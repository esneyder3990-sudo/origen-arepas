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
        <p className="mb-6 text-sm text-paper/80">
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
// Desde esta fecha se lleva el consecutivo 001, 002… de todos los pedidos.
const CONSECUTIVO_DESDE = "2026-09-27"
const fechaBogota = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
const restarDias = (f: string, n: number) => {
  const d = new Date(`${f}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

export function usePedidos(intervaloMs = 6000, dias = 2) {
  const { llamar } = useAdmin()
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recargar = useCallback(
    () =>
      // Se pide siempre desde el 27 de septiembre para poder contar el consecutivo, y luego se recorta a lo que pide cada pantalla.
      llamar<Pedido[]>("tienda_admin_pedidos", {
        p_dias: Math.max(dias, Math.round((+new Date(`${fechaBogota()}T12:00:00Z`) - +new Date(`${CONSECUTIVO_DESDE}T12:00:00Z`)) / 86400000) + 1),
      })
        .then((todos) => {
          const orden = todos
            .filter((x) => x.fecha >= CONSECUTIVO_DESDE)
            .sort((a, b) => (a.fecha + a.creado + String(a.numero).padStart(6, "0")).localeCompare(b.fecha + b.creado + String(b.numero).padStart(6, "0")))
          const corrido = new Map(orden.map((x, i) => [x.id, i + 1]))
          const limite = restarDias(fechaBogota(), dias - 1)
          const p = todos.filter((x) => x.fecha >= limite).map((x) => ({ ...x, consecutivo: corrido.get(x.id) }))
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
          <span className="border-l border-paper/15 pl-3 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/75">{rol}</span>
        </div>
        <div className="flex items-center gap-2">
          <ActivarAvisos rol={(["cocina", "caja", "domicilios", "mesero"] as const).find((r) => r === rol.toLowerCase()) ?? "panel"} />
          {children}
          <Link href="/admin" className="border border-paper/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-paper/85 hover:border-achiote">
            Panel
          </Link>
          <button type="button" onClick={salir} className="flex items-center gap-1.5 border border-paper/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-paper/85 hover:border-achiote">
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

// ---------- sonido de Origen + avisos push ----------

/** Campanita de Origen: tres notas que suben (Do–Mi–Sol), tres veces y a buen volumen para oírse en la cocina. */
let ultimoSonido = 0
export function sonidoOrigen() {
  // Si el aviso llega por dos caminos a la vez (push y consulta), que suene una sola vez.
  if (Date.now() - ultimoSonido < 8000) return
  ultimoSonido = Date.now()
  try {
    const ctx = new AudioContext()
    void ctx.resume()
    // El compresor sube el volumen percibido sin que el sonido se corte ni distorsione.
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 6
    const master = ctx.createGain()
    master.gain.value = 1.6
    comp.connect(master).connect(ctx.destination)
    const notas = [1046.5, 1318.5, 1568]
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      notas.forEach((f, i) => {
        const t = ctx.currentTime + vuelta * 0.85 + i * 0.18
        for (const [mult, vol] of [[1, 0.7], [2, 0.28], [3, 0.12]] as const) {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.type = "triangle"
          o.frequency.value = f * mult
          g.gain.setValueAtTime(0.0001, t)
          g.gain.exponentialRampToValueAtTime(vol, t + 0.015)
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
          o.connect(g).connect(comp)
          o.start(t)
          o.stop(t + 0.65)
        }
      })
    }
  } catch {}
}

const claveAUint8 = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

/** Botón para que este celular reciba avisos de pedidos nuevos (con pantalla apagada). */
export function ActivarAvisos({ rol }: { rol: "cocina" | "caja" | "domicilios" | "mesero" | "panel" }) {
  const { llamar } = useAdmin()
  const [estado, setEstado] = useState<"cargando" | "no-soportado" | "iphone" | "bloqueado" | "apagado" | "activo">("cargando")
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    const revisar = async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
      const instalada = window.matchMedia("(display-mode: standalone)").matches
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setEstado(ios && !instalada ? "iphone" : "no-soportado")
        return
      }
      if (Notification.permission === "denied") return setEstado("bloqueado")
      const reg = await navigator.serviceWorker.register("/sw.js")
      const sub = await reg.pushManager.getSubscription()
      setEstado(sub && Notification.permission === "granted" ? "activo" : "apagado")
    }
    revisar().catch(() => setEstado("no-soportado"))

    // Con el panel abierto, cada aviso suena también con la campanita de Origen.
    const alMensaje = (e: MessageEvent) => {
      if (e.data?.tipo === "pedido-nuevo") sonidoOrigen()
    }
    navigator.serviceWorker?.addEventListener("message", alMensaje)
    return () => navigator.serviceWorker?.removeEventListener("message", alMensaje)
  }, [])

  const activar = async () => {
    setOcupado(true)
    try {
      const permiso = await Notification.requestPermission()
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "apagado")
        return
      }
      const reg = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready
      const clave = await rpc<string | null>("tienda_push_clave")
      if (!clave) throw new Error("Avisos no configurados")
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveAUint8(clave) }))
      await llamar("tienda_admin_guardar_push", { p_sub: sub.toJSON(), p_rol: rol })
      sonidoOrigen()
      setEstado("activo")
    } catch {
      setEstado("no-soportado")
    } finally {
      setOcupado(false)
    }
  }

  if (estado === "cargando") return null
  if (estado === "activo")
    return (
      <button
        type="button"
        onClick={sonidoOrigen}
        title="Avisos activos en este celular · toca para escuchar el sonido"
        className="flex h-9 items-center gap-1.5 border border-achiote/60 bg-achiote/15 px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-tostado"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-achiote opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-achiote" />
        </span>
        <span className="hidden sm:inline">Avisos activos</span>
        <span className="sm:hidden">🔔</span>
      </button>
    )
  const texto =
    estado === "iphone"
      ? "En iPhone: agrégala a la pantalla de inicio y ábrela desde ahí"
      : estado === "bloqueado"
        ? "Avisos bloqueados: actívalos en los ajustes del navegador"
        : estado === "no-soportado"
          ? "Este navegador no admite avisos"
          : null
  if (texto) return <span className="max-w-[12rem] text-right text-[10px] leading-tight text-paper/75">{texto}</span>
  return (
    <motion.button
      type="button"
      onClick={activar}
      disabled={ocupado}
      animate={{ boxShadow: ["0 0 0 0 rgba(201,154,62,0.6)", "0 0 0 8px rgba(201,154,62,0)"] }}
      transition={{ duration: 1.6, repeat: Infinity }}
      className="flex h-9 items-center gap-1.5 bg-achiote px-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-carbon"
    >
      🔔 {ocupado ? "Activando…" : "Activar avisos"}
    </motion.button>
  )
}
