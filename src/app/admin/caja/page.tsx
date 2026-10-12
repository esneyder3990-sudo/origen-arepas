"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Bike, CalendarDays, Check, ChevronLeft, ReceiptText, Wallet } from "lucide-react"

import { Boton, PanelBarra, Tarjeta, Toast, useAdmin, usePedidos, useToast, SelectorCuenta } from "@/components/tienda/admin"
import { MesasGrid, useMenu } from "@/components/tienda/mesas"
import { TomarPedido } from "@/components/tienda/tomar-pedido"
import { BotonCerrar, Cargando, EASE, Etiqueta, Hoja, Opcion } from "@/components/tienda/ui"
import { type Mesa, TIPO_LABEL, formatCOP, mesaOcupada, numeroPedido } from "@/lib/tienda"
import { DetallePedido, EstadoInsignia, Insignia } from "../_secciones/pedidos"

const hoyBogota = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })

export default function CajaPage() {
  const menu = useMenu()
  const { llamar } = useAdmin()
  const { pedidos, recargar, actualizar } = usePedidos(6000, 2)
  const [modo, setModo] = useState<"inicio" | "mostrador" | "pasada" | { mesa: Mesa }>("inicio")
  const [cobrar, setCobrar] = useState<Mesa | null>(null)
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia" | null>(null)
  const [cuentaMesa, setCuentaMesa] = useState("")
  const [domis, setDomis] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const { texto, mostrar } = useToast()

  if (!menu || !pedidos)
    return (
      <div className="min-h-svh bg-carbon text-paper">
        <PanelBarra rol="Caja" icono={Wallet} />
        <Cargando />
      </div>
    )

  const hoy = pedidos.filter((p) => p.fecha === hoyBogota())
  const entrantes = hoy.filter((p) => !p.cerrado && p.estado !== "cancelado" && (p.estado !== "entregado" || (p.metodo_pago === "transferencia" && !p.pago_confirmado)))
  const cuenta = cobrar ? mesaOcupada(pedidos, cobrar.id) : []
  const totalCuenta = cuenta.reduce((s, p) => s + p.total, 0)
  const domiciliosHoy = hoy.filter((p) => p.tipo === "domicilio" && p.estado !== "cancelado")
  const efectivoDomis = domiciliosHoy.filter((p) => p.metodo_pago === "efectivo").reduce((s, p) => s + p.total, 0)
  const tarifas = domiciliosHoy.reduce((s, p) => s + p.domicilio, 0)

  return (
    <div className="min-h-svh bg-carbon font-sans text-paper">
      <PanelBarra rol="Caja" icono={Wallet} />
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {modo === "inicio" ? (
            <motion.div key="inicio" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ease: EASE }} className="space-y-6">
              <div className="grid gap-2">
                <Boton className="py-3.5" onClick={() => setModo("mostrador")}>
                  <ReceiptText className="h-4 w-4" /> Nuevo pedido de mostrador
                </Boton>
                <Boton variante="borde" className="py-3.5" onClick={() => setModo("pasada")}>
                  <CalendarDays className="h-4 w-4" /> Registrar venta de otro día
                </Boton>
                <Boton variante="borde" className="py-3.5" onClick={() => setDomis(true)}>
                  <Bike className="h-4 w-4" /> Pagar domiciliario
                </Boton>
              </div>

              <section>
                <h2 className="mb-3 font-display text-2xl">Mesas</h2>
                <MesasGrid
                  mesas={menu.mesas}
                  pedidos={pedidos}
                  onElegir={(m, ocupada) => {
                    if (ocupada) {
                      setMetodo(null)
                      setCobrar(m)
                    } else setModo({ mesa: m })
                  }}
                />
              </section>

              <section>
                <h2 className="mb-3 font-display text-2xl">Pedidos entrantes</h2>
                <Tarjeta className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="font-mono text-[10px] uppercase tracking-[0.15em] text-paper/65">
                        {["#", "Tipo", "Pago", "Total", "Estado"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left font-normal">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entrantes.map((p) => (
                        <tr key={p.id} onClick={() => setSel(p.id)} className="cursor-pointer border-t border-paper/8 hover:bg-achiote/[0.06]">
                          <td className="px-4 py-3 font-mono font-bold">{numeroPedido(p.numero)}</td>
                          <td className="px-4 py-3">{p.tipo === "mesa" ? p.mesa_nombre : TIPO_LABEL[p.tipo]}</td>
                          <td className="px-4 py-3 capitalize">
                            {p.metodo_pago ?? "—"}
                            {p.metodo_pago === "transferencia" && !p.pago_confirmado && <Insignia className="ml-2">Sin confirmar</Insignia>}
                          </td>
                          <td className="px-4 py-3 font-mono text-tostado">{formatCOP(p.total)}</td>
                          <td className="px-4 py-3"><EstadoInsignia estado={p.estado} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {entrantes.length === 0 && <p className="px-4 py-8 text-center text-sm text-paper/65">Sin pedidos pendientes.</p>}
                </Tarjeta>
              </section>
            </motion.div>
          ) : (
            <motion.div key="tomar" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ ease: EASE }}>
              <button type="button" onClick={() => setModo("inicio")} className="mb-4 flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-paper/80 hover:text-paper">
                <ChevronLeft className="h-4 w-4" /> Volver
              </button>
              {modo === "pasada" && (
                <p className="mb-4 border border-achiote/40 bg-achiote/10 px-4 py-3 text-sm text-paper/75">
                  Para ventas que no alcanzaron a entrar al sistema (por ejemplo, pedidos por WhatsApp). Quedan guardadas en su fecha, ya entregadas y pagadas, y cuentan en Reportes y Finanzas de ese día.
                </p>
              )}
              <TomarPedido
                key={typeof modo === "string" ? modo : `mesa-${modo.mesa.id}`}
                menu={menu}
                tipo={modo === "mostrador" || modo === "pasada" ? "recoger" : "mesa"}
                mesaId={typeof modo === "object" ? modo.mesa.id : undefined}
                titulo={modo === "pasada" ? "Venta de otro día" : modo === "mostrador" ? "Pedido de mostrador" : modo.mesa.nombre}
                ventaPasada={modo === "pasada"}
                onEnviado={(n, fecha) => {
                  if (modo === "pasada") {
                    const dia = fecha ? new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "UTC" }) : ""
                    mostrar(`Venta ${numeroPedido(n)} guardada el ${dia}`)
                    recargar()
                    return // se queda en el formulario para registrar la siguiente
                  }
                  mostrar(`Pedido ${numeroPedido(n)} enviado a cocina`)
                  recargar()
                  setModo("inicio")
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- cobrar mesa ---- */}
      <Hoja abierta={!!cobrar} onCerrar={() => setCobrar(null)} titulo="Cobrar mesa">
        {cobrar && (
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-2xl"><Wallet className="h-5 w-5 text-tostado" /> Cobrar {cobrar.nombre}</h2>
              <BotonCerrar onClick={() => setCobrar(null)} />
            </div>
            <ul className="space-y-1 text-sm text-paper/75">
              {cuenta.map((p) => (
                <li key={p.id}>
                  <b className="font-mono text-paper">{numeroPedido(p.numero)}</b> · {p.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(", ")}
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between border-t border-paper/10 pt-3">
              <Etiqueta>Total</Etiqueta>
              <span className="font-display text-4xl text-achiote">{formatCOP(totalCuenta)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Opcion grupo="cobro" activa={metodo === "efectivo"} onClick={() => setMetodo("efectivo")}>Efectivo</Opcion>
              <Opcion grupo="cobro" activa={metodo === "transferencia"} onClick={() => setMetodo("transferencia")}>Transferencia</Opcion>
            </div>
            {metodo === "transferencia" && <SelectorCuenta grupo="cobro-cuenta" valor={cuentaMesa} onCambio={setCuentaMesa} />}
            <Boton
              variante="exito"
              className="w-full py-3.5"
              disabled={!metodo || (metodo === "transferencia" && !cuentaMesa)}
              onClick={async () => {
                await llamar("tienda_admin_cobrar_mesa", { p_mesa_id: cobrar.id, p_metodo: metodo, p_cuenta: metodo === "transferencia" ? cuentaMesa : "" })
                setCuentaMesa("")
                setCobrar(null)
                mostrar("Mesa cobrada y liberada")
                recargar()
              }}
            >
              <Check className="h-4 w-4" /> Confirmar pago y liberar mesa
            </Boton>
            <Boton variante="borde" className="w-full" onClick={() => setCobrar(null)}>Cancelar</Boton>
          </div>
        )}
      </Hoja>

      {/* ---- cuadre con el domiciliario ---- */}
      <Hoja abierta={domis} onCerrar={() => setDomis(false)} titulo="Pagar domiciliario">
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl"><Bike className="h-5 w-5 text-tostado" /> Cuadre de domicilios · hoy</h2>
            <BotonCerrar onClick={() => setDomis(false)} />
          </div>
          <ul className="max-h-60 space-y-1 overflow-y-auto font-mono text-xs">
            {domiciliosHoy.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-paper/8 py-1.5">
                <span>{numeroPedido(p.numero)} · {p.zona_nombre} · <span className="capitalize">{p.metodo_pago}</span></span>
                <span className="text-tostado">{formatCOP(p.domicilio)}</span>
              </li>
            ))}
            {domiciliosHoy.length === 0 && <li className="py-6 text-center text-paper/65">Sin domicilios hoy.</li>}
          </ul>
          <div className="space-y-2 border-t border-paper/10 pt-3 text-sm">
            <p className="flex justify-between"><span className="text-paper/80">Domicilios del día</span><b>{domiciliosHoy.length}</b></p>
            <p className="flex justify-between"><span className="text-paper/80">Efectivo que trae el domiciliario</span><b>{formatCOP(efectivoDomis)}</b></p>
            <p className="flex items-baseline justify-between"><span className="text-paper/80">Tarifas a pagarle</span><span className="font-display text-3xl text-achiote">{formatCOP(tarifas)}</span></p>
          </div>
        </div>
      </Hoja>

      <DetallePedido
        pedido={pedidos.find((p) => p.id === sel) ?? null}
        onCerrar={() => setSel(null)}
        onActualizar={async (c, msg) => {
          await actualizar(sel!, c)
          mostrar(msg)
        }}
      />
      <Toast texto={texto} />
    </div>
  )
}
