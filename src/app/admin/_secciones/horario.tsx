"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "motion/react"
import { Check } from "lucide-react"

import { Boton, Tarjeta, Toast, useAdmin, useToast } from "@/components/tienda/admin"
import { Cargando, Etiqueta, inputCls } from "@/components/tienda/ui"
import { type Ajustes, type DiaHorario, type Menu, rpc } from "@/lib/tienda"
import { cn } from "@/lib/utils"

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

export function useAjustes() {
  const { llamar } = useAdmin()
  const [ajustes, setAjustes] = useState<Ajustes | null>(null)
  const [abierto, setAbierto] = useState(true)
  const recargar = useCallback(
    () =>
      rpc<Menu>("tienda_menu").then((m) => {
        setAjustes(m.ajustes)
        setAbierto(m.abierto)
      }),
    []
  )
  useEffect(() => {
    recargar().catch(() => {})
  }, [recargar])
  const guardar = async (cambios: Partial<Ajustes>) => {
    const nuevos = await llamar<Ajustes>("tienda_admin_guardar_ajustes", { p_datos: cambios })
    setAjustes(nuevos)
    await recargar()
  }
  return { ajustes, abierto, guardar }
}

export function Interruptor({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label} className={cn("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-achiote" : "bg-paper/15")}>
      <motion.span layout className={cn("absolute top-1 h-4 w-4 rounded-full bg-paper", on ? "right-1" : "left-1")} transition={{ type: "spring", stiffness: 500, damping: 32 }} />
    </button>
  )
}

export function SeccionHorario() {
  const { ajustes, abierto, guardar } = useAjustes()
  if (!ajustes) return <Cargando />
  return <FormHorario ajustes={ajustes} abierto={abierto} guardar={guardar} />
}

function FormHorario({ ajustes, abierto, guardar }: { ajustes: Ajustes; abierto: boolean; guardar: (c: Partial<Ajustes>) => Promise<void> }) {
  const [dias, setDias] = useState<DiaHorario[]>(() => ajustes.horario ?? DIAS.map(() => ({ abierto: true, abre: "08:00", cierra: "22:00" })))
  const [cerrado, setCerrado] = useState(!!ajustes.cerrado_manual)
  const { texto, mostrar } = useToast()

  const setDia = (i: number, c: Partial<DiaHorario>) => setDias((d) => d.map((x, j) => (j === i ? { ...x, ...c } : x)))

  return (
    <div className="max-w-2xl space-y-5">
      <Tarjeta className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-medium">Cerrar la tienda ahora</p>
          <p className="text-xs text-paper/75">
            Estado actual: <b className={abierto ? "text-tostado" : "text-paper/85"}>{abierto ? "abierta" : "cerrada"}</b> · úsalo si se acabó el maíz o hay un imprevisto.
          </p>
        </div>
        <Interruptor
          label="Cerrar la tienda"
          on={cerrado}
          onClick={async () => {
            setCerrado(!cerrado)
            await guardar({ cerrado_manual: !cerrado })
            mostrar(!cerrado ? "Tienda cerrada" : "Tienda abierta según horario")
          }}
        />
      </Tarjeta>

      <Tarjeta className="divide-y divide-paper/8">
        {dias.map((d, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Interruptor label={`Abrir ${DIAS[i]}`} on={d.abierto} onClick={() => setDia(i, { abierto: !d.abierto })} />
            <p className={cn("w-24 text-sm", !d.abierto && "text-paper/65")}>{DIAS[i]}</p>
            {d.abierto ? (
              <div className="flex items-center gap-2">
                <input type="time" className={cn(inputCls, "w-32 py-2")} value={d.abre} onChange={(e) => setDia(i, { abre: e.target.value })} />
                <Etiqueta>a</Etiqueta>
                <input type="time" className={cn(inputCls, "w-32 py-2")} value={d.cierra} onChange={(e) => setDia(i, { cierra: e.target.value })} />
              </div>
            ) : (
              <Etiqueta>Cerrado</Etiqueta>
            )}
          </div>
        ))}
      </Tarjeta>
      <Boton onClick={async () => { await guardar({ horario: dias }); mostrar("Horario guardado") }}>
        <Check className="h-4 w-4" /> Guardar horario
      </Boton>
      <Toast texto={texto} />
    </div>
  )
}
