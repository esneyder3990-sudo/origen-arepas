"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { Check, Gift, MessageCircle } from "lucide-react"

import { Boton, Tarjeta, Toast, useAdmin, useToast } from "@/components/tienda/admin"
import { Cargando, EASE, Etiqueta, inputCls } from "@/components/tienda/ui"
import { type Ajustes, formatCOP, waLink } from "@/lib/tienda"
import { cn } from "@/lib/utils"
import { Interruptor, useAjustes } from "./horario"

interface Cliente { clave: string; celular: string; nombre: string; direccion: string; pedidos: number; total: number; ultimo: string | null }

export function SeccionFidelizacion() {
  const { llamar } = useAdmin()
  const { ajustes, guardar } = useAjustes()
  const [clientes, setClientes] = useState<Cliente[] | null>(null)

  useEffect(() => {
    llamar<Cliente[]>("tienda_admin_clientes").then(setClientes).catch(() => {})
  }, [llamar])

  if (!ajustes || !clientes) return <Cargando />
  return <Programa inicial={ajustes.fidelizacion ?? { activo: true, cada_n: 10, recompensa: "" }} clientes={clientes} guardar={guardar} />
}

function Programa({
  inicial,
  clientes,
  guardar,
}: {
  inicial: Ajustes["fidelizacion"]
  clientes: Cliente[]
  guardar: (c: Partial<Ajustes>) => Promise<void>
}) {
  const [f, setF] = useState(inicial)
  const { texto, mostrar } = useToast()
  const n = Math.max(f.cada_n, 1)

  return (
    <div className="space-y-6">
      <Tarjeta className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Programa de puntos</p>
            <p className="text-xs text-paper/75">Cada pedido cuenta, identificado por número de celular.</p>
          </div>
          <Interruptor label="Activar fidelización" on={f.activo} onClick={() => setF((x) => ({ ...x, activo: !x.activo }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <label>
            <Etiqueta className="mb-2">Cada N pedidos</Etiqueta>
            <input type="number" min={1} className={inputCls} value={f.cada_n} onChange={(e) => setF((x) => ({ ...x, cada_n: Number(e.target.value) || 1 }))} />
          </label>
          <label>
            <Etiqueta className="mb-2">Recompensa</Etiqueta>
            <input className={inputCls} value={f.recompensa} onChange={(e) => setF((x) => ({ ...x, recompensa: e.target.value }))} />
          </label>
        </div>
        <Boton onClick={async () => { await guardar({ fidelizacion: f }); mostrar("Fidelización guardada") }}>
          <Check className="h-4 w-4" /> Guardar
        </Boton>
      </Tarjeta>

      <Tarjeta>
        <p className="border-b border-paper/10 px-4 py-3 font-display text-xl">Clientes ({clientes.length})</p>
        <div className="divide-y divide-paper/8">
          {clientes.map((c, i) => {
            const progreso = c.pedidos % n
            const premio = f.activo && c.pedidos > 0 && progreso === 0
            const cel = c.celular.length === 10 ? `57${c.celular}` : c.celular
            return (
              <motion.div key={c.clave} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3), ease: EASE }} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.nombre || "Sin nombre"}</p>
                  <p className="font-mono text-xs text-paper/75">{[c.celular || c.direccion, c.pedidos ? formatCOP(c.total) : "sin pedidos aún", c.ultimo ? `último ${new Date(c.ultimo).toLocaleDateString("es-CO")}` : ""].filter(Boolean).join(" · ")}</p>
                </div>
                {f.activo && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5" aria-label={`${premio ? n : progreso} de ${n} pedidos`}>
                      {Array.from({ length: Math.min(n, 12) }).map((_, j) => (
                        <span key={j} className={cn("h-2.5 w-2.5", j < (premio ? n : progreso) ? "bg-achiote" : "bg-paper/12")} />
                      ))}
                    </div>
                    <span className="font-mono text-xs text-paper/80">{c.pedidos} pedidos</span>
                  </div>
                )}
                {premio && c.celular && (
                  <a
                    href={waLink(cel, `¡Hola ${c.nombre}! 🌽 Ya completaste ${c.pedidos} pedidos en Origen. Tu próximo pedido trae: ${f.recompensa}. ¡Gracias por preferirnos!`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 border border-achiote bg-achiote/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-tostado"
                  >
                    <Gift className="h-3.5 w-3.5" /> Avisar premio <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                )}
              </motion.div>
            )
          })}
          {clientes.length === 0 && <p className="px-4 py-10 text-center text-sm text-paper/75">Aquí aparecerán tus clientes cuando empiecen a pedir.</p>}
        </div>
      </Tarjeta>
      <Toast texto={texto} />
    </div>
  )
}
