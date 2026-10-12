"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { X } from "lucide-react"

import { type Menu, type TipoPedido, avisarEquipo, formatCOP, rpc, textoAdiciones } from "@/lib/tienda"
import { SelectorCuenta, useAdmin } from "@/components/tienda/admin"
import { Contador, EASE, Etiqueta, Opcion, inputCls } from "@/components/tienda/ui"
import { cn } from "@/lib/utils"

interface Linea {
  key: string
  producto_id: number
  cantidad: number
  adiciones: number[]
}

const hoyISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
const ayerISO = () => {
  const d = new Date(`${hoyISO()}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

type Metodo = "efectivo" | "transferencia" | "rappi"

/** Toma de pedido rápida para el personal (mesero en mesa, caja en mostrador).
 *  Con `ventaPasada`, registra una venta de otro día: se elige fecha, tipo (recoger/domicilio),
 *  zona y cómo se pagó; queda entregada y pagada en su fecha, sin pasar por cocina. */
export function TomarPedido({
  menu,
  tipo: tipoInicial,
  mesaId,
  titulo,
  onEnviado,
  ventaPasada = false,
}: {
  menu: Menu
  tipo: Extract<TipoPedido, "mesa" | "recoger">
  mesaId?: number
  titulo: string
  onEnviado: (numero: number, fecha?: string) => void
  ventaPasada?: boolean
}) {
  const [tipo, setTipo] = useState<TipoPedido>(tipoInicial)
  const [fecha, setFecha] = useState(ayerISO)
  const [zonaId, setZonaId] = useState<number | null>(null)
  const [domicilio, setDomicilio] = useState("")
  const zona = menu.zonas.find((z) => z.id === zonaId) ?? null
  const { pin } = useAdmin()
  const [cat, setCat] = useState(menu.categorias[0]?.id)
  const [lineas, setLineas] = useState<Linea[]>([])
  const [abierta, setAbierta] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [celular, setCelular] = useState("")
  const [metodo, setMetodo] = useState<Metodo | null>(null)
  const [cuenta, setCuenta] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prod = useMemo(() => new Map(menu.productos.map((p) => [p.id, p])), [menu])
  const ad = useMemo(() => new Map(menu.adiciones.map((a) => [a.id, a])), [menu])
  // En Caja/Mesero la cantidad de cada adición es el TOTAL de la línea (4 arepas + 4 maduros = 4 maduros).
  const totalLinea = (l: Linea) => prod.get(l.producto_id)!.precio * l.cantidad + l.adiciones.reduce((s, id) => s + (ad.get(id)?.precio ?? 0), 0)
  const productos = lineas.reduce((s, l) => s + totalLinea(l), 0)
  const valorDomicilio = tipo === "domicilio" ? (domicilio !== "" ? Number(domicilio) : zona?.tarifa ?? 0) : 0
  const total = productos + valorDomicilio
  const listo =
    lineas.length > 0 && (metodo !== "transferencia" || !!cuenta) && (tipo !== "domicilio" || !!zona) && (!ventaPasada || (!!metodo && !!fecha))

  // Cada toque crea su propia línea: así cada producto lleva SUS adiciones y no
  // se mezclan con las de otro producto igual. Si quedan iguales, la cocina las
  // agrupa sola ("2× …"). Se abre el panel de adiciones de la línea nueva.
  const sumar = (id: number) => {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${id}`
    setLineas((ls) => [...ls, { key, producto_id: id, cantidad: 1, adiciones: [] }])
    setAbierta(prod.get(id)?.aplica_adiciones === "ninguna" ? null : key)
  }

  const enviar = async () => {
    setEnviando(true)
    setError(null)
    try {
      const r = await rpc<{ id: string; token: string; numero: number; fecha: string }>("tienda_crear_pedido", {
        p: {
          pin,
          tipo,
          mesa_id: mesaId,
          nombre,
          celular,
          metodo_pago: metodo,
          cuenta: metodo === "transferencia" ? cuenta : "",
          ...(ventaPasada ? { fecha } : {}),
          ...(tipo === "domicilio" ? { zona_id: zonaId, domicilio: String(valorDomicilio) } : {}),
          items: lineas.map(({ producto_id, cantidad, adiciones }) => ({ producto_id, cantidad, adiciones, adiciones_total: true })),
        },
      })
      if (!ventaPasada) avisarEquipo(r.id, r.token)
      setLineas([])
      setMetodo(null)
      setCuenta("")
      onEnviado(r.numero, r.fecha)
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
                      {l.adiciones.length > 0 && <span className="block text-xs text-paper/55">+ {textoAdiciones(l.adiciones.map((id) => ({ nombre: ad.get(id)?.nombre ?? "" })))}</span>}
                      {opciones.length > 0 && <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-tostado/80">{abierta === l.key ? "Cerrar adiciones" : "+ adiciones"}</span>}
                    </button>
                    <Contador compacto valor={l.cantidad} min={1} onCambiar={(v) => setLineas((ls) => ls.map((x) => (x.key === l.key ? { ...x, cantidad: v } : x)))} />
                    <span className="w-20 text-right font-mono text-xs">{formatCOP(totalLinea(l))}</span>
                    <button type="button" aria-label="Quitar" onClick={() => setLineas((ls) => ls.filter((x) => x.key !== l.key))} className="text-paper/40 hover:text-achiote">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {abierta === l.key && opciones.length > 0 && (
                    <>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-tostado">Adiciones para {l.cantidad}× {p.nombre}</p>
                    <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                      {opciones.map((a) => {
                        const n = l.adiciones.filter((y) => y === a.id).length
                        const poner = (v: number) =>
                          setLineas((ls) =>
                            ls.map((x) => (x.key === l.key ? { ...x, adiciones: [...x.adiciones.filter((y) => y !== a.id), ...Array(Math.max(v, 0)).fill(a.id)] } : x))
                          )
                        return (
                          <div
                            key={a.id}
                            className={cn("flex items-center justify-between gap-2 border px-2 py-1.5 transition", n ? "border-achiote bg-achiote/10" : "border-paper/15")}
                          >
                            <button type="button" onClick={() => poner(n + 1)} className="min-w-0 flex-1 text-left font-mono text-[11px]">
                              <span className={cn("block truncate", n ? "text-paper" : "text-paper/70")}>{a.nombre}</span>
                              <span className="text-tostado">+{formatCOP(a.precio)}</span>
                            </button>
                            <Contador compacto valor={n} max={50} onCambiar={poner} />
                          </div>
                        )
                      })}
                    </div>
                    <p className="mt-1 text-[10px] text-paper/45">Pon el total de la línea. Ej.: si las {l.cantidad} llevan maduro, marca {l.cantidad} maduros.</p>
                    </>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
          {lineas.length === 0 && <p className="px-4 py-6 text-center text-sm text-paper/45">Toca productos para agregarlos.</p>}
        </div>
        <div className="space-y-3 border-t border-paper/10 p-4">
          {(ventaPasada || tipoInicial === "recoger") && (
            <div className="space-y-3 border border-achiote/40 bg-achiote/[0.06] p-3">
              {ventaPasada && (
                <label className="block">
                  <Etiqueta className="mb-2 text-tostado">Fecha de la venta</Etiqueta>
                  <input type="date" max={hoyISO()} className={inputCls} value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </label>
              )}
              <div>
                <Etiqueta className="mb-2">¿Cómo se entregó?</Etiqueta>
                <div className="grid grid-cols-2 gap-2">
                  <Opcion grupo="pasada-tipo" activa={tipo === "recoger"} onClick={() => setTipo("recoger")}>Recogió / mostrador</Opcion>
                  <Opcion grupo="pasada-tipo" activa={tipo === "domicilio"} onClick={() => setTipo("domicilio")}>Domicilio</Opcion>
                </div>
              </div>
              {tipo === "domicilio" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {menu.zonas.map((z) => (
                      <Opcion
                        key={z.id}
                        grupo="pasada-zona"
                        activa={zonaId === z.id}
                        onClick={() => {
                          setZonaId(z.id)
                          setDomicilio("")
                        }}
                      >
                        <span className="block font-bold">{z.nombre}</span>
                        <span className="block text-tostado">{formatCOP(z.tarifa)}</span>
                      </Opcion>
                    ))}
                  </div>
                  {zona && (
                    <label className="flex items-center justify-between gap-3 text-xs text-paper/60">
                      Domicilio cobrado (si fue distinto)
                      <input className={cn(inputCls, "w-32 py-2")} inputMode="numeric" placeholder={String(zona.tarifa)} value={domicilio} onChange={(e) => setDomicilio(e.target.value.replace(/\D/g, ""))} />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input className={inputCls} placeholder="Celular (opcional)" inputMode="tel" value={celular} onChange={(e) => setCelular(e.target.value)} />
          </div>
          <div>
            <Etiqueta className="mb-2">{ventaPasada ? "¿Cómo se pagó?" : "Método de pago"} {tipo === "mesa" && "(opcional)"}</Etiqueta>
            <div className={cn("grid gap-2", ventaPasada ? "grid-cols-3" : "grid-cols-2")}>
              <Opcion grupo={`metodo-${tipoInicial}`} activa={metodo === "efectivo"} onClick={() => setMetodo(metodo === "efectivo" ? null : "efectivo")}>Efectivo</Opcion>
              <Opcion grupo={`metodo-${tipoInicial}`} activa={metodo === "transferencia"} onClick={() => setMetodo(metodo === "transferencia" ? null : "transferencia")}>Transferencia</Opcion>
              {ventaPasada && (
                <Opcion grupo={`metodo-${tipoInicial}`} activa={metodo === "rappi"} onClick={() => setMetodo(metodo === "rappi" ? null : "rappi")}>Rappi</Opcion>
              )}
            </div>
            {metodo === "transferencia" && <SelectorCuenta grupo={`cuenta-${tipoInicial}`} valor={cuenta} onCambio={setCuenta} />}
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          {valorDomicilio > 0 && (
            <p className="flex justify-between font-mono text-xs text-paper/60">
              <span>Productos {formatCOP(productos)} + domicilio</span>
              <span>{formatCOP(valorDomicilio)}</span>
            </p>
          )}
          <div className="flex items-baseline justify-between">
            <Etiqueta>Total</Etiqueta>
            <span className="font-display text-3xl text-achiote">{formatCOP(total)}</span>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={!listo || enviando}
            onClick={enviar}
            className="w-full bg-achiote py-3.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-carbon transition hover:bg-tostado disabled:opacity-40"
          >
            {enviando ? "Guardando…" : ventaPasada ? "Guardar venta" : "Enviar a cocina"}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
