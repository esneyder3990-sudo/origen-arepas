"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, Check, ChevronLeft, CupSoda, Info, LocateFixed, Phone, Search, ShoppingBag, Trash2 } from "lucide-react"

import {
  type Adicion,
  type Menu,
  type Producto,
  type TipoPedido,
  formatCOP,
  guardarLocal,
  leerLocal,
  rpc,
  waLink,
  avisarEquipo,
} from "@/lib/tienda"
import {
  Aviso,
  BotonCerrar,
  Cargando,
  CategoriaIcono,
  Contador,
  EASE,
  Etiqueta,
  Hoja,
  Opcion,
  WhatsAppIcono,
  inputCls,
  waBotonCls,
} from "@/components/tienda/ui"
import { Destino, Monto, VueloProvider, useVuelo } from "@/components/tienda/vuelo"
import { cn } from "@/lib/utils"

interface LineaCarrito {
  key: string
  producto_id: number
  cantidad: number
  adiciones: number[]
  nota: string
}

interface DatosCliente {
  nombre: string
  celular: string
  tipo: TipoPedido
  direccion: string
  zona_id: number | null
  nota_domiciliario: string
  mesa_id: number | null
  metodo_pago: "efectivo" | "transferencia" | null
  lat: number | null
  lng: number | null
}

const DATOS_VACIOS: DatosCliente = {
  nombre: "",
  celular: "",
  tipo: "domicilio",
  direccion: "",
  zona_id: null,
  nota_domiciliario: "",
  mesa_id: null,
  metodo_pago: null,
  lat: null,
  lng: null,
}

const CARRITO_KEY = "origen_carrito"
const DATOS_KEY = "origen_datos_cliente"
const MIS_PEDIDOS_KEY = "origen_mis_pedidos"

const adicionesPara = (p: Producto, adiciones: Adicion[]) =>
  p.aplica_adiciones === "ninguna" ? [] : adiciones.filter((a) => a.aplica === "todos" || a.aplica === p.aplica_adiciones)

export default function PedirPage() {
  return (
    <VueloProvider>
      <PedirContenido />
    </VueloProvider>
  )
}

function PedirContenido() {
  const router = useRouter()
  const [menu, setMenu] = useState<Menu | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  // Lectura perezosa de localStorage: el primer render (servidor y cliente)
  // siempre muestra "Cargando" hasta que llega el menú, así que no hay
  // desajuste de hidratación aunque el carrito ya venga lleno.
  const [carrito, setCarrito] = useState<LineaCarrito[]>(() =>
    typeof window === "undefined" ? [] : leerLocal<LineaCarrito[]>(CARRITO_KEY, [])
  )
  const [detalle, setDetalle] = useState<Producto | null>(null)
  const [vista, setVista] = useState<"menu" | "carrito" | "datos">("menu")
  const [aviso, setAviso] = useState<string | null>(null)
  const { lanzar } = useVuelo()

  const cargar = useCallback(() => {
    rpc<Menu>("tienda_menu")
      .then((m) => {
        setError(null)
        setMenu(m)
        setCategoriaId((c) => c ?? m.categorias[0]?.id ?? null)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    guardarLocal(CARRITO_KEY, carrito)
  }, [carrito])

  const avisar = useCallback((t: string) => {
    setAviso(t)
    window.setTimeout(() => setAviso((a) => (a === t ? null : a)), 1800)
  }, [])

  const productoPorId = useMemo(() => new Map(menu?.productos.map((p) => [p.id, p]) ?? []), [menu])
  const adicionPorId = useMemo(() => new Map(menu?.adiciones.map((a) => [a.id, a]) ?? []), [menu])

  // Si el menú cambió (producto desactivado), la línea se descarta en silencio
  // en vez de romper el total.
  const lineas = useMemo(
    () =>
      carrito
        .map((l) => {
          const p = productoPorId.get(l.producto_id)
          if (!p) return null
          const ads = l.adiciones.map((id) => adicionPorId.get(id)).filter((a): a is Adicion => !!a)
          const unit = p.precio + ads.reduce((s, a) => s + a.precio, 0)
          return { ...l, producto: p, ads, unit, total: unit * l.cantidad }
        })
        .filter((l): l is NonNullable<typeof l> => !!l),
    [carrito, productoPorId, adicionPorId]
  )
  const subtotal = lineas.reduce((s, l) => s + l.total, 0)
  const unidades = lineas.reduce((s, l) => s + l.cantidad, 0)

  const agregar = (linea: Omit<LineaCarrito, "key">, img: string, origen: Element | null, retraso = 0) => {
    setCarrito((prev) => {
      const igual = prev.find(
        (l) =>
          l.producto_id === linea.producto_id &&
          l.nota === linea.nota &&
          [...l.adiciones].sort().join() === [...linea.adiciones].sort().join()
      )
      if (igual) return prev.map((l) => (l === igual ? { ...l, cantidad: Math.min(l.cantidad + linea.cantidad, 50) } : l))
      return [...prev, { ...linea, key: `${Date.now()}-${linea.producto_id}` }]
    })
    lanzar({ desde: origen, destino: "barra", img, retraso })
  }

  const cambiarCantidad = (key: string, cantidad: number) =>
    setCarrito((prev) => (cantidad <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, cantidad } : l))))

  if (error && !menu) {
    return (
      <Marco>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
          <p className="font-display text-2xl">No pudimos cargar el menú</p>
          <p className="text-sm text-paper/60">{error}</p>
          <button type="button" onClick={cargar} className="border border-achiote px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-achiote/15">
            Reintentar
          </button>
        </div>
      </Marco>
    )
  }
  if (!menu) return <Marco><Cargando texto="Calentando el fogón" /></Marco>

  const categoria = menu.categorias.find((c) => c.id === categoriaId) ?? menu.categorias[0]
  const productos = menu.productos.filter((p) => p.categoria_id === categoria?.id)
  const bebidas = menu.categorias.find((c) => c.icono === "bebida")

  return (
    <Marco abierto={menu.abierto} ajustes={menu.ajustes} zonas={menu.zonas}>
      {/* ============ MENÚ: barra lateral de categorías + grilla ============ */}
      <div className="mx-auto flex w-full max-w-5xl flex-1">
        <nav aria-label="Categorías" className="sticky top-[89px] flex h-[calc(100svh-89px)] w-[84px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-paper/10 py-3 sm:w-28">
          {menu.categorias.map((c) => {
            const activa = c.id === categoria?.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoriaId(c.id)}
                className="relative flex flex-col items-center gap-1.5 px-1 py-3 text-center"
              >
                {activa && (
                  <motion.span
                    layoutId="categoria-activa"
                    className="absolute inset-y-0 left-0 w-[3px] bg-achiote shadow-[0_0_12px_rgba(201,154,62,0.8)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center border transition-colors duration-300",
                    activa ? "border-achiote bg-achiote text-carbon" : "border-paper/15 text-paper/60"
                  )}
                >
                  <CategoriaIcono icono={c.icono} className="h-5 w-5" />
                </span>
                <span className={cn("font-mono text-[9px] uppercase leading-tight tracking-[0.1em]", activa ? "text-tostado" : "text-paper/55")}>
                  {c.nombre}
                </span>
              </button>
            )
          })}
          <a
            href={waLink(menu.ajustes.whatsapp, "Hola Origen, tengo una pregunta sobre mi pedido 🌽")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escríbenos por WhatsApp"
            className="mt-auto flex flex-col items-center gap-1.5 px-1 pb-24 pt-3 text-center"
          >
            <motion.span
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className={cn("relative flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16", waBotonCls)}
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30 [animation-duration:2.4s]" />
              <WhatsAppIcono className="relative h-8 w-8 sm:h-9 sm:w-9" />
            </motion.span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#25D366]">WhatsApp</span>
          </a>
        </nav>

        <section className="min-w-0 flex-1 px-3 pb-32 pt-4 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={categoria?.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <h1 className="mb-4 font-display text-3xl font-semibold uppercase tracking-tight text-paper sm:text-4xl">
                {categoria?.nombre}
              </h1>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {productos.map((p, i) => (
                  <motion.button
                    key={p.id}
                    type="button"
                    onClick={() => setDetalle(p)}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative flex flex-col border border-paper/12 text-left transition hover:border-achiote/70"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <Image src={p.imagen} alt={p.nombre} fill sizes="(min-width: 1024px) 18rem, 45vw" className="object-cover transition duration-700 group-hover:scale-[1.06]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-carbon/70 via-transparent to-transparent" />
                      <div className="pointer-events-none absolute inset-0 border-2 border-achiote opacity-0 shadow-[0_0_30px_6px_rgba(201,154,62,0.45)] transition duration-500 group-hover:opacity-100" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-paper">{p.nombre}</p>
                      <p className="mt-auto font-mono text-sm text-tostado">{formatCOP(p.precio)}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              {productos.length === 0 && <p className="py-16 text-center text-sm text-paper/50">Pronto habrá productos aquí.</p>}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      {/* ============ barra flotante "Ver pedido" ============ */}
      <AnimatePresence>
        {unidades > 0 && vista === "menu" && (
          <motion.div
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6"
          >
            <button
              type="button"
              onClick={() => setVista("carrito")}
              className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 border border-achiote bg-carbon/95 px-4 py-3.5 shadow-[0_0_32px_rgba(201,154,62,0.35)] backdrop-blur-md"
            >
              <span className="flex items-center gap-3">
                <Destino nombre="barra" as="span">
                  <span className="flex h-8 w-8 items-center justify-center bg-achiote font-mono text-sm font-bold text-carbon">{unidades}</span>
                </Destino>
                <span className="font-mono text-[11px] uppercase tracking-[0.15em]">Ver pedido</span>
              </span>
              <Monto valor={subtotal} className="font-display text-2xl text-tostado" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ detalle del producto ============ */}
      <DetalleProducto
        producto={detalle}
        adiciones={detalle ? adicionesPara(detalle, menu.adiciones) : []}
        onCerrar={() => setDetalle(null)}
        onAgregar={(linea, origen) => {
          const p = detalle!
          agregar(linea, p.imagen, origen)
          setDetalle(null)
          avisar("Agregado al pedido")
        }}
      />


      {/* ============ carrito ============ */}
      <Carrito
        abierto={vista === "carrito"}
        lineas={lineas}
        subtotal={subtotal}
        hayBebidas={!!bebidas && !lineas.some((l) => l.producto.categoria_id === bebidas.id)}
        onVerBebidas={() => {
          if (bebidas) setCategoriaId(bebidas.id)
          setVista("menu")
        }}
        onCantidad={cambiarCantidad}
        onCerrar={() => setVista("menu")}
        onContinuar={() => setVista("datos")}
      />

      {/* ============ tus datos + pago ============ */}
      <TusDatos
        abierto={vista === "datos"}
        menu={menu}
        subtotal={subtotal}
        unidades={unidades}
        onVolver={() => setVista("carrito")}
        onConfirmar={async (datos, cupon) => {
          const res = await rpc<{ id: string; token: string; numero: number }>("tienda_crear_pedido", {
            p: {
              ...datos,
              cupon,
              items: lineas.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad, adiciones: l.adiciones, nota: l.nota })),
            },
          })
          avisarEquipo(res.id, res.token)
          const mios = leerLocal<{ id: string; token: string; numero: number; creado: string }[]>(MIS_PEDIDOS_KEY, [])
          guardarLocal(MIS_PEDIDOS_KEY, [{ ...res, creado: new Date().toISOString() }, ...mios].slice(0, 20))
          setCarrito([])
          router.push(`/pedido/${res.id}?t=${res.token}`)
        }}
      />

      <Aviso texto={aviso} />
    </Marco>
  )
}

/* ------------------------------------------------------------------ */

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const hora12 = (h: string) => {
  const [hh, mm] = h.split(":").map(Number)
  const ampm = hh >= 12 ? "p.m." : "a.m."
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${ampm}`
}

// Agrupa las zonas por tarifa: "Domicilio a Chía $5.000 · a Cajicá y Cota $10.000"
function textoDomicilios(zonas: Menu["zonas"]) {
  if (!zonas.length) return "Domicilio a Chía $5.000 · a Cajicá y Cota $10.000"
  const grupos = new Map<number, string[]>()
  for (const z of zonas) grupos.set(z.tarifa, [...(grupos.get(z.tarifa) ?? []), z.nombre])
  const partes = [...grupos].map(([tarifa, nombres]) => {
    const lugares = nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : nombres[0]
    return `a ${lugares} ${tarifa ? formatCOP(tarifa) : "gratis"}`
  })
  return `Domicilio ${partes.join(" · ")}`
}

function Marco({
  children,
  abierto = true,
  ajustes,
  zonas = [],
}: {
  children: React.ReactNode
  abierto?: boolean
  ajustes?: Menu["ajustes"]
  zonas?: Menu["zonas"]
}) {
  const [info, setInfo] = useState(false)
  const hoy = ajustes?.horario?.[new Date().getDay()]
  const frases = [
    textoDomicilios(zonas),
    "Sabores de Colombia",
    hoy ? (hoy.abierto ? `Hoy de ${hora12(hoy.abre)} a ${hora12(hoy.cierra)}` : "Hoy cerrado") : "",
    ajustes?.pedido_minimo_domicilio ? `Domicilio desde ${ajustes.pedido_minimo_domicilio} productos` : "",
    ajustes?.tiempo_entrega ? `Entrega en ${ajustes.tiempo_entrega}` : "",
  ].filter(Boolean)
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-carbon font-sans text-paper">
      <header className="sticky top-0 z-40 border-b border-paper/10 bg-carbon/85 backdrop-blur-md">
        <div className="mx-auto flex h-[88px] max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <motion.span
              initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: EASE }}
              className="block rounded-full shadow-[0_0_18px_rgba(201,154,62,0.35)]"
            >
              <Image src="/img/logo-origen-2026.png" alt="Origen" width={72} height={72} priority className="h-[72px] w-[72px] rounded-full object-cover" />
            </motion.span>
            <span className="hidden font-display text-2xl font-semibold uppercase tracking-tight sm:inline">Origen</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* Estado: grande y claro, con el tiempo de entrega completo debajo */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
              className={cn(
                "relative flex flex-col items-end border px-3 py-1.5 sm:px-4",
                abierto ? "border-achiote/60 bg-achiote/10 shadow-[0_0_20px_rgba(201,154,62,0.25)]" : "border-paper/15"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {abierto && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-achiote opacity-75" />}
                  <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", abierto ? "bg-achiote" : "bg-paper/30")} />
                </span>
                <span className={cn("font-mono text-sm font-bold uppercase tracking-[0.15em] sm:text-base", abierto ? "text-tostado" : "text-paper/55")}>
                  {abierto ? "Abierto" : "Cerrado"}
                </span>
              </span>
              {ajustes?.tiempo_entrega && (
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-paper/75 sm:text-[11px]">
                  {abierto ? `Entrega en ${ajustes.tiempo_entrega}` : hoy?.abierto ? `Abrimos ${hora12(hoy.abre)}` : "Hoy no atendemos"}
                </span>
              )}
            </motion.div>
            {ajustes && (
              <button
                type="button"
                onClick={() => setInfo(true)}
                aria-label="Información de Origen"
                className="flex h-11 w-11 items-center justify-center border border-paper/20 text-paper/80 transition hover:border-achiote hover:text-tostado sm:w-auto sm:gap-1.5 sm:px-3"
              >
                <Info className="h-4 w-4" />
                <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] sm:inline">Info</span>
              </button>
            )}
          </div>
        </div>
        {!abierto && ajustes && (
          <p className="border-t border-paper/10 bg-achiote/10 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-tostado">
            Ahora estamos cerrados{hoy?.abierto ? ` · hoy atendemos de ${hoy.abre} a ${hoy.cierra}` : ""} — puedes ver el menú
          </p>
        )}
      </header>
      {ajustes && (
        <div className="relative overflow-hidden border-b border-paper/10 bg-achiote/[0.07] py-2">
          <motion.div
            className="flex w-max gap-8 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-tostado"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            {[...frases, ...frases, ...frases, ...frases].map((t, i) => (
              <span key={i} className="flex items-center gap-8">
                {t} <span className="text-achiote/60">✦</span>
              </span>
            ))}
          </motion.div>
        </div>
      )}
      {children}
      {ajustes && <InfoOrigen abierta={info} onCerrar={() => setInfo(false)} ajustes={ajustes} zonas={zonas} />}
    </div>
  )
}

function InfoOrigen({ abierta, onCerrar, ajustes, zonas }: { abierta: boolean; onCerrar: () => void; ajustes: Menu["ajustes"]; zonas: Menu["zonas"] }) {
  const tel = ajustes.whatsapp.replace(/^57/, "")
  const hoyIdx = new Date().getDay()
  const orden = [1, 2, 3, 4, 5, 6, 0] // lunes primero
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Sobre Origen">
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <div className="flex items-center gap-3">
          <Image src="/img/logo-origen-2026.png" alt="" width={44} height={44} className="h-11 w-11 rounded-full" />
          <div>
            <h2 className="font-display text-2xl font-semibold leading-none">Origen</h2>
            <Etiqueta className="mt-1">Arepas y patacones artesanales</Etiqueta>
          </div>
        </div>
        <BotonCerrar onClick={onCerrar} />
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-6">
        <p className="text-sm leading-relaxed text-paper/75">
          Arepas de maíz peto cocido y molido a mano, tostadas en el fogón y rellenas al momento. Patacones crocantes con hogao casero. Sin harinas precocidas.
        </p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease: EASE }}>
          <Etiqueta className="mb-2 text-tostado">Domicilios</Etiqueta>
          <div className="grid grid-cols-3 gap-2">
            {zonas.map((z) => (
              <div key={z.id} className="border border-paper/12 px-2 py-3 text-center">
                <p className="text-sm font-medium">{z.nombre}</p>
                <p className="font-mono text-xs text-tostado">{z.tarifa ? formatCOP(z.tarifa) : "Gratis"}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-paper/55">
            Pedido mínimo para domicilio: {ajustes.pedido_minimo_domicilio} productos · Entrega en {ajustes.tiempo_entrega}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, ease: EASE }}>
          <Etiqueta className="mb-2 text-tostado">Horario</Etiqueta>
          <ul className="divide-y divide-paper/8 border-y border-paper/8 text-sm">
            {orden.map((i) => {
              const d = ajustes.horario?.[i]
              return (
                <li key={i} className={cn("flex justify-between py-2", i === hoyIdx && "text-tostado")}>
                  <span>
                    {DIAS[i]}
                    {i === hoyIdx ? " · hoy" : ""}
                  </span>
                  <span className="font-mono text-xs">{d?.abierto ? `${hora12(d.abre)} – ${hora12(d.cierra)}` : "Cerrado"}</span>
                </li>
              )
            })}
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, ease: EASE }} className="grid grid-cols-2 gap-2">
          <a href={waLink(ajustes.whatsapp, "Hola Origen 🌽")} target="_blank" rel="noopener noreferrer" className={cn("col-span-2 flex items-center justify-center gap-3 py-4 font-mono text-sm font-bold uppercase tracking-[0.12em]", waBotonCls)}>
            <WhatsAppIcono className="h-6 w-6" /> Escríbenos por WhatsApp
          </a>
          <a href={`tel:+57${tel}`} className="flex items-center justify-center gap-2 border border-paper/20 py-3 font-mono text-[11px] uppercase tracking-[0.12em] hover:border-achiote">
            <Phone className="h-4 w-4" /> Llamar
          </a>
          <a href="https://www.instagram.com/origen5752/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center border border-paper/20 py-3 font-mono text-[11px] uppercase tracking-[0.12em] hover:border-achiote">
            Instagram
          </a>
          <a href="https://www.facebook.com/Origen1948/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center border border-paper/20 py-3 font-mono text-[11px] uppercase tracking-[0.12em] hover:border-achiote">
            Facebook
          </a>
        </motion.div>
      </div>
    </Hoja>
  )
}

function DetalleProducto({
  producto,
  adiciones,
  onCerrar,
  onAgregar,
}: {
  producto: Producto | null
  adiciones: Adicion[]
  onCerrar: () => void
  onAgregar: (linea: Omit<LineaCarrito, "key">, origen: Element | null) => void
}) {
  return (
    <Hoja abierta={!!producto} onCerrar={onCerrar} titulo={producto?.nombre}>
      {producto && <DetalleContenido key={producto.id} producto={producto} adiciones={adiciones} onCerrar={onCerrar} onAgregar={onAgregar} />}
    </Hoja>
  )
}

// Se monta de cero cada vez que se abre la hoja → la selección arranca limpia.
function DetalleContenido({
  producto,
  adiciones,
  onCerrar,
  onAgregar,
}: {
  producto: Producto
  adiciones: Adicion[]
  onCerrar: () => void
  onAgregar: (linea: Omit<LineaCarrito, "key">, origen: Element | null) => void
}) {
  const { lanzar } = useVuelo()
  const [sel, setSel] = useState<number[]>([])
  const [nota, setNota] = useState("")
  const [cantidad, setCantidad] = useState(1)
  const imgRef = useRef<HTMLDivElement>(null)

  const unit = producto.precio + adiciones.filter((a) => sel.includes(a.id)).reduce((s, a) => s + a.precio, 0)

  return (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div ref={imgRef} className="relative aspect-[16/11] w-full overflow-hidden">
              <motion.div className="absolute inset-0" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 1.1, ease: EASE }}>
                <Image src={producto.imagen} alt={producto.nombre} fill sizes="(min-width: 640px) 32rem, 100vw" className="object-cover" />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#120E0B] via-transparent to-transparent" />
              <BotonCerrar onClick={onCerrar} className="absolute right-3 top-3" />
            </div>
            <div className="space-y-6 px-5 pb-6">
              <div>
                <h2 className="font-display text-3xl font-semibold leading-tight">{producto.nombre}</h2>
                {producto.descripcion && <p className="mt-2 text-sm leading-relaxed text-paper/70">{producto.descripcion}</p>}
                <p className="mt-3 font-display text-3xl text-achiote">{formatCOP(producto.precio)}</p>
              </div>

              {adiciones.length > 0 && (
                <div>
                  <Etiqueta className="mb-2 text-tostado">¿Adicionas algo más?</Etiqueta>
                  <div className="divide-y divide-paper/10 border-y border-paper/10">
                    {adiciones.map((a) => {
                      const on = sel.includes(a.id)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={(e) => {
                            if (!on)
                              lanzar(
                                a.imagen
                                  ? { desde: e.currentTarget.querySelector("[data-foto]"), destino: "boton-detalle", img: a.imagen }
                                  : { desde: e.currentTarget.querySelector("[data-check]"), destino: "boton-detalle", texto: `+${formatCOP(a.precio)}` }
                              )
                            setSel((s) => (on ? s.filter((x) => x !== a.id) : [...s, a.id]))
                          }}
                          className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
                          aria-pressed={on}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              data-foto
                              className={cn(
                                "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border transition-colors",
                                on ? "border-achiote shadow-[0_0_14px_rgba(201,154,62,0.5)]" : "border-paper/15"
                              )}
                            >
                              {a.imagen ? (
                                <Image src={a.imagen} alt="" fill sizes="40px" className="object-cover" />
                              ) : (
                                <span className="font-display text-lg text-tostado">{a.nombre.charAt(0)}</span>
                              )}
                            </span>
                            <span className="text-sm text-paper/85">
                              {a.nombre} <span className="font-mono text-xs text-tostado">· {formatCOP(a.precio)}</span>
                            </span>
                          </span>
                          <span data-check className={cn("flex h-5 w-5 items-center justify-center border transition", on ? "border-achiote bg-achiote text-carbon" : "border-paper/30")}>
                            {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <Etiqueta className="mb-2">Nota (opcional)</Etiqueta>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value.slice(0, 200))}
                  rows={2}
                  placeholder="Ej: sin cebolla"
                  className={cn(inputCls, "resize-none")}
                />
              </div>

              <div className="flex items-center justify-between">
                <Etiqueta>Cantidad</Etiqueta>
                <Contador valor={cantidad} onCambiar={setCantidad} min={1} />
              </div>
            </div>
          </div>
          <div className="border-t border-paper/10 p-4">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                onAgregar({ producto_id: producto.id, cantidad, adiciones: sel, nota: nota.trim() }, imgRef.current)
              }
              className="w-full bg-achiote py-4 font-mono text-xs font-bold uppercase tracking-[0.15em] text-carbon transition hover:bg-tostado"
            >
              Agregar — <Destino nombre="boton-detalle" as="span"><Monto valor={unit * cantidad} /></Destino>
            </motion.button>
          </div>
        </>
  )
}

function Carrito({
  abierto,
  lineas,
  subtotal,
  hayBebidas,
  onVerBebidas,
  onCantidad,
  onCerrar,
  onContinuar,
}: {
  abierto: boolean
  lineas: (LineaCarrito & { producto: Producto; ads: Adicion[]; total: number })[]
  subtotal: number
  hayBebidas: boolean
  onVerBebidas: () => void
  onCantidad: (key: string, v: number) => void
  onCerrar: () => void
  onContinuar: () => void
}) {
  return (
    <Hoja abierta={abierto} onCerrar={onCerrar} titulo="Tu pedido">
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="font-display text-3xl font-semibold">Tu pedido</h2>
        <BotonCerrar onClick={onCerrar} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        <AnimatePresence initial={false}>
          {lineas.map((l) => (
            <motion.div
              key={l.key}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0, x: 40 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden border-b border-paper/10"
            >
              <div className="flex gap-3 py-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-paper/15">
                  <Image src={l.producto.imagen} alt="" fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{l.producto.nombre}</p>
                    <button type="button" onClick={() => onCantidad(l.key, 0)} aria-label="Quitar" className="text-paper/40 transition hover:text-achiote">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {l.ads.length > 0 && <p className="mt-0.5 text-xs text-paper/55">+ {l.ads.map((a) => a.nombre).join(", ")}</p>}
                  {l.nota && <p className="mt-0.5 text-xs italic text-paper/55">“{l.nota}”</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <Contador compacto valor={l.cantidad} min={1} onCambiar={(v) => onCantidad(l.key, v)} />
                    <span className="font-mono text-sm text-tostado">{formatCOP(l.total)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {lineas.length === 0 && <p className="py-16 text-center text-sm text-paper/50">Tu pedido está vacío.</p>}

        {hayBebidas && lineas.length > 0 && (
          <div className="my-4 flex items-center justify-between gap-3 border border-achiote/40 bg-achiote/10 p-4">
            <span className="flex items-center gap-3 text-sm text-tostado">
              <CupSoda className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              ¿Le agregamos una bebida a tu pedido?
            </span>
            <button type="button" onClick={onVerBebidas} className="shrink-0 border border-achiote px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] hover:bg-achiote/20">
              Ver bebidas
            </button>
          </div>
        )}
      </div>
      <div className="border-t border-paper/10 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <Etiqueta>Subtotal</Etiqueta>
          <Monto valor={subtotal} className="font-display text-3xl text-achiote" />
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={lineas.length === 0}
          onClick={onContinuar}
          className="w-full bg-achiote py-4 font-mono text-xs font-bold uppercase tracking-[0.15em] text-carbon transition hover:bg-tostado disabled:opacity-40"
        >
          Continuar
        </motion.button>
      </div>
    </Hoja>
  )
}

function TusDatos({
  abierto,
  menu,
  subtotal,
  unidades,
  onVolver,
  onConfirmar,
}: {
  abierto: boolean
  menu: Menu
  subtotal: number
  unidades: number
  onVolver: () => void
  onConfirmar: (datos: DatosCliente, cupon: string) => Promise<void>
}) {
  // Solo se monta en el cliente después de cargar el menú, así que leer
  // localStorage aquí no causa desajuste de hidratación.
  const { lanzar } = useVuelo()
  const [d, setD] = useState<DatosCliente>(() => ({
    ...DATOS_VACIOS,
    ...(typeof window === "undefined" ? {} : leerLocal<Partial<DatosCliente>>(DATOS_KEY, {})),
    metodo_pago: null,
    mesa_id: null,
    lat: null,
    lng: null,
  }))
  const [buscarZona, setBuscarZona] = useState("")
  const [zonasAbiertas, setZonasAbiertas] = useState(false)
  const [cuponTxt, setCuponTxt] = useState("")
  const [cuponAplicado, setCuponAplicado] = useState<{ codigo: string; descuento: number; subtotal: number; msg: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El descuento solo vale para el subtotal con el que se validó: si volvió al
  // carrito y cambió algo, hay que aplicarlo de nuevo.
  const vigente = cuponAplicado?.subtotal === subtotal ? cuponAplicado : null
  const cupon = vigente && vigente.descuento > 0 ? vigente : null
  const cuponMsg = vigente?.msg ?? null

  const set = <K extends keyof DatosCliente>(k: K, v: DatosCliente[K]) => setD((x) => ({ ...x, [k]: v }))
  const zona = menu.zonas.find((z) => z.id === d.zona_id) ?? null
  const domicilio = d.tipo === "domicilio" ? zona?.tarifa ?? 0 : 0
  const descuento = cupon?.descuento ?? 0
  const total = Math.max(subtotal - descuento, 0) + domicilio
  const minimo = menu.ajustes.pedido_minimo_domicilio ?? 1
  const faltan = d.tipo === "domicilio" ? Math.max(minimo - unidades, 0) : 0
  const zonasFiltradas = menu.zonas.filter((z) => z.nombre.toLowerCase().includes(buscarZona.trim().toLowerCase()))

  const tipos: { id: TipoPedido; label: string }[] = [
    { id: "domicilio", label: "Domicilio" },
    { id: "recoger", label: "Para recoger" },
    ...(menu.ajustes.mesas_activas ? [{ id: "mesa" as const, label: "Mesa" }] : []),
  ]

  const aplicarCupon = async () => {
    if (!cuponTxt.trim()) return
    const r = await rpc<{ ok: boolean; codigo?: string; descuento?: number; mensaje: string }>("tienda_validar_cupon", {
      p_codigo: cuponTxt,
      p_subtotal: subtotal,
    }).catch((e: Error) => ({ ok: false, mensaje: e.message }))
    const ok = r.ok && "codigo" in r
    setCuponAplicado({ codigo: ok ? r.codigo! : "", descuento: ok ? r.descuento! : 0, subtotal, msg: r.mensaje })
  }

  const confirmar = async () => {
    setError(null)
    setEnviando(true)
    guardarLocal(DATOS_KEY, { nombre: d.nombre, celular: d.celular, tipo: d.tipo, direccion: d.direccion, zona_id: d.zona_id, nota_domiciliario: d.nota_domiciliario })
    try {
      await onConfirmar(d, cupon?.codigo ?? "")
    } catch (e) {
      setError((e as Error).message)
      setEnviando(false)
    }
  }

  const completo =
    d.nombre.trim().length >= 2 &&
    d.celular.replace(/\D/g, "").length >= 7 &&
    (d.tipo !== "domicilio" || (d.direccion.trim().length >= 4 && !!zona && faltan === 0)) &&
    (d.tipo !== "mesa" || !!d.mesa_id) &&
    (d.tipo === "mesa" || !!d.metodo_pago)

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.45, ease: EASE }}
          className="fixed inset-0 z-[75] flex flex-col bg-carbon text-paper"
        >
          <header className="border-b border-paper/10">
            <div className="mx-auto flex h-16 max-w-lg items-center gap-3 px-4">
              <button type="button" onClick={onVolver} aria-label="Volver" className="flex h-9 w-9 items-center justify-center border border-paper/20 hover:border-achiote">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="font-display text-2xl font-semibold">Tus datos</h2>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
              <label className="block">
                <Etiqueta className="mb-2">Nombre</Etiqueta>
                <input className={inputCls} value={d.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Tu nombre" autoComplete="name" />
              </label>
              <label className="block">
                <Etiqueta className="mb-2">Celular</Etiqueta>
                <input
                  className={inputCls}
                  value={d.celular}
                  onChange={(e) => set("celular", e.target.value.replace(/[^\d +]/g, ""))}
                  placeholder="300 000 0000"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </label>

              <div>
                <Etiqueta className="mb-2 text-tostado">¿Cómo vas a recibir tu pedido?</Etiqueta>
                <div className={cn("grid gap-2", tipos.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                  {tipos.map((t) => (
                    <Opcion key={t.id} grupo="tipo" activa={d.tipo === t.id} onClick={() => set("tipo", t.id)}>
                      {t.label}
                    </Opcion>
                  ))}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {d.tipo === "domicilio" && (
                  <motion.div
                    key="dom"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="space-y-5 overflow-hidden"
                  >
                    <UbicacionActual lat={d.lat} lng={d.lng} onUbicacion={(lat, lng) => setD((x) => ({ ...x, lat, lng }))} />
                    <label className="block">
                      <Etiqueta className="mb-2">Dirección</Etiqueta>
                      <input className={inputCls} value={d.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Calle, carrera, número" autoComplete="street-address" />
                    </label>
                    {menu.zonas.length <= 6 ? (
                      <div>
                        <Etiqueta className="mb-2">¿A dónde lo enviamos?</Etiqueta>
                        <div className={cn("grid gap-2", menu.zonas.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
                          {menu.zonas.map((z) => (
                            <Opcion
                              key={z.id}
                              grupo="zona"
                              activa={d.zona_id === z.id}
                              onClick={() => {
                                if (d.zona_id !== z.id && z.tarifa)
                                  lanzar({ desde: document.querySelector(`[data-zona="${z.id}"]`), destino: "total-datos", texto: `+${formatCOP(z.tarifa)}` })
                                set("zona_id", z.id)
                              }}
                            >
                              <span data-zona={z.id} className="block text-[12px] font-bold">{z.nombre}</span>
                              <span className="mt-0.5 block text-tostado">+ {z.tarifa ? formatCOP(z.tarifa) : "Gratis"}</span>
                            </Opcion>
                          ))}
                        </div>
                      </div>
                    ) : (
                    <div className="relative">
                      <Etiqueta className="mb-2">Barrio / zona</Etiqueta>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper/35" />
                        <input
                          className={cn(inputCls, "pl-10")}
                          value={zonasAbiertas ? buscarZona : zona ? `${zona.nombre} · ${zona.tarifa ? formatCOP(zona.tarifa) : "Gratis"}` : buscarZona}
                          onFocus={() => {
                            setZonasAbiertas(true)
                            setBuscarZona("")
                          }}
                          onBlur={() => window.setTimeout(() => setZonasAbiertas(false), 150)}
                          onChange={(e) => setBuscarZona(e.target.value)}
                          placeholder="Escribe tu barrio o municipio"
                        />
                      </div>
                      <AnimatePresence>
                        {zonasAbiertas && (
                          <motion.ul
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto border border-paper/15 bg-[#17120E] shadow-2xl"
                          >
                            {zonasFiltradas.map((z) => (
                              <li key={z.id}>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    set("zona_id", z.id)
                                    setZonasAbiertas(false)
                                  }}
                                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-achiote/10"
                                >
                                  {z.nombre}
                                  <span className="font-mono text-xs text-tostado">{z.tarifa ? formatCOP(z.tarifa) : "Gratis"}</span>
                                </button>
                              </li>
                            ))}
                            {zonasFiltradas.length === 0 && <li className="px-4 py-3 text-sm text-paper/50">No llegamos a esa zona todavía</li>}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                    )}
                    <label className="block">
                      <Etiqueta className="mb-2">Nota para el domiciliario (opcional)</Etiqueta>
                      <input className={inputCls} value={d.nota_domiciliario} onChange={(e) => set("nota_domiciliario", e.target.value)} placeholder="Ej: casa azul, portón negro" />
                    </label>
                    {faltan > 0 && (
                      <p className="border border-achiote/40 bg-achiote/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-tostado">
                        Pedido mínimo para domicilio: {minimo} productos — agrega {faltan} más
                      </p>
                    )}
                  </motion.div>
                )}
                {d.tipo === "mesa" && (
                  <motion.div key="mesa" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <Etiqueta className="mb-2">¿En qué mesa estás?</Etiqueta>
                    <div className="grid grid-cols-3 gap-2">
                      {menu.mesas.map((m) => (
                        <Opcion key={m.id} grupo="mesa" activa={d.mesa_id === m.id} onClick={() => set("mesa_id", m.id)}>
                          {m.nombre}
                        </Opcion>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {d.tipo !== "mesa" && (
                <div>
                  <Etiqueta className="mb-2 text-tostado">Método de pago</Etiqueta>
                  <div className="grid grid-cols-2 gap-2">
                    <Opcion grupo="pago" activa={d.metodo_pago === "efectivo"} onClick={() => set("metodo_pago", "efectivo")}>
                      Efectivo
                    </Opcion>
                    <Opcion grupo="pago" activa={d.metodo_pago === "transferencia"} onClick={() => set("metodo_pago", "transferencia")}>
                      Transferencia
                    </Opcion>
                  </div>
                  <AnimatePresence>
                    {d.metodo_pago === "transferencia" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 whitespace-pre-line border border-paper/15 bg-paper/[0.04] p-4 text-sm leading-relaxed text-paper/85">
                          <Etiqueta className="mb-1 text-tostado">Datos para transferir</Etiqueta>
                          {menu.ajustes.transferencia}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div>
                <Etiqueta className="mb-2">Cupón</Etiqueta>
                <div className="flex gap-2">
                  <input className={inputCls} value={cuponTxt} onChange={(e) => setCuponTxt(e.target.value.toUpperCase())} placeholder="Código de cupón" />
                  <button type="button" onClick={aplicarCupon} className="shrink-0 border border-paper/25 px-4 font-mono text-[10px] uppercase tracking-[0.12em] hover:border-achiote">
                    Aplicar
                  </button>
                </div>
                {cuponMsg && <p className={cn("mt-2 text-xs", cupon ? "text-tostado" : "text-paper/55")}>{cuponMsg}</p>}
              </div>

              <div className="space-y-2 border-t border-paper/10 pt-4 font-mono text-xs">
                <Fila k="Productos" v={formatCOP(subtotal)} />
                {descuento > 0 && <Fila k={`Descuento ${cupon?.codigo}`} v={`−${formatCOP(descuento)}`} />}
                {d.tipo === "domicilio" && <Fila k={zona ? `Domicilio ${zona.nombre}` : "Domicilio (elige zona)"} v={zona ? (domicilio ? formatCOP(domicilio) : "Gratis") : "—"} />}
              </div>
            </div>
          </div>

          <div className="border-t border-paper/10">
            <div className="mx-auto max-w-lg p-4">
              {error && <p className="mb-3 border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p>}
              <div className="mb-3 flex items-baseline justify-between">
                <Etiqueta>Total</Etiqueta>
                <Destino nombre="total-datos" as="span">
                  <Monto valor={total} className="font-display text-3xl text-achiote" />
                </Destino>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                disabled={!completo || enviando || !menu.abierto}
                onClick={confirmar}
                className="flex w-full items-center justify-center gap-2 bg-achiote py-4 font-mono text-xs font-bold uppercase tracking-[0.15em] text-carbon transition hover:bg-tostado disabled:opacity-40"
              >
                {enviando ? "Enviando…" : menu.abierto ? (
                  <>
                    <ShoppingBag className="h-4 w-4" /> Confirmar pedido
                  </>
                ) : (
                  "Estamos cerrados"
                )}
              </motion.button>
              <button type="button" onClick={onVolver} className="mt-3 flex w-full items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-paper/45 hover:text-paper">
                <ArrowLeft className="h-3 w-3" /> Volver a mi pedido
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between uppercase tracking-[0.08em]">
      <span className="text-paper/55">{k}</span>
      <span className="text-paper">{v}</span>
    </div>
  )
}

/** Pide la ubicación GPS del celular para que el domiciliario llegue directo.
 *  El navegador solo la permite en https (o localhost). */
function UbicacionActual({ lat, lng, onUbicacion }: { lat: number | null; lng: number | null; onUbicacion: (lat: number, lng: number) => void }) {
  const [estado, setEstado] = useState<"idle" | "buscando" | "error">("idle")
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [precision, setPrecision] = useState<number | null>(null)

  const pedir = () => {
    if (!("geolocation" in navigator)) {
      setEstado("error")
      setMensaje("Tu navegador no permite compartir la ubicación. Escribe la dirección abajo.")
      return
    }
    setEstado("buscando")
    setMensaje(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onUbicacion(pos.coords.latitude, pos.coords.longitude)
        setPrecision(Math.round(pos.coords.accuracy))
        setEstado("idle")
      },
      (err) => {
        setEstado("error")
        setMensaje(
          err.code === err.PERMISSION_DENIED
            ? "No diste permiso de ubicación. Actívalo en tu navegador o escribe la dirección."
            : "No pudimos obtener tu ubicación. Intenta de nuevo o escribe la dirección."
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const lista = lat !== null && lng !== null
  return (
    <div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={pedir}
        disabled={estado === "buscando"}
        className={cn(
          "relative flex w-full items-center justify-center gap-2 overflow-hidden border py-3.5 font-mono text-[11px] uppercase tracking-[0.12em] transition",
          lista ? "border-achiote bg-achiote/15 text-paper" : "border-achiote/60 text-tostado hover:bg-achiote/10"
        )}
      >
        {estado === "buscando" && (
          <motion.span
            className="absolute inset-0 bg-achiote/15"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {lista ? <Check className="relative h-4 w-4" /> : <LocateFixed className="relative h-4 w-4" />}
        <span className="relative">
          {estado === "buscando" ? "Buscando tu ubicación…" : lista ? "Ubicación guardada · actualizar" : "Usar mi ubicación actual"}
        </span>
      </motion.button>
      {lista && (
        <p className="mt-2 flex items-center justify-between gap-2 text-xs text-paper/60">
          <span>El domiciliario llegará con tu GPS{precision ? ` (±${precision} m)` : ""}.</span>
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-tostado underline">
            Ver en el mapa
          </a>
        </p>
      )}
      {mensaje && <p className="mt-2 text-xs text-paper/60">{mensaje}</p>}
    </div>
  )
}
