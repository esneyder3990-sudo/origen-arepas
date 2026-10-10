"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "motion/react"
import { Check, MessageCircle, RotateCcw } from "lucide-react"

import { type EstadoPedido, type Pedido, ESTADO_LABEL, TIPO_LABEL, formatCOP, numeroPedido, resumenPedido, rpc, waLink } from "@/lib/tienda"
import { Cargando, EASE, Etiqueta } from "@/components/tienda/ui"
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

  if (pedido === undefined) return <Fondo><Cargando texto="Buscando tu pedido" /></Fondo>
  if (pedido === null)
    return (
      <Fondo>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <p className="font-display text-3xl">No encontramos este pedido</p>
          <p className="text-sm text-paper/60">Revisa que el enlace esté completo.</p>
          <Link href="/pedir" className="border border-achiote px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-achiote/15">
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
      <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-10">
        {/* ---- confirmación ---- */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-achiote shadow-[0_0_40px_rgba(201,154,62,0.55)]"
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

        {/* ---- transferencia pendiente ---- */}
        {pendienteTransferencia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 border border-achiote/50 bg-achiote/10 p-5">
            <Etiqueta className="text-tostado">Datos para transferir</Etiqueta>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-paper/85">{pedido.transferencia}</p>
            <p className="mt-3 text-xs text-paper/60">Tu pedido entra a cocina apenas confirmemos el pago.</p>
            <a
              href={waLink(pedido.whatsapp ?? "", `Hola Origen, envío el comprobante de pago 🌽\n\n${resumenPedido(pedido)}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 bg-achiote py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-carbon transition hover:bg-tostado"
            >
              <MessageCircle className="h-4 w-4" /> Enviar comprobante de pago
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
                      enCurso && "border-achiote text-tostado shadow-[0_0_18px_rgba(201,154,62,0.6)]",
                      !hecho && !enCurso && "border-paper/20 text-paper/40"
                    )}
                  >
                    {enCurso && <span className="absolute inset-0 animate-ping rounded-full border border-achiote opacity-60" />}
                    {hecho ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <div>
                    <p className={cn("text-sm font-medium", hecho || enCurso ? "text-paper" : "text-paper/45")}>{ESTADO_LABEL[paso]}</p>
                    <p className="text-xs text-paper/50">{DESCRIPCION[paso]}</p>
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
                  {it.adiciones.length > 0 && <span className="block text-xs text-paper/50">+ {it.adiciones.map((a) => a.nombre).join(", ")}</span>}
                </span>
                <span className="font-mono text-paper">{formatCOP(it.total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-paper/10 pt-4 font-mono text-xs uppercase tracking-[0.08em]">
            {pedido.descuento > 0 && (
              <p className="flex justify-between text-paper/60">
                <span>Descuento {pedido.cupon}</span>
                <span>−{formatCOP(pedido.descuento)}</span>
              </p>
            )}
            {pedido.tipo === "domicilio" && (
              <p className="flex justify-between text-paper/60">
                <span>Domicilio {pedido.zona_nombre}</span>
                <span>{pedido.domicilio ? formatCOP(pedido.domicilio) : "Gratis"}</span>
              </p>
            )}
            <p className="flex items-baseline justify-between pt-1">
              <span className="text-paper/60">Total</span>
              <span className="font-display text-3xl normal-case text-achiote">{formatCOP(pedido.total)}</span>
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          <a
            href={waLink(pedido.whatsapp ?? "", `Hola Origen, quiero preguntar por mi pedido ${numeroPedido(pedido.numero)} 🌽`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border border-paper/25 py-3.5 font-mono text-[11px] uppercase tracking-[0.15em] transition hover:border-achiote"
          >
            <MessageCircle className="h-4 w-4" /> Escribirnos por WhatsApp
          </a>
          <Link
            href="/pedir"
            className="flex items-center justify-center gap-2 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-paper/60 transition hover:text-paper"
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
            <Image src="/img/logo-origen.png" alt="Origen" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
            <span className="font-display text-lg font-semibold uppercase tracking-tight">Origen</span>
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}
