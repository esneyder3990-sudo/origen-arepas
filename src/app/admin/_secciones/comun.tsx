"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "motion/react"
import { Check, Pencil, Plus, Trash2 } from "lucide-react"

import { Boton, Tarjeta, Toast, useAdmin, useToast } from "@/components/tienda/admin"
import { BotonCerrar, Cargando, EASE, Etiqueta, Hoja, inputCls } from "@/components/tienda/ui"
import { cn } from "@/lib/utils"

export type Tabla = "categorias" | "productos" | "adiciones" | "zonas" | "cupones" | "mesas" | "insumos" | "clientes" | "compras"
type Fila = { id?: number } & Record<string, unknown>

export function useTabla<T extends Fila>(tabla: Tabla) {
  const { llamar } = useAdmin()
  const [filas, setFilas] = useState<T[] | null>(null)
  const recargar = useCallback(() => llamar<T[]>("tienda_admin_leer", { p_tabla: tabla }).then(setFilas), [llamar, tabla])
  useEffect(() => {
    recargar().catch(() => {})
  }, [recargar])
  const guardar = async (fila: Partial<T>) => {
    await llamar("tienda_admin_guardar", { p_tabla: tabla, p_fila: fila })
    await recargar()
  }
  const borrar = async (id: number) => {
    await llamar("tienda_admin_borrar", { p_tabla: tabla, p_id: id })
    await recargar()
  }
  return { filas, recargar, guardar, borrar }
}

export type Campo =
  | { k: string; label: string; tipo: "texto" | "area" | "numero"; placeholder?: string }
  | { k: string; label: string; tipo: "select"; opciones: { valor: string | number; label: string }[] }
  | { k: string; label: string; tipo: "bool" }
  | { k: string; label: string; tipo: "imagen" }

export const IMAGENES = [
  "/img/Carne.png",
  "/img/Pollo.png",
  "/img/Chicharron.png",
  "/img/Hawaiana.png",
  "/img/Pepperoni.png",
  "/img/Huevo.png",
  "/img/patacon-carne.jpg",
  "/img/patacon-pollo.jpg",
  "/img/patacon-chicharron.jpg",
  "/img/arepa-pollo-champinon.jpg",
  "/img/arepa-ranchera.jpg",
  "/img/arepa-huevos-rancheros.jpg",
  "/img/patacon-pollo-champinon.jpg",
  "/img/patacon-ranchero.jpg",
  "/img/aborrajados.jpg",
  "/img/canasta-hogao.jpg",
  "/img/adiciones-maduro.jpg",
  "/img/arepas-preasadas.jpg",
  "/img/coca-cola.jpg",
  "/img/adiciones/maduro.jpg",
  "/img/adiciones/codorniz.jpg",
  "/img/adiciones/queso.jpg",
  "/img/adiciones/chicharron.jpg",
  "/img/adiciones/jamon.jpg",
  "/img/adiciones/pina.jpg",
  "/img/hero-poster.jpg",
  "/img/arepa-hero.png",
]

/** Hoja con formulario genérico para crear / editar una fila. */
export function Editor<T extends Fila>({
  fila,
  campos,
  titulo,
  onCerrar,
  onGuardar,
  onBorrar,
}: {
  fila: Partial<T> | null
  campos: Campo[]
  titulo: string
  onCerrar: () => void
  onGuardar: (f: Partial<T>) => Promise<void>
  onBorrar?: (id: number) => Promise<void>
}) {
  return (
    <Hoja abierta={!!fila} onCerrar={onCerrar} titulo={titulo}>
      {fila && <Formulario<T> fila={fila} campos={campos} titulo={titulo} onCerrar={onCerrar} onGuardar={onGuardar} onBorrar={onBorrar} />}
    </Hoja>
  )
}

// Se monta de cero cada vez que se abre el editor → arranca con los datos de la fila.
function Formulario<T extends Fila>({
  fila,
  campos,
  titulo,
  onCerrar,
  onGuardar,
  onBorrar,
}: {
  fila: Partial<T>
  campos: Campo[]
  titulo: string
  onCerrar: () => void
  onGuardar: (f: Partial<T>) => Promise<void>
  onBorrar?: (id: number) => Promise<void>
}) {
  const [f, setF] = useState<Partial<T>>(fila)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [seguro, setSeguro] = useState(false)

  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }))

  const guardar = async () => {
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(f)
      onCerrar()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="font-display text-2xl">{titulo}</h2>
        <BotonCerrar onClick={onCerrar} />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        {campos.map((c) => {
          const v = f[c.k as keyof T] as unknown
          if (c.tipo === "bool")
            return (
              <button key={c.k} type="button" onClick={() => set(c.k, !v)} className="flex w-full items-center justify-between border border-paper/12 px-4 py-3 text-sm" aria-pressed={!!v}>
                {c.label}
                <span className={cn("relative h-6 w-11 rounded-full transition", v ? "bg-achiote" : "bg-paper/15")}>
                  <motion.span layout className={cn("absolute top-1 h-4 w-4 rounded-full bg-paper", v ? "right-1" : "left-1")} transition={{ type: "spring", stiffness: 500, damping: 32 }} />
                </span>
              </button>
            )
          if (c.tipo === "imagen")
            return (
              <div key={c.k}>
                <Etiqueta className="mb-2">{c.label}</Etiqueta>
                <div className="grid grid-cols-6 gap-1.5">
                  {IMAGENES.map((src) => (
                    <button key={src} type="button" onClick={() => set(c.k, src)} className={cn("relative aspect-square overflow-hidden border-2", v === src ? "border-achiote" : "border-transparent opacity-70 hover:opacity-100")}>
                      <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
                <input className={cn(inputCls, "mt-2")} value={String(v ?? "")} onChange={(e) => set(c.k, e.target.value)} placeholder="/img/archivo.jpg o URL" />
              </div>
            )
          return (
            <label key={c.k} className="block">
              <Etiqueta className="mb-2">{c.label}</Etiqueta>
              {c.tipo === "area" ? (
                <textarea className={cn(inputCls, "resize-none")} rows={3} value={String(v ?? "")} onChange={(e) => set(c.k, e.target.value)} placeholder={c.placeholder} />
              ) : c.tipo === "select" ? (
                <select className={inputCls} value={String(v ?? "")} onChange={(e) => set(c.k, typeof c.opciones[0]?.valor === "number" ? Number(e.target.value) : e.target.value)}>
                  {c.opciones.map((o) => (
                    <option key={o.valor} value={o.valor} className="bg-carbon">{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputCls}
                  type={c.tipo === "numero" ? "number" : "text"}
                  inputMode={c.tipo === "numero" ? "decimal" : undefined}
                  value={v === undefined || v === null ? "" : String(v)}
                  onChange={(e) => set(c.k, c.tipo === "numero" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value)}
                  placeholder={c.placeholder}
                />
              )}
            </label>
          )
        })}
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
      <div className="flex gap-2 border-t border-paper/10 p-4">
        {onBorrar && fila?.id !== undefined && (
          seguro ? (
            <Boton variante="peligro" onClick={async () => { await onBorrar(fila.id!); onCerrar() }}>¿Seguro?</Boton>
          ) : (
            <Boton variante="peligro" onClick={() => setSeguro(true)}><Trash2 className="h-4 w-4" /></Boton>
          )
        )}
        <Boton className="flex-1" onClick={guardar} disabled={guardando}>
          <Check className="h-4 w-4" /> {guardando ? "Guardando…" : "Guardar"}
        </Boton>
      </div>
    </>
  )
}

/** Lista CRUD lista para usar: tarjetas con botón "Editar" + "Nuevo". */
export function ListaEditable<T extends Fila>({
  tabla,
  campos,
  nombre,
  nueva,
  render,
  filtrar,
  vacio,
}: {
  tabla: Tabla
  campos: Campo[]
  nombre: string
  nueva: Partial<T>
  render: (f: T) => React.ReactNode
  filtrar?: (f: T) => boolean
  vacio?: string
}) {
  const { filas, guardar, borrar } = useTabla<T>(tabla)
  const [editando, setEditando] = useState<Partial<T> | null>(null)
  const { texto, mostrar } = useToast()

  if (!filas) return <Cargando />
  const lista = filtrar ? filas.filter(filtrar) : filas

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Boton onClick={() => setEditando({ ...nueva })}><Plus className="h-4 w-4" /> Nuevo {nombre}</Boton>
      </div>
      <Tarjeta className="divide-y divide-paper/8">
        <AnimatePresence initial={false}>
          {lista.map((f, i) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.4, ease: EASE }}
              className={cn("flex items-center gap-3 px-4 py-3", f.activo === false && "opacity-45")}
            >
              <div className="min-w-0 flex-1">{render(f)}</div>
              <button type="button" onClick={() => setEditando(f)} className="flex shrink-0 items-center gap-1.5 border border-paper/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/80 transition hover:border-achiote">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {lista.length === 0 && <p className="px-4 py-10 text-center text-sm text-paper/50">{vacio ?? "Nada por aquí todavía."}</p>}
      </Tarjeta>
      <Editor<T>
        fila={editando}
        campos={campos}
        titulo={editando?.id ? `Editar ${nombre}` : `Nuevo ${nombre}`}
        onCerrar={() => setEditando(null)}
        onGuardar={async (f) => { await guardar(f); mostrar("Guardado") }}
        onBorrar={async (id) => { await borrar(id); mostrar("Eliminado") }}
      />
      <Toast texto={texto} />
    </>
  )
}

export function Pestanas<T extends string>({ valor, opciones, onCambiar }: { valor: T; opciones: { id: T; label: string }[]; onCambiar: (v: T) => void }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button key={o.id} type="button" onClick={() => onCambiar(o.id)} className={cn("relative px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition", valor === o.id ? "text-carbon" : "border border-paper/15 text-paper/70 hover:border-paper/40")}>
          {valor === o.id && <motion.span layoutId="pestana" className="absolute inset-0 bg-achiote" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
