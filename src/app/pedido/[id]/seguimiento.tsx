"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "motion/react"
import { Check, RotateCcw } from "lucide-react"

import { type EstadoPedido, type Pedido, ESTADO_LABEL, TIPO_LABEL, formatCOP, guardarLocal, leerLocal, numeroPedido, resumenPedido, rpc, waLink, textoAdiciones } from "@/lib/tienda"
import { Cargando, EASE, Etiqueta, WhatsAppIcono, waBotonCls } from "@/components/tienda/ui"
import { cn } from "@/lib/utils"

const DESCRIPCION: Partial<Record<EstadoPedido, string>> = {
  recibido: "Tu pedido llegó a la cocina",
  preparacion: "Lo estamos haciendo en el fogón",
  listo: "Ya casi te lo entregamos",
  en_camino: "El domiciliario va para tu casa",
  entregado: "¡Buen provecho!",
}

export function Seguimiento({ id, token }: { id: string; token: string }) {
  const [pedido, setPedido] = useState<Pedido | null | undefined>(undefined)
  // El primer render siempre es "Cargando", así que leer localStorage aquí no desajusta la hidratación.
  const [enviado, setEnviado] = useState(() => typeof window !== "undefined" && leerLocal<boolean>(`origen_wa_${id}`, false))

  useEffect(() => {
    let vivo = true
    const cargar = () =>
      rpc<Pedido | null>("tienda_ver_pedido", { p_id: id, p_token: token })
        .then((p) => vivo && setPedido(p))
        .catch(() => vivo && setPedido((x) => (x === undefined ? null : x)))
    cargar()
    const t = window.setInterval(cargar, 8000)
    return () => {
      vivo = false
      window.clearInterval(t)
    }
  }, [id, token])

  // Cuando el domicilio va en camino se pide el tiempo aproximado de llegada (Google Maps).
  const [minutos, setMinutos] = useState<number | null>(null)
  const enCamino = pedido?.estado === "en_camino"
  useEffect(() => {
    if (!enCamino) return
    let vivo = true
    const cargar = () =>
      fetch(`/api/eta?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { minutos: number | null }) => vivo && setMinutos(d.minutos))
        .catch(() => {})
    cargar()
    const t = window.setInterval(cargar, 60000)
    return () => {
      vivo = false
      window.clearInterval(t)
    }
  }, [enCamino, id, token])

  // Al pasar a "entregado" se avisa al cliente: vibra y el título de la pestaña cambia.
  const entregado = pedido?.estado === "entregado"
  useEffect(() => {
    if (!entregado) return
    try {
      navigator.vibrate?.([200, 100, 200])
    } catch {}
    const antes = document.title
    document.title = "Pedido entregado · Origen"
    return () => {
      document.title = antes
    }
  }, [entregado])

  if (pedido === undefined) return <Fondo><Cargando texto="Buscando tu pedido" /></Fondo>
  if (pedido === null)
    return (
      <Fondo>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <p className="font-display text-3xl">No encontramos este pedido</p>
          <p className="text-sm text-paper/80">Revisa que el enlace esté completo.</p>
          <Link href="/" className="border border-achiote px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-achiote/15">
            Hacer un pedido
          </Link>
        </div>
      </Fondo>
    )

  const pasos: EstadoPedido[] =
    pedido.tipo === "domicilio" ? ["recibido", "preparacion", "listo", "en_camino", "entregado"] : ["recibido", "preparacion", "listo", "entregado"]
  const actual = pedido.estado === "cancelado" ? -1 : Math.max(pasos.indexOf(pedido.estado), 0)
  const pendienteTransferencia = pedido.metodo_pago === "transferencia" && !pedido.pago_confirmado && pedido.estado !== "cancelado"

  return (
    <Fondo>
      {entregado && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-carbon px-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.15 }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-achiote text-carbon shadow-[0_0_50px_rgba(245,196,0,0.6)]"
          >
            <Check className="h-12 w-12" strokeWidth={3} />
          </motion.div>
          <p className="font-display text-5xl font-semibold text-tostado">¡Pedido entregado!</p>
          <p className="max-w-xs text-base text-paper">
            Tu pedido {numeroPedido(pedido.numero)} ya fue entregado. Gracias por elegir Origen, ¡buen provecho!
          </p>
          <Link href="/" className="mt-2 bg-achiote px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.15em] text-carbon hover:bg-tostado">
            Hacer otro pedido
          </Link>
        </motion.div>
      )}
      <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-10">
        {/* ---- confirmación ---- */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-achiote shadow-[0_0_40px_rgba(245,196,0,0.55)]"
          >
            <motion.svg viewBox="0 0 24 24" className="h-10 w-10 text-tostado" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.6, ease: EASE }} />
            </motion.svg>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7, ease: EASE }}>
            <Etiqueta className="mt-6">{pedido.estado === "cancelado" ? "Pedido cancelado" : "Pedido confirmado"}</Etiqueta>
            <p className="mt-1 font-sans text-6xl font-bold tracking-[-0.03em]">{numeroPedido(pedido.numero)}</p>
            <span className="mt-3 inline-block border border-achiote/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-tostado">
              {TIPO_LABEL[pedido.tipo]}
              {pedido.mesa_nombre ? ` · ${pedido.mesa_nombre}` : ""} · {formatCOP(pedido.total)}
            </span>
          </motion.div>
        </div>

        {enCamino && minutos !== null && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="mt-8 border border-achiote/60 bg-achiote/10 p-5 text-center">
            <Etiqueta className="mb-1">Tu pedido va en camino</Etiqueta>
            <p className="font-display text-4xl font-semibold text-tostado">Llega en aprox. {minutos} min</p>
            <p className="mt-1 text-xs text-paper/80">Estimado con el tráfico actual. Se actualiza solo.</p>
          </motion.div>
        )}

        {/* ---- enviar el pedido a Origen por WhatsApp ---- */}
        {pedido.estado !== "cancelado" && pedido.origen === "cliente" && pedido.whatsapp && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6, ease: EASE }}
            className={cn("mt-8 border p-5 text-center", enviado ? "border-paper/15" : "border-[#25D366]/60 bg-[#25D366]/[0.07]")}
          >
            {!enviado ? (
              <>
                <p className="font-display text-2xl">Último paso</p>
                <p className="mt-1 text-sm text-paper/85">Envíanos tu pedido por WhatsApp para confirmarlo y empezar a prepararlo.</p>
              </>
            ) : (
              <p className="flex items-center justify-center gap-2 text-sm text-paper/85">
                <Check className="h-4 w-4 text-[#25D366]" /> Pedido enviado por WhatsApp. Puedes reenviarlo si lo necesitas.
              </p>
            )}
            <motion.a
              href={waLink(pedido.whatsapp, mensajePedido(pedido))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                guardarLocal(`origen_wa_${pedido.id}`, true)
                setEnviado(true)
              }}
              animate={enviado ? {} : { scale: [1, 1.03, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className={cn("mt-4 flex items-center justify-center gap-3 py-4 font-mono text-sm font-bold uppercase tracking-[0.1em]", waBotonCls)}
            >
              <WhatsAppIcono className="h-7 w-7" /> {enviado ? "Reenviar por WhatsApp" : "Envía tu pedido por WhatsApp"}
            </motion.a>
          </motion.div>
        )}

        {/* ---- transferencia pendiente ---- */}
        {pendienteTransferencia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 border border-achiote/50 bg-achiote/10 p-5">
            <Etiqueta className="text-tostado">Datos para transferir</Etiqueta>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-paper/85">{pedido.transferencia}</p>
            <p className="mt-3 text-xs text-paper/80">Tu pedido entra a cocina apenas confirmemos el pago.</p>
            <a
              href={waLink(pedido.whatsapp ?? "", `Hola Origen, envío el comprobante de pago 🌽\n\n${resumenPedido(pedido)}`)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("mt-4 flex items-center justify-center gap-3 py-4 font-mono text-xs font-bold uppercase tracking-[0.12em]", waBotonCls)}
            >
              <WhatsAppIcono className="h-6 w-6" /> Enviar comprobante de pago
            </a>
          </motion.div>
        )}

        {/* ---- seguimiento ---- */}
        {pedido.estado !== "cancelado" && (
          <ol className="relative mt-10 border border-paper/12 p-6">
            {pasos.map((paso, i) => {
              const hecho = i < actual
              const enCurso = i === actual
              return (
                <motion.li
                  key={paso}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: EASE }}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  {i < pasos.length - 1 && (
                    <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-paper/15">
                      <motion.span
                        className="absolute inset-x-0 top-0 bg-achiote"
                        initial={{ height: 0 }}
                        animate={{ height: hecho ? "100%" : 0 }}
                        transition={{ duration: 0.6, ease: EASE }}
                      />
                    </span>
                  )}
                  <span
                    className={cn(
                      "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition-colors",
                      hecho && "border-achiote bg-achiote text-carbon",
                      enCurso && "border-achiote text-tostado shadow-[0_0_18px_rgba(245,196,0,0.6)]",
                      !hecho && !enCurso && "border-paper/20 text-paper/65"
                    )}
                  >
                    {enCurso && <span className="absolute inset-0 animate-ping rounded-full border border-achiote opacity-60" />}
                    {hecho ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <div>
                    <p className={cn("text-sm font-medium", hecho || enCurso ? "text-paper" : "text-paper/65")}>{ESTADO_LABEL[paso]}</p>
                    <p className="text-xs text-paper/75">{DESCRIPCION[paso]}</p>
                  </div>
                </motion.li>
              )
            })}
          </ol>
        )}

        {/* ---- detalle ---- */}
        <div className="mt-8 border-t border-paper/10 pt-5">
          <Etiqueta className="mb-3">Pedido {numeroPedido(pedido.numero)} · {new Date(pedido.creado).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</Etiqueta>
          <ul className="space-y-2 text-sm">
            {pedido.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-paper/85">
                  {it.cantidad}x {it.nombre}
                  {it.adiciones.length > 0 && <span className="block text-xs text-paper/75">+ {textoAdiciones(it.adiciones)}</span>}
                </span>
                <span className="font-mono text-paper">{formatCOP(it.total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-paper/10 pt-4 font-mono text-xs uppercase tracking-[0.08em]">
            {pedido.descuento > 0 && (
              <p className="flex justify-between text-paper/80">
                <span>Descuento {pedido.cupon}</span>
                <span>−{formatCOP(pedido.descuento)}</span>
              </p>
            )}
            {pedido.tipo === "domicilio" && (
              <p className="flex justify-between text-paper/80">
                <span>Domicilio {pedido.zona_nombre}</span>
                <span>{pedido.domicilio ? formatCOP(pedido.domicilio) : "Gratis"}</span>
              </p>
            )}
            <p className="flex items-baseline justify-between pt-1">
              <span className="text-paper/80">Total</span>
              <span className="font-display text-3xl normal-case text-achiote">{formatCOP(pedido.total)}</span>
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          <a
            href={waLink(pedido.whatsapp ?? "", `Hola Origen, quiero preguntar por mi pedido ${numeroPedido(pedido.numero)} 🌽`)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("flex items-center justify-center gap-3 py-4 font-mono text-xs font-bold uppercase tracking-[0.12em]", waBotonCls)}
          >
            <WhatsAppIcono className="h-6 w-6" /> Escríbenos por WhatsApp
          </a>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-paper/80 transition hover:text-paper"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Hacer otro pedido
          </Link>
        </div>
      </div>
    </Fondo>
  )
}

function Fondo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-carbon font-sans text-paper">
      <header className="border-b border-paper/10">
        <div className="mx-auto flex h-16 max-w-lg items-center px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/img/logo-origen-2026.png" alt="Origen" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
            <span className="font-display text-lg font-semibold uppercase tracking-tight">Origen</span>
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}

/** Mensaje completo para Origen: productos, total, datos de entrega, pago, GPS y link de seguimiento. */
function mensajePedido(p: Pedido) {
  const entrega = [
    `👤 ${p.cliente_nombre}${p.cliente_celular ? ` · ${p.cliente_celular}` : ""}`,
    p.tipo === "domicilio" ? `🛵 Domicilio a ${p.zona_nombre}: ${p.direccion}` : p.tipo === "recoger" ? "🛍️ Para recoger" : `🪑 ${p.mesa_nombre}`,
    p.nota_domiciliario ? `📝 ${p.nota_domiciliario}` : "",
    p.lat !== null && p.lng !== null ? `📍 Ubicación: https://www.google.com/maps?q=${p.lat},${p.lng}` : "",
    p.metodo_pago ? `💳 Pago: ${p.metodo_pago === "efectivo" ? "Efectivo" : "Transferencia"}` : "",
  ].filter(Boolean)
  const seguimiento = typeof window !== "undefined" ? `Seguimiento: ${window.location.href}` : ""
  return [`Hola Origen 🌽, acabo de hacer este pedido:`, resumenPedido(p), entrega.join("\n"), seguimiento].filter(Boolean).join("\n\n")
}
