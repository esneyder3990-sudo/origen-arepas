"use client"

import { useState } from "react"
import { Check, Copy, CloudDownload } from "lucide-react"

import { Boton, CUENTAS_POR_DEFECTO, Tarjeta, Toast, olvidarCuentas, useAdmin, useToast } from "@/components/tienda/admin"
import { Cargando, Etiqueta, inputCls } from "@/components/tienda/ui"
import { type Ajustes, type Zona, formatCOP, guardarLocal, rpc } from "@/lib/tienda"
import { cn } from "@/lib/utils"
import { ListaEditable } from "./comun"
import { Interruptor, useAjustes } from "./horario"

export function SeccionAjustes() {
  const { ajustes, guardar } = useAjustes()
  if (!ajustes) return <Cargando />
  return <FormAjustes ajustes={ajustes} guardar={guardar} />
}

function FormAjustes({ ajustes, guardar }: { ajustes: Ajustes; guardar: (c: Partial<Ajustes>) => Promise<void> }) {
  const [f, setF] = useState<Partial<Ajustes>>(ajustes)
  const [cuentasTxt, setCuentasTxt] = useState((ajustes.cuentas ?? CUENTAS_POR_DEFECTO).join(", "))
  const [pin, setPin] = useState({ actual: "", nuevo: "" })
  const [pinMsg, setPinMsg] = useState<string | null>(null)
  const { texto, mostrar } = useToast()

  const enlace = typeof window !== "undefined" ? `${window.location.origin}` : "/"

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <Tarjeta className="space-y-4 p-4">
          <p className="font-display text-xl">General</p>
          <div>
            <Etiqueta className="mb-2">Enlace para pedir (compártelo en Instagram y WhatsApp)</Etiqueta>
            <div className="flex gap-2">
              <input readOnly className={inputCls} value={enlace} />
              <Boton variante="borde" onClick={() => { navigator.clipboard?.writeText(enlace); mostrar("Enlace copiado") }}>
                <Copy className="h-4 w-4" />
              </Boton>
            </div>
          </div>
          <label className="block">
            <Etiqueta className="mb-2">WhatsApp del negocio (con 57)</Etiqueta>
            <input className={inputCls} value={f.whatsapp ?? ""} onChange={(e) => setF((x) => ({ ...x, whatsapp: e.target.value.replace(/\D/g, "") }))} inputMode="tel" />
          </label>
          <label className="block">
            <Etiqueta className="mb-2">Datos para transferencia (los ve el cliente al pagar)</Etiqueta>
            <textarea rows={4} className={cn(inputCls, "resize-none")} value={f.transferencia ?? ""} onChange={(e) => setF((x) => ({ ...x, transferencia: e.target.value }))} placeholder={"Nequi: 300 000 0000\nBancolombia ahorros: 000-000000-00\nLlave Bre-B: …"} />
          </label>
          <label className="block">
            <Etiqueta className="mb-2">Cuentas donde recibes transferencias (separadas por coma)</Etiqueta>
            <input
              className={inputCls}
              value={cuentasTxt}
              onChange={(e) => setCuentasTxt(e.target.value)}
              placeholder="Nequi, Bre-B, DaviPlata"
            />
            <span className="mt-1 block text-xs text-paper/45">Aparecen al registrar o confirmar una transferencia, y Finanzas te dice cuánto debe haber en cada una.</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <Etiqueta className="mb-2">Mínimo de productos para domicilio</Etiqueta>
              <input type="number" min={1} className={inputCls} value={f.pedido_minimo_domicilio ?? 1} onChange={(e) => setF((x) => ({ ...x, pedido_minimo_domicilio: Number(e.target.value) || 1 }))} />
            </label>
            <label>
              <Etiqueta className="mb-2">Tiempo de entrega</Etiqueta>
              <input className={inputCls} value={f.tiempo_entrega ?? ""} onChange={(e) => setF((x) => ({ ...x, tiempo_entrega: e.target.value }))} />
            </label>
          </div>
          <div className="flex items-center justify-between gap-4 border border-paper/12 px-4 py-3">
            <div>
              <p className="text-sm">Clientes pueden pedir a la mesa</p>
              <p className="text-xs text-paper/55">Muestra la opción “Mesa” en /pedir.</p>
            </div>
            <Interruptor label="Pedidos a la mesa" on={!!f.mesas_activas} onClick={() => setF((x) => ({ ...x, mesas_activas: !x.mesas_activas }))} />
          </div>
          <Boton
            onClick={async () => {
              const { whatsapp, transferencia, pedido_minimo_domicilio, tiempo_entrega, mesas_activas } = f
              const cuentas = [...new Set(cuentasTxt.split(",").map((c) => c.trim()).filter(Boolean))].slice(0, 8)
              await guardar({ whatsapp, transferencia, pedido_minimo_domicilio, tiempo_entrega, mesas_activas, cuentas: cuentas.length ? cuentas : CUENTAS_POR_DEFECTO })
              olvidarCuentas()
              mostrar("Ajustes guardados")
            }}
          >
            <Check className="h-4 w-4" /> Guardar
          </Boton>
        </Tarjeta>

        <ImportarPanel onListo={mostrar} />

        <Tarjeta className="space-y-3 p-4">
          <p className="font-display text-xl">Cambiar PIN</p>
          <input type="password" className={inputCls} placeholder="PIN actual" value={pin.actual} onChange={(e) => setPin((p) => ({ ...p, actual: e.target.value }))} autoComplete="current-password" />
          <input type="password" className={inputCls} placeholder="PIN nuevo (mín. 6)" value={pin.nuevo} onChange={(e) => setPin((p) => ({ ...p, nuevo: e.target.value }))} autoComplete="new-password" />
          {pinMsg && <p className="text-sm text-paper/70">{pinMsg}</p>}
          <Boton
            variante="borde"
            disabled={pin.nuevo.length < 6 || !pin.actual}
            onClick={async () => {
              try {
                await rpc("tienda_admin_cambiar_pin", { p_pin: pin.actual, p_nuevo: pin.nuevo })
                guardarLocal("origen_admin_pin", pin.nuevo)
                setPinMsg("PIN actualizado. Los demás dispositivos tendrán que volver a entrar.")
                setPin({ actual: "", nuevo: "" })
              } catch (e) {
                setPinMsg((e as Error).message)
              }
            }}
          >
            Actualizar PIN
          </Boton>
        </Tarjeta>
      </div>

      <div>
        <p className="mb-1 font-display text-xl">Zonas de domicilio por barrio</p>
        <p className="mb-4 text-sm text-paper/55">Si la tarifa es 0, el cliente ve “Gratis”.</p>
        <ListaEditable<Zona & Record<string, unknown>>
          tabla="zonas"
          nombre="zona"
          campos={[
            { k: "nombre", label: "Barrio / municipio", tipo: "texto" },
            { k: "tarifa", label: "Tarifa de domicilio (COP)", tipo: "numero" },
            { k: "orden", label: "Orden", tipo: "numero" },
            { k: "activo", label: "Activa", tipo: "bool" },
          ]}
          nueva={{ nombre: "", tarifa: 0, orden: 0, activo: true }}
          render={(z) => (
            <div className="flex items-center justify-between gap-3 pr-2">
              <p className="text-sm">{z.nombre}</p>
              <p className="font-mono text-xs text-tostado">{z.tarifa ? formatCOP(z.tarifa) : "Gratis"}</p>
            </div>
          )}
        />
      </div>
      <Toast texto={texto} />
    </div>
  )
}

/** Trae ventas, clientes, compras, insumos y costos del Panel de Costos (app de escritorio).
 *  Se puede repetir: lo ya importado no se duplica. */
function ImportarPanel({ onListo }: { onListo: (t: string) => void }) {
  const { llamar } = useAdmin()
  const [cargando, setCargando] = useState(false)
  const [res, setRes] = useState<Record<string, number> | null>(null)
  return (
    <Tarjeta className="space-y-3 p-4">
      <p className="font-display text-xl">Panel de Costos</p>
      <p className="text-sm text-paper/60">
        Trae las ventas, clientes, compras, insumos y costos que registras en la app de escritorio de Origen. Puedes repetirlo cuando quieras: no se duplica nada.
      </p>
      <Boton
        variante="borde"
        disabled={cargando}
        onClick={async () => {
          setCargando(true)
          try {
            const r = await llamar<Record<string, number>>("tienda_admin_importar_panel")
            setRes(r)
            onListo("Datos del Panel de Costos actualizados")
          } finally {
            setCargando(false)
          }
        }}
      >
        <CloudDownload className="h-4 w-4" /> {cargando ? "Trayendo datos…" : "Traer datos del Panel de Costos"}
      </Boton>
      {res && (
        <p className="font-mono text-xs text-paper/60">
          {res.pedidos_nuevos} ventas nuevas · {res.compras_nuevas} compras nuevas · {res.insumos} insumos · {res.clientes} clientes · {res.costos} costos actualizados
        </p>
      )}
    </Tarjeta>
  )
}
