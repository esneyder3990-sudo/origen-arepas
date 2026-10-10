"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { X } from "lucide-react"

import { type Menu, type TipoPedido, formatCOP, rpc } from "@/lib/tienda"
import { useAdmin } from "@/components/tienda/admin"
import { Contador, EASE, Etiqueta, Opcion, inputCls } from "@/components/tienda/ui"
import { cn } from "@/lib/utils"

interface Linea {
  key: string
  producto_id: number
  cantidad: number
  adiciones: number[]
}

/** Toma de pedido rápida para el personal (mesero en mesa, caja en mostrador). */
export function TomarPedido({
  menu,
  tipo,
  mesaId,
  titulo,
  onEnviado,
}: {
  menu: Menu
  tipo: Extract<TipoPedido, "mesa" | "recoger">
  mesaId?: number
  titulo: string
  onEnviado: (numero: number) => void
}) {
  const { pin } = useAdmin()
  const [cat, setCat] = useState(menu.categorias[0]?.id)
  const [lineas, setLineas] = useState<Linea[]>([])
  const [abierta, setAbierta] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [celular, setCelular] = useState("")
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia" | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prod = useMemo(() => new Map(menu.productos.map((p) => [p.id, p])), [menu])
  const ad = useMemo(() => new Map(menu.adiciones.map((a) => [a.id, a])), [menu])
  const totalLinea = (l: Linea) => (prod.get(l.producto_id)!.precio + l.adiciones.reduce((s, id) => s + (ad.get(id)?.precio ?? 0), 0)) * l.cantidad
  const total = lineas.reduce((s, l) => s + totalLinea(l), 0)

  const sumar = (id: number) =>
    setLineas((ls) => {
      const sin = ls.find((l) => l.producto_id === id && l.adiciones.length === 0)
      if (sin) return ls.map((l) => (l === sin ? { ...l, cantidad: l.cantidad + 1 } : l))
      return [...ls, { key: `${Date.now()}-${id}`, producto_id: id, cantidad: 1, adiciones: [] }]
    })

  const enviar = async () => {
    setEnviando(true)
    setError(null)
    try {
      const r = await rpc<{ numero: number }>("tienda_crear_pedido", {
        p: {
          pin,
          tipo,
          mesa_id: mesaId,
          nombre,
          celular,
          metodo_pago: metodo,
          items: lineas.map(({ producto_id, cantidad, adiciones }) => ({ producto_id, cantidad, adiciones })),
        },
      })
      setLineas([])
      onEnviado(r.numero)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {menu.categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={cn("relative shrink-0 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em]", cat === c.id ? "text-carbon" : "border border-paper/15 text-paper/70")}
          >
            {cat === c.id && <motion.span layoutId="tomar-cat" className="absolute inset-0 bg-achiote" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative">{c.nombre}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {menu.productos
          .filter((p) => p.categoria_id === cat)
          .map((p) => {
            const n = lineas.filter((l) => l.producto_id === p.id).reduce((s, l) => s + l.cantidad, 0)
            return (
              <motion.button
                key={p.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => sumar(p.id)}
                className={cn("relative border p-3 text-left transition", n ? "border-achiote bg-achiote/10" : "border-paper/15 hover:border-paper/40")}
              >
                <p className="text-[13px] font-medium leading-snug">{p.nombre}</p>
                <p className="mt-1 font-mono text-xs text-tostado">{formatCOP(p.precio)}</p>
                <AnimatePresence>
                  {n > 0 && (
                    <motion.span
                      key={n}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center bg-achiote px-1 font-mono text-xs font-bold text-carbon"
                    >
                      {n}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
      </div>

      <div className="border border-paper/12">
        <p className="border-b border-paper/10 px-4 py-3 font-display text-xl">{titulo}</p>
        <div className="divide-y divide-paper/8">
          <AnimatePresence initial={false}>
            {lineas.map((l) => {
              const p = prod.get(l.producto_id)!
              const opciones = p.aplica_adiciones === "ninguna" ? [] : menu.adiciones.filter((a) => a.aplica === "todos" || a.aplica === p.aplica_adiciones)
              return (
                <motion.div key={l.key} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ ease: EASE }} className="overflow-hidden px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setAbierta(abierta === l.key ? null : l.key)} className="min-w-0 flex-1 text-left text-sm">
                      {p.nombre}
                      {l.adiciones.length > 0 && <span className="block text-xs text-paper/55">+ {l.adiciones.map((id) => ad.get(id)?.nombre).join(", ")}</span>}
                      {opciones.length > 0 && <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-tostado/80">{abierta === l.key ? "Cerrar adiciones" : "+ adiciones"}</span>}
                    </button>
                    <Contador compacto valor={l.cantidad} min={1} onCambiar={(v) => setLineas((ls) => ls.map((x) => (x.key === l.key ? { ...x, cantidad: v } : x)))} />
                    <span className="w-20 text-right font-mono text-xs">{formatCOP(totalLinea(l))}</span>
                    <button type="button" aria-label="Quitar" onClick={() => setLineas((ls) => ls.filter((x) => x.key !== l.key))} className="text-paper/40 hover:text-achiote">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {abierta === l.key && opciones.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {opciones.map((a) => {
                        const on = l.adiciones.includes(a.id)
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setLineas((ls) => ls.map((x) => (x.key === l.key ? { ...x, adiciones: on ? x.adiciones.filter((y) => y !== a.id) : [...x.adiciones, a.id] } : x)))}
                            className={cn("border px-2 py-1 font-mono text-[10px]", on ? "border-achiote bg-achiote/15" : "border-paper/15 text-paper/60")}
                          >
                            {a.nombre} +{formatCOP(a.precio)}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
          {lineas.length === 0 && <p className="px-4 py-6 text-center text-sm text-paper/45">Toca productos para agregarlos.</p>}
        </div>
        <div className="space-y-3 border-t border-paper/10 p-4">
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input className={inputCls} placeholder="Celular (opcional)" inputMode="tel" value={celular} onChange={(e) => setCelular(e.target.value)} />
          </div>
          <div>
            <Etiqueta className="mb-2">Método de pago {tipo === "mesa" && "(opcional)"}</Etiqueta>
            <div className="grid grid-cols-2 gap-2">
              <Opcion grupo={`metodo-${tipo}`} activa={metodo === "efectivo"} onClick={() => setMetodo(metodo === "efectivo" ? null : "efectivo")}>Efectivo</Opcion>
              <Opcion grupo={`metodo-${tipo}`} activa={metodo === "transferencia"} onClick={() => setMetodo(metodo === "transferencia" ? null : "transferencia")}>Transferencia</Opcion>
            </div>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex items-baseline justify-between">
            <Etiqueta>Total</Etiqueta>
            <span className="font-display text-3xl text-achiote">{formatCOP(total)}</span>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={lineas.length === 0 || enviando}
            onClick={enviar}
            className="w-full bg-achiote py-3.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-carbon transition hover:bg-tostado disabled:opacity-40"
          >
            {enviando ? "Enviando…" : "Enviar a cocina"}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
