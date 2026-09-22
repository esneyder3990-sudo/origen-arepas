"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react"

import { Button } from "@/components/ui/button"
import { BorderBeamButton } from "@/components/ui/border-beam-button"
import { DistortedGlass } from "@/components/ui/distorted-glass"

const WHATSAPP = "https://wa.me/573143195593"
const WHATSAPP_MSG = (text: string) => `${WHATSAPP}?text=${encodeURIComponent(text)}`
const RAPPI = "https://www.rappi.com.co/restaurantes/900494342-origen-arepas-y-patacones"

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

const proposal = [
  {
    title: "Arepas rellenas",
    note: "8 opciones · desde $8.000",
    description:
      "Maíz peto cocido y molido a mano, tostado en el fogón y relleno al momento.",
    image: "/img/Carne.png",
    position: "50% 42%",
    baseTransform: "scale(1)",
    hoverTransform: "scale(1.06)",
  },
  {
    title: "Patacones rellenos",
    note: "3 opciones · $18.000",
    description:
      "Plátano verde dorado y crocante, relleno generoso, queso y hogao casero.",
    image: "/img/patacon-carne.jpg",
    position: "62% 50%",
    baseTransform: "scale(1)",
    hoverTransform: "scale(1.06)",
  },
  {
    title: "Arepas preasadas x5",
    note: "Para llevar · $18.000",
    description:
      "Cinco arepas de maíz peto preasadas, naturales y sin sal. Listas para terminar en casa.",
    image: "/img/arepas-preasadas.jpg",
    // Esta foto tiene sellos arriba y abajo (badges promocionales) — el
    // zoom ayuda pero no los saca del todo, lo ideal sería reemplazarla.
    position: "50% 50%",
    baseTransform: "scale(1.7)",
    hoverTransform: "scale(1.78)",
  },
  {
    title: "Adiciones",
    note: "6 opciones · desde $2.000",
    description:
      "Plátano maduro, queso, chicharrón, jamón, piña — para armar tu combinación.",
    image: "/img/Hawaiana.png",
    position: "50% 42%",
    baseTransform: "scale(1)",
    hoverTransform: "scale(1.06)",
  },
]

interface MenuItem {
  name: string
  price: string
}

const menuGroups: { category: string; items: MenuItem[] }[] = [
  {
    category: "Arepas rellenas",
    items: [
      { name: "Carne desmechada", price: "$15.500" },
      { name: "Pollo desmechado", price: "$15.500" },
      { name: "Chicharrón", price: "$15.500" },
      { name: "Hawaiana", price: "$12.500" },
      { name: "Pepperoni", price: "$14.500" },
      { name: "Huevos revueltos", price: "$8.000" },
      { name: "Huevos pericos", price: "$8.500" },
      { name: "Huevos con tocineta", price: "$9.000" },
    ],
  },
  {
    category: "Patacones rellenos",
    items: [
      { name: "Carne desmechada", price: "$18.000" },
      { name: "Pollo desmechado", price: "$18.000" },
      { name: "Chicharrón", price: "$18.000" },
    ],
  },
  {
    category: "Adiciones",
    items: [
      { name: "Plátano maduro", price: "$4.000" },
      { name: "Huevos de codorniz", price: "$4.000" },
      { name: "Queso extra", price: "$2.000" },
      { name: "Chicharrón", price: "$5.000" },
      { name: "Jamón ahumado", price: "$4.000" },
      { name: "Piña", price: "$4.000" },
    ],
  },
  {
    category: "Para llevar",
    items: [
      { name: "Arepas preasadas x5", price: "$18.000" },
    ],
  },
  {
    category: "Bebidas",
    items: [
      { name: "Gaseosa Coca-Cola 400 ml", price: "$4.000" },
    ],
  },
]

const testimonials = [
  {
    quote: "Las arepas más auténticas que he probado en Chía. El maíz peto se siente, no es harina cualquiera.",
    name: "Daniela M.",
    city: "Chía",
  },
  {
    quote: "Llegaron calientitas en 30 minutos. El patacón con chicharrón es brutal, repito esta semana.",
    name: "Andrés R.",
    city: "Cajicá",
  },
  {
    quote: "Pedí para toda la familia y todos quedaron felices. La hawaiana es mi nueva obsesión.",
    name: "Camila T.",
    city: "Chía",
  },
  {
    quote: "Calidad de restaurante a domicilio. Empaque impecable y porciones generosas.",
    name: "Juan P.",
    city: "Cajicá",
  },
]

const navLinks = [
  { href: "#propuesta", label: "Propuesta" },
  { href: "#build", label: "Arma tu pedido" },
  { href: "#menu", label: "Menú" },
  { href: "#cobertura", label: "Cobertura" },
  { href: "#contacto", label: "Contacto" },
]

const sectionsList = [
  { id: "top", label: "Inicio" },
  { id: "propuesta", label: "Propuesta" },
  { id: "build", label: "Arma tu pedido" },
  { id: "menu", label: "Menú" },
  { id: "cobertura", label: "Cobertura" },
  { id: "clientes", label: "Clientes" },
  { id: "acompanamos", label: "Acompañamiento" },
  { id: "contacto", label: "Contacto" },
]

interface Filling {
  id: string
  label: string
  price: number
  image: string
}

const builderBases: { id: "arepa" | "patacon"; label: string; note: string; image: string }[] = [
  { id: "arepa", label: "Arepa rellena", note: "Maíz peto artesanal", image: "/img/Carne.png" },
  { id: "patacon", label: "Patacón relleno", note: "Plátano verde crocante", image: "/img/patacon-carne.jpg" },
]

const fillingsByBase: Record<"arepa" | "patacon", Filling[]> = {
  arepa: [
    { id: "carne", label: "Carne desmechada", price: 15500, image: "/img/Carne.png" },
    { id: "pollo", label: "Pollo desmechado", price: 15500, image: "/img/Pollo.png" },
    { id: "chicharron", label: "Chicharrón", price: 15500, image: "/img/Chicharron.png" },
    { id: "hawaiana", label: "Hawaiana", price: 12500, image: "/img/Hawaiana.png" },
    { id: "pepperoni", label: "Pepperoni", price: 14500, image: "/img/Pepperoni.png" },
    { id: "huevos", label: "Huevos revueltos", price: 8000, image: "/img/Huevo.png" },
    { id: "huevos-pericos", label: "Huevos pericos", price: 8500, image: "/img/Huevo.png" },
    { id: "huevos-tocineta", label: "Huevos con tocineta", price: 9000, image: "/img/Huevo.png" },
  ],
  patacon: [
    { id: "carne", label: "Carne desmechada", price: 18000, image: "/img/patacon-carne.jpg" },
    { id: "pollo", label: "Pollo desmechado", price: 18000, image: "/img/patacon-pollo.jpg" },
    { id: "chicharron", label: "Chicharrón", price: 18000, image: "/img/patacon-chicharron.jpg" },
  ],
}

const extrasList = [
  { id: "platano", label: "Plátano maduro", price: 4000 },
  { id: "codorniz", label: "Huevos de codorniz", price: 4000 },
  { id: "queso", label: "Queso extra", price: 2000 },
  { id: "carne-extra", label: "Carne adicional", price: 5000 },
  { id: "pollo-extra", label: "Pollo adicional", price: 5000 },
  { id: "chicharron-extra", label: "Chicharrón adicional", price: 5000 },
  { id: "jamon", label: "Jamón ahumado", price: 4000 },
  { id: "pina", label: "Piña", price: 4000 },
  { id: "coca-cola", label: "Gaseosa Coca-Cola 400 ml", price: 4000 },
]

const formatCOP = (n: number) => `$${n.toLocaleString("es-CO")}`

const featuredProducts: { label: string; base: "arepa" | "patacon"; fillingId: string }[] = [
  { label: "Arepa de carne desmechada", base: "arepa", fillingId: "carne" },
  { label: "Patacón con pollo desmechado", base: "patacon", fillingId: "pollo" },
  { label: "Arepa hawaiana", base: "arepa", fillingId: "hawaiana" },
]

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [soundOn, setSoundOn] = useState(false)
  const [heroInView, setHeroInView] = useState(true)
  const heroRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const toggleSound = () => {
    const v = videoRef.current
    if (!v) return
    const next = !soundOn
    v.muted = !next
    if (next) v.play().catch(() => {})
    setSoundOn(next)
  }

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroScale = useTransform(heroProgress, [0, 1], [1, 1.25])

  // Silencia el video en cuanto el hero termina de desplazarse fuera de
  // pantalla (progreso ≈ 1), para que la "música" del fogón no siga sonando
  // en el resto de las secciones. Vuelve a sonar si el usuario sube de nuevo,
  // siempre que el sonido ya estuviera activado.
  useMotionValueEvent(heroProgress, "change", (v) => setHeroInView(v < 0.995))
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = !soundOn || !heroInView
  }, [soundOn, heroInView])

  const { scrollYProgress: pageProgress } = useScroll()
  const progressWidth = useTransform(pageProgress, [0, 1], ["0%", "100%"])
  const scrubLeft = useTransform(pageProgress, [0, 1], ["0%", "100%"])

  // FRAME 0XX / 200 del scrubber inferior, ligado al scroll (estilo visor PRIME)
  const [frame, setFrame] = useState(0)
  useMotionValueEvent(pageProgress, "change", (v) => setFrame(Math.round(v * 200)))

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const observers = sectionsList.map((s, i) => {
      const el = document.getElementById(s.id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(i)
        },
        { rootMargin: "-45% 0px -45% 0px" }
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach((o) => o?.disconnect())
  }, [])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const ss = String(elapsed % 60).padStart(2, "0")

  const [base, setBase] = useState<"arepa" | "patacon">("arepa")
  const [fillingId, setFillingId] = useState(fillingsByBase.arepa[0].id)
  const [cart, setCart] = useState<
    { id: string; baseLabel: string; fillingLabel: string; fillingPrice: number; fillingImage: string; extraIds: string[] }[]
  >([])
  // A qué producto del pedido se le suman las adiciones que toques en el Paso 3
  // — sin esto, no había forma de saber a cuál arepa/patacón iba cada adición.
  const [activeCartItemId, setActiveCartItemId] = useState<string | null>(null)
  const [flyPrice, setFlyPrice] = useState<{
    id: number
    image: string
    startX: number
    startY: number
    endX: number
    endY: number
  } | null>(null)
  const flyIdRef = useRef(0)
  const totalRef = useRef<HTMLDivElement>(null)
  const mobileTotalRef = useRef<HTMLDivElement>(null)

  const fillings = fillingsByBase[base]
  const selectedFilling = fillings.find((f) => f.id === fillingId) ?? fillings[0]
  const baseLabel = base === "arepa" ? "Arepa rellena" : "Patacón relleno"

  const activeCartItem = cart.find((item) => item.id === activeCartItemId) ?? null
  const itemPrice = (item: (typeof cart)[number]) =>
    item.fillingPrice + item.extraIds.reduce((sum, id) => sum + (extrasList.find((e) => e.id === id)?.price ?? 0), 0)
  const itemExtras = (item: (typeof cart)[number]) => extrasList.filter((e) => item.extraIds.includes(e.id))

  const triggerFly = (image: string, el: HTMLElement) => {
    const startRect = el.getBoundingClientRect()
    const startX = startRect.left + startRect.width / 2
    const startY = startRect.top + startRect.height / 2
    // El total se desplaza hacia abajo cuando el pedido crece, así que medimos
    // su posición DESPUÉS de que React repinta (doble rAF) para que la imagen
    // siempre aterrice en el total y no en donde estaba antes.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // En móvil el total vive en una barra fija abajo (siempre visible); en
        // desktop, en la tarjeta lateral. Apuntamos al que corresponde.
        const isMobile = window.matchMedia("(max-width: 1023px)").matches
        const targetEl = isMobile && mobileTotalRef.current ? mobileTotalRef.current : totalRef.current
        const endRect = targetEl?.getBoundingClientRect()
        const endX = endRect ? endRect.left + endRect.width / 2 : startX
        const endY = endRect ? endRect.top + endRect.height / 2 : startY + 220
        flyIdRef.current += 1
        setFlyPrice({ id: flyIdRef.current, image, startX, startY, endX, endY })
        setTimeout(() => setFlyPrice(null), 1550)
      })
    })
  }

  // Las adiciones se suman siempre al producto activo (el último que tocaste,
  // o el que hayas seleccionado a mano en "Tu pedido") — así siempre se sabe
  // a qué arepa o patacón va cada adición, en vez de quedar sueltas.
  const handleExtraClick = (extra: { id: string; label: string; price: number }, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!activeCartItem) return
    const wasActive = activeCartItem.extraIds.includes(extra.id)
    setCart((prev) =>
      prev.map((item) =>
        item.id === activeCartItem.id
          ? {
              ...item,
              extraIds: wasActive ? item.extraIds.filter((id) => id !== extra.id) : [...item.extraIds, extra.id],
            }
          : item
      )
    )
    if (!wasActive) triggerFly(activeCartItem.fillingImage, e.currentTarget)
  }

  const removeExtraFromActiveItem = (extraId: string) => {
    if (!activeCartItem) return
    setCart((prev) =>
      prev.map((item) => (item.id === activeCartItem.id ? { ...item, extraIds: item.extraIds.filter((id) => id !== extraId) } : item))
    )
  }

  const grandTotal = cart.length ? cart.reduce((sum, item) => sum + itemPrice(item), 0) : selectedFilling.price

  const addFillingToBase = (b: "arepa" | "patacon", f: Filling, e: React.MouseEvent<HTMLButtonElement>) => {
    const newItem = {
      id: `${Date.now()}-${f.id}`,
      baseLabel: b === "arepa" ? "Arepa rellena" : "Patacón relleno",
      fillingLabel: f.label,
      fillingPrice: f.price,
      fillingImage: f.image,
      extraIds: [] as string[],
    }
    setCart((prev) => [...prev, newItem])
    setActiveCartItemId(newItem.id)
    setBase(b)
    setFillingId(f.id)
    triggerFly(f.image, e.currentTarget)
  }

  const addFilling = (f: Filling, e: React.MouseEvent<HTMLButtonElement>) => addFillingToBase(base, f, e)

  // Al reactivar un producto del pedido hay que sincronizar Paso 1/2 con él —
  // si no, la foto/nombre de arriba queda mostrando otro producto distinto
  // del que en verdad estás editando en "Adiciones de X", y las adiciones
  // parecen sueltas en vez de ir dentro de la arepa/patacón seleccionado.
  const selectCartItem = (item: (typeof cart)[number]) => {
    setActiveCartItemId(item.id)
    const itemBase: "arepa" | "patacon" = item.baseLabel === "Patacón relleno" ? "patacon" : "arepa"
    setBase(itemBase)
    const match = fillingsByBase[itemBase].find((f) => f.label === item.fillingLabel)
    if (match) setFillingId(match.id)
  }

  const removeFromCart = (id: string) =>
    setCart((prev) => {
      const next = prev.filter((item) => item.id !== id)
      if (activeCartItemId === id) {
        const fallback = next.length ? next[next.length - 1] : null
        if (fallback) selectCartItem(fallback)
        else setActiveCartItemId(null)
      }
      return next
    })

  // WhatsApp renderiza *texto* en negrita — así el valor resalta apenas
  // llega el mensaje, en vez de perderse en medio del resto del texto.
  const cartItemLine = (item: (typeof cart)[number]) => {
    const extras = itemExtras(item)
    const extrasText = extras.length ? ` + ${extras.map((e) => e.label).join(", ")}` : ""
    return `${item.baseLabel} · ${item.fillingLabel}${extrasText} — *${formatCOP(itemPrice(item))}*`
  }

  // Con un solo producto el precio ya queda claro en esa línea — agregar un
  // "Total:" aparte solo lo repite. El total en su propia línea únicamente
  // aporta cuando hay más de un producto que sumar.
  const orderMsg = cart.length === 0
    ? `Hola, quiero pedir: 1 ${baseLabel} de ${selectedFilling.label}. Total: *${formatCOP(selectedFilling.price)}*`
    : cart.length === 1
      ? `Hola, quiero pedir: 1 ${cartItemLine(cart[0])}`
      : `Hola, quiero pedir:\n${cart.map((item, i) => `${i + 1}. ${cartItemLine(item)}`).join("\n")}\nTotal: *${formatCOP(grandTotal)}*`

  return (
    <div className="flex flex-1 flex-col bg-carbon font-sans text-paper">
      {/* ================= HEADER ================= */}
      {/* Fondo sólido con blur en vez de mix-blend-difference: ese truco se
          rompía cada vez que había un <Reveal> (Framer Motion) detrás, porque
          el transform inline que deja motion crea un nuevo stacking context
          y corta el blending contra el fondo real de la sección. */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-paper/10 bg-carbon/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3 text-paper md:px-14">
          <a href="#top" className="flex items-center gap-3">
            <Image src="/img/logo-origen.png" alt="Origen" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
            <span className="font-display text-xl font-semibold uppercase tracking-tight">Origen</span>
          </a>
          <nav className="hidden items-center gap-10 font-mono text-[11px] uppercase tracking-[0.15em] text-paper/85 md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-tostado">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a
              href={WHATSAPP_MSG("Hola, quiero hacer un pedido en Origen 🌽")}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden border border-paper/60 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.15em] transition hover:bg-paper/10 sm:inline-block"
            >
              Pedir ahora
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] md:hidden"
            >
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                className="h-[1.5px] w-6 bg-paper"
              />
              <motion.span
                animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="h-[1.5px] w-6 bg-paper"
              />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                className="h-[1.5px] w-6 bg-paper"
              />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-paper/10 md:hidden"
            >
              <div className="flex flex-col px-6 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-paper/75">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="border-b border-paper/10 py-2.5 transition hover:text-tostado last:border-b-0"
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href={WHATSAPP_MSG("Hola, quiero hacer un pedido en Origen 🌽")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="mt-3 mb-2 inline-block border border-paper/40 px-4 py-2 text-center text-[10px] transition hover:bg-paper/10"
                >
                  Pedir ahora
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* ================= HERO ================= */}
      {/* Hero "clavado" en pantalla: scrollea 130vh mientras el sticky interior
          se queda fijo y la foto hace zoom lento según el progreso de scroll,
          técnica inspirada en intros cinematográficas con scroll-pin. */}
      <section id="top" ref={heroRef} className="relative h-[130vh]">
        <div className="sticky top-0 flex h-[100svh] min-h-[600px] items-end overflow-hidden bg-carbon text-paper">
          <motion.div className="absolute inset-0" style={{ scale: heroScale }}>
            <video
              ref={videoRef}
              autoPlay
              muted={!soundOn || !heroInView}
              loop
              playsInline
              poster="/img/hero-poster.jpg"
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src="/video/hero.mp4" type="video/mp4" />
            </video>
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/55 to-carbon/20" />

          {/* control de sonido discreto — el video arranca en silencio (regla del
              navegador); un toque activa el ambiente de fogón. */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? "Silenciar" : "Activar sonido"}
            className={`absolute right-6 top-24 z-20 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm transition md:right-14 md:top-28 ${
              soundOn
                ? "border border-achiote bg-achiote/20 text-tostado shadow-[0_0_16px_rgba(217,79,30,0.5)] hover:bg-achiote/30"
                : "border border-paper/30 bg-carbon/40 text-paper/80 hover:border-paper/60 hover:text-paper"
            }`}
          >
            {soundOn ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M23 9l-6 6M17 9l6 6" />
              </svg>
            )}
          </button>

          {/* Humo saliendo de la arepa recién hecha — tenue, tipo vapor delgado */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[
              { left: "50%", width: 14, height: 60, delay: 0, duration: 4.5 },
              { left: "56%", width: 10, height: 48, delay: 1.6, duration: 4 },
              { left: "45%", width: 11, height: 52, delay: 3, duration: 4.2 },
            ].map((wisp, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-paper/60 blur-md"
                style={{
                  left: wisp.left,
                  bottom: "58%",
                  width: wisp.width,
                  height: wisp.height,
                }}
                initial={{ opacity: 0, y: 10, scaleX: 1 }}
                animate={{ opacity: [0, 0.28, 0.18, 0], y: -90, scaleX: [1, 1.6, 2.2] }}
                transition={{
                  duration: wisp.duration,
                  delay: wisp.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-6xl px-6 pb-20 text-center md:pb-24"
          >
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-tostado">
              Cocina en Chía · Domicilio en Chía y Cajicá
            </p>
            {/* Titular: la marca "Origen" ya está en el header/logo, así que
                acá solo va la línea "fantasma" en contorno — más grande y
                clara para que se lea bien de lejos. */}
            <h1 className="pt-2 font-sans font-bold uppercase tracking-[-0.03em]">
              <span className="block whitespace-nowrap leading-[0.95] text-[clamp(1.6rem,6.6vw,3.6rem)] text-transparent [-webkit-text-stroke:1.4px_rgba(242,234,216,0.65)]">
                <span className="text-tostado [-webkit-text-stroke:0]">// </span>Hecho a mano
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-paper md:text-xl">
              Arepas rellenas y patacones artesanales, hechos con maíz peto
              cocido y molido a mano, todos los días.
            </p>
            <div className="mt-5 flex flex-col items-center gap-3">
              <a
                href="#menu"
                className="inline-block font-mono text-sm font-semibold uppercase tracking-[0.15em] text-tostado underline underline-offset-4 transition hover:text-paper"
              >
                Ver menú completo
              </a>
            </div>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:gap-5">
              <Button
                asChild
                size="lg"
                className="w-full rounded-none border border-tostado/70 bg-transparent px-8 text-center font-mono text-xs uppercase tracking-[0.15em] text-paper hover:bg-tostado/15 sm:w-auto"
              >
                <a href={WHATSAPP_MSG("Hola, quiero hacer un pedido en Origen 🌽")} target="_blank" rel="noopener noreferrer">
                  Pedir por WhatsApp
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                className="w-full rounded-none border border-[#FF4412]/70 bg-transparent px-8 text-center font-mono text-xs uppercase tracking-[0.15em] text-paper hover:bg-[#FF4412]/15 sm:w-auto"
              >
                <a href={RAPPI} target="_blank" rel="noopener noreferrer">
                  Pedir por Rappi
                </a>
              </Button>
            </div>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.1em] text-paper/70">
              ¿Prefieres hablar primero?{" "}
              <a href="tel:+573143195593" className="text-tostado underline underline-offset-4 transition hover:text-paper">
                Llámanos al 314 319 5593
              </a>
            </p>

            {/* prompt de scroll, como el "SCROLL NOW" de PRIME */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="mt-12 flex flex-col items-center gap-1 font-mono text-[10px] uppercase tracking-[0.3em] text-paper/45"
            >
              <span>Baja para empezar</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-tostado">
                <path d="M12 5v14M6 13l6 6 6-6" />
              </svg>
            </motion.div>
          </motion.div>

          <DistortedGlass className="absolute inset-x-0 bottom-0 xl:w-full" />
        </div>
      </section>

      {/* ================= NUESTRA PROPUESTA ================= */}
      <section id="propuesta" className="border-t border-paper/10 px-6 py-16 md:px-14">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-achiote">01 — Nuestra propuesta</p>
          <h2 className="mt-4 font-sans text-4xl font-bold uppercase leading-[0.9] tracking-[-0.02em] md:text-6xl">Lo que sale del fogón</h2>
        </Reveal>

        {/* cinta horizontal continua — las tarjetas se desplazan solas hacia la izquierda */}
        <Reveal>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-carbon to-transparent md:w-32" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-carbon to-transparent md:w-32" />
            <motion.div
              className="flex w-max gap-8"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
            >
              {[...proposal, ...proposal].map((item, i) => (
                <a key={`${item.title}-${i}`} href="#menu" className="group block w-64 shrink-0 sm:w-72">
                  <div className="relative aspect-[3/4] overflow-hidden transition-transform duration-500 ease-out group-hover:scale-[1.02]">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(min-width: 640px) 18rem, 16rem"
                      style={{
                        objectPosition: item.position,
                        ["--base-transform" as string]: item.baseTransform,
                        ["--hover-transform" as string]: item.hoverTransform,
                        transform: "var(--base-transform)",
                      }}
                      className="object-cover transition duration-700 group-hover:[transform:var(--hover-transform)]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-carbon/80 via-carbon/10 to-transparent" />
                    {/* iluminación de borde: en desktop se ve al pasar el mouse, y
                        además pulsa sola de forma periódica para que en celular
                        (donde no hay hover) también se note la animación. */}
                    <div className="pointer-events-none absolute inset-0 border-2 border-achiote opacity-0 shadow-[0_0_45px_10px_rgba(217,79,30,0.65)] transition duration-500 group-hover:opacity-100" />
                    <motion.div
                      className="pointer-events-none absolute inset-0 border-2 border-achiote shadow-[0_0_45px_10px_rgba(217,79,30,0.65)]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        repeatDelay: 3.6,
                        delay: (i % proposal.length) * 0.7,
                        ease: "easeInOut",
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-paper">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-tostado">{item.note}</p>
                      <h3 className="mt-2 font-display text-2xl font-semibold uppercase tracking-tight">{item.title}</h3>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-relaxed text-paper/80">{item.description}</p>
                  <span className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-achiote group-hover:underline">
                    Ver en el menú →
                  </span>
                </a>
              ))}
            </motion.div>
          </div>
        </Reveal>
      </section>

      {/* ================= ARMA TU PEDIDO (build configurator) ================= */}
      {/* Inspirado en el configurador "Build Your Brace" — pasos con anillo de
          selección animado (layoutId compartido que se desliza entre opciones),
          vista previa que cruza en fade según la selección y total en vivo. */}
      <section id="build" className="border-t border-paper/10 px-6 py-16 md:px-14">
        <Reveal className="mx-auto mb-16 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-achiote">Interactivo // Personalizado</p>
          <h2 className="mt-4 font-sans text-4xl font-bold uppercase leading-[0.9] tracking-[-0.02em] md:text-6xl">
            <span className="text-tostado">// 02.</span> Pide en 3 pasos
          </h2>
        </Reveal>

        {/* -------- ¿ya sabes qué se te antoja? — atajo que suma directo al pedido
            del builder, para que las adiciones del Paso 3 se apliquen al mismo
            producto en vez de quedar sueltas en un pedido aparte -------- */}
        <Reveal className="mx-auto mb-16 max-w-6xl">
          <p className="mb-6 font-display text-2xl italic text-paper/90">¿Ya sabes qué se te antoja?</p>
          <div className="grid gap-5 sm:grid-cols-3">
            {featuredProducts.map((p) => {
              const filling = fillingsByBase[p.base].find((f) => f.id === p.fillingId)!
              return (
                <div key={p.label} className="group relative border border-paper/15">
                  <span className="absolute left-3 top-3 z-10 border border-achiote bg-carbon/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-tostado">
                    Los más pedidos ⭐
                  </span>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={filling.image}
                      alt={p.label}
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-carbon/85 via-transparent to-transparent" />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] uppercase tracking-[0.05em] text-paper">{p.label}</p>
                      <p className="font-mono text-xs text-tostado">{formatCOP(filling.price)}</p>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={(e) => addFillingToBase(p.base, filling, e)}
                      className="shrink-0 border border-achiote px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-paper transition hover:bg-achiote"
                    >
                      Agregar
                    </motion.button>
                  </div>
                </div>
              )
            })}
          </div>
        </Reveal>

        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1fr]">
          {/* -------- pasos -------- */}
          <div>
            <p className="mb-4 font-mono text-sm font-bold uppercase tracking-[0.15em] text-tostado">Elige tu arepa o patacón</p>
            {builderBases.map((b, bi) => {
              const isOpen = base === b.id
              const catFillings = fillingsByBase[b.id]
              return (
                <Reveal key={b.id} delay={bi * 0.1}>
                  <div className="mb-4 border border-paper/15">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isOpen) {
                          // Si ya hay un producto de esta categoría en el pedido,
                          // lo reactivamos para seguir editando sus adiciones en
                          // vez de mostrar "agrega un producto primero" de nuevo.
                          const existing = [...cart].reverse().find((item) => item.baseLabel === b.label)
                          if (existing) {
                            selectCartItem(existing)
                          } else {
                            setBase(b.id)
                            setFillingId(fillingsByBase[b.id][0].id)
                          }
                        }
                      }}
                      className="group relative flex w-full items-center gap-4 p-4 text-left transition hover:border-paper/40"
                    >
                      {isOpen && (
                        <motion.div
                          layoutId="base-glow"
                          className="absolute inset-0 border border-achiote shadow-[0_0_24px_rgba(217,79,30,0.35)]"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-paper/20">
                        <Image src={b.image} alt={b.label} fill sizes="64px" className="object-cover" />
                      </div>
                      <div className="relative min-w-0 flex-1">
                        <p className="font-mono text-sm uppercase tracking-[0.1em] text-paper">{b.label}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-paper/60">{b.note}</p>
                      </div>
                      <svg
                        className={`relative h-5 w-5 shrink-0 text-tostado transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {/* Mostrar/ocultar directo, sin animar la entrada/salida del panel:
                        con dos acordeones independientes (arepa/patacón) compartiendo el
                        layoutId del resplandor del encabezado, animar cada panel por
                        separado terminaba desincronizándose — uno se quedaba abierto y
                        el otro cerrado aunque el estado real ya había cambiado. */}
                    {isOpen && (
                        <div className="border-t border-paper/15">
                          <div className="p-4">
                            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-paper/60">
                              Elige el relleno (toca para añadir)
                            </p>
                            <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {catFillings.map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={(e) => addFilling(f, e)}
                                  className="group relative flex items-center gap-3 border border-paper/15 p-3 text-left transition hover:border-paper/40"
                                >
                                  {fillingId === f.id && (
                                    <motion.div
                                      layoutId="filling-glow"
                                      className="absolute inset-0 border border-achiote shadow-[0_0_16px_rgba(217,79,30,0.3)]"
                                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                  )}
                                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                                    <Image src={f.image} alt={f.label} fill sizes="40px" className="object-cover" />
                                  </div>
                                  <div className="relative min-w-0">
                                    <p className="truncate font-mono text-[11px] uppercase tracking-[0.05em] text-paper">{f.label}</p>
                                    <p className="font-mono text-[10px] text-tostado">{formatCOP(f.price)}</p>
                                  </div>
                                </button>
                              ))}
                            </div>

                            {/* Adiciones + bebidas de esta categoría — aparecen apenas
                                agregas un relleno de arepa o de patacón, sin salir del
                                acordeón que tienes abierto. Solo cuentan si el producto
                                activo es en verdad de esta categoría (arepa vs. patacón) —
                                si no, se verían las adiciones de otro producto sin serlo. */}
                            {(() => {
                              const itemHere = activeCartItem && activeCartItem.baseLabel === b.label ? activeCartItem : null
                              return (
                            <div className="mt-6 border-t border-paper/15 pt-4">
                              <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-tostado">
                                Adiciones y bebidas{" "}
                                {itemHere ? (
                                  <>
                                    para <span className="text-tostado">{itemHere.fillingLabel}</span>
                                  </>
                                ) : (
                                  "(agrega un producto primero)"
                                )}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {extrasList.map((e) => {
                                  const active = itemHere?.extraIds.includes(e.id) ?? false
                                  return (
                                    <motion.button
                                      key={e.id}
                                      type="button"
                                      disabled={!itemHere}
                                      whileTap={{ scale: 0.94 }}
                                      onClick={(ev) => handleExtraClick(e, ev)}
                                      className={`border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.05em] transition disabled:cursor-not-allowed disabled:opacity-30 ${
                                        active
                                          ? "border-achiote bg-achiote/15 text-paper"
                                          : "border-paper/15 text-paper/60 hover:border-paper/40"
                                      }`}
                                    >
                                      {e.label} <span className="text-tostado">+{formatCOP(e.price)}</span>
                                    </motion.button>
                                  )
                                })}
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.15em]">
                                <span className="border border-tostado/40 px-3 py-1.5 text-tostado/90">
                                  Domicilio Chía · $5.000
                                </span>
                                <span className="border border-tostado/40 px-3 py-1.5 text-tostado/90">
                                  Domicilio Cajicá · $10.000
                                </span>
                              </div>
                            </div>
                              )
                            })()}
                          </div>
                        </div>
                    )}
                  </div>
                </Reveal>
              )
            })}
          </div>

          {/* -------- vista previa en vivo -------- */}
          {/* En móvil va ARRIBA y sticky, para que el total quede siempre visible
              y la imagen voladora aterrice en el precio. En desktop vuelve a la
              columna derecha. */}
          <Reveal delay={0.15}>
            <div className="sticky top-24 border border-paper/15">
              <div className="relative h-[clamp(170px,26vh,260px)] overflow-hidden lg:h-[clamp(190px,32vh,320px)]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedFilling.image}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    <Image src={selectedFilling.image} alt={selectedFilling.label} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-carbon/90 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-tostado">{baseLabel}</p>
                  <p className="font-display text-2xl">{selectedFilling.label}</p>
                </div>
              </div>
              {activeCartItem && (
                <div className="space-y-2 border-t border-paper/15 p-5 font-mono text-xs uppercase tracking-[0.05em]">
                  <p className="mb-1 text-[10px] tracking-[0.2em] text-paper/65">
                    Adiciones de <span className="text-tostado">{activeCartItem.fillingLabel}</span>
                  </p>
                  {itemExtras(activeCartItem).length ? (
                    itemExtras(activeCartItem).map((e) => (
                      <div key={e.id} className="flex items-center justify-between gap-2 text-paper/80">
                        <span>+ {e.label}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          {formatCOP(e.price)}
                          <button
                            type="button"
                            onClick={() => removeExtraFromActiveItem(e.id)}
                            aria-label={`Quitar ${e.label}`}
                            className="text-paper/50 transition hover:text-achiote"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="normal-case tracking-normal text-paper/55">Ninguna — toca una adición arriba para sumarla a este producto</p>
                  )}
                </div>
              )}

              {cart.length > 0 && (
                <div className="max-h-[22vh] space-y-2 overflow-y-auto border-t border-paper/15 p-5 font-mono text-xs uppercase tracking-[0.05em]">
                  <p className="mb-1 text-[10px] tracking-[0.2em] text-paper/65">Tu pedido — toca uno para editar sus adiciones</p>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className={`flex w-full items-start justify-between gap-2 border-l-2 py-1 pl-2 transition ${
                        item.id === activeCartItemId ? "border-achiote text-paper" : "border-transparent text-paper/70"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectCartItem(item)}
                        className="min-w-0 flex-1 text-left normal-case tracking-normal transition hover:text-paper"
                      >
                        <span className="block truncate">{item.baseLabel} · {item.fillingLabel}</span>
                        {itemExtras(item).length > 0 && (
                          <span className="block truncate text-paper/65">+ {itemExtras(item).map((e) => e.label).join(", ")}</span>
                        )}
                      </button>
                      <span className="flex shrink-0 items-center gap-2">
                        {formatCOP(itemPrice(item))}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          aria-label="Quitar del pedido"
                          className="text-paper/40 transition hover:text-achiote"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-paper/15 p-5">
                <div ref={totalRef}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/65">
                    {cart.length ? "Total del pedido" : "Total"}
                  </p>
                  <p className="font-display text-3xl text-achiote">{formatCOP(grandTotal)}</p>
                </div>
                <a
                  href={WHATSAPP_MSG(orderMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-achiote bg-achiote px-5 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-paper transition hover:bg-achiote/85"
                >
                  Pedir por WhatsApp
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* imagen "volando" desde el producto tocado hasta el total — igual que en
          PRIME el foco es el producto, no la cifra: se ancla con left/top
          estáticos en el punto de origen y anima solo x/y (transform nativo de
          Framer, el único que garantiza interpolación fluida). */}
      <AnimatePresence>
        {flyPrice && (
          <motion.div
            key={flyPrice.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1.15, rotate: -6 }}
            animate={{
              x: flyPrice.endX - flyPrice.startX,
              y: flyPrice.endY - flyPrice.startY,
              opacity: [1, 1, 0],
              scale: [1.15, 1, 0.5],
              rotate: 8,
            }}
            transition={{
              duration: 1.5,
              ease: [0.4, 0, 0.3, 1],
              opacity: { duration: 1.5, times: [0, 0.85, 1], ease: "linear" },
              scale: { duration: 1.5, times: [0, 0.75, 1], ease: [0.4, 0, 0.3, 1] },
            }}
            style={{ position: "fixed", left: flyPrice.startX, top: flyPrice.startY }}
            className="pointer-events-none z-[60] -ml-9 -mt-9 h-[72px] w-[72px] overflow-hidden rounded-full border-2 border-achiote shadow-[0_0_28px_rgba(217,79,30,0.7)]"
          >
            <Image src={flyPrice.image} alt="" fill sizes="72px" className="object-cover" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MENU ================= */}
      <section id="menu" className="border-t border-paper/10 bg-carbon px-6 py-16 text-paper md:px-14">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-tostado">03 — El menú</p>
          <h2 className="mt-4 font-sans text-4xl font-bold uppercase leading-[0.9] tracking-[-0.02em] md:text-6xl">Origen</h2>
        </Reveal>

        <div className="mx-auto grid max-w-5xl gap-16 sm:grid-cols-2 lg:grid-cols-4">
          {menuGroups.map((group, gi) => (
            <Reveal key={group.category} delay={gi * 0.1}>
              <h3 className="mb-6 font-display text-2xl font-semibold uppercase tracking-tight text-tostado">{group.category}</h3>
              <ul className="space-y-4">
                {group.items.map((item) => (
                  <li key={item.name} className="flex items-baseline gap-2">
                    <span className="text-sm text-paper/85">{item.name}</span>
                    <span className="flex-1 border-b border-dotted border-paper/25 translate-y-[-4px]" />
                    <span className="font-mono text-sm text-tostado">{item.price}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal className="mx-auto mt-16 max-w-2xl text-center">
          <p className="font-mono text-xs text-paper/70">Pedido mínimo: 2 productos · Entrega en 25–40 min</p>
          <div className="mt-8 flex flex-wrap justify-center gap-5">
            <BorderBeamButton
              asChild
              beamSize="md"
              colorVariant="sunset"
              theme="dark"
              size="lg"
              className="rounded-none border border-tostado/60 bg-transparent px-8 font-mono text-xs uppercase tracking-[0.15em] text-paper hover:bg-paper/10"
            >
              <a href={WHATSAPP_MSG("Hola, quiero hacer un pedido en Origen 🌽")} target="_blank" rel="noopener noreferrer">
                Pedir por WhatsApp
              </a>
            </BorderBeamButton>
            <Button asChild size="lg" className="rounded-none bg-[#FF4412] px-8 font-mono text-xs uppercase tracking-[0.15em] text-paper hover:bg-[#FF4412]/90">
              <a href={RAPPI} target="_blank" rel="noopener noreferrer">Pedir por Rappi</a>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* ================= COBERTURA ================= */}
      <section id="cobertura" className="relative flex min-h-[70vh] items-center overflow-hidden bg-carbon text-paper">
        <Image
          src="/img/Pollo.png"
          alt="Domicilio Origen en Chía y Cajicá"
          fill
          sizes="100vw"
          style={{ objectPosition: "50% 42%" }}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-carbon/70" />
        <Reveal className="relative mx-auto max-w-2xl px-6 py-14 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-tostado">04 — Cobertura</p>
          <h2 className="mt-4 font-sans text-4xl font-bold uppercase leading-[0.9] tracking-[-0.02em] md:text-6xl">Chía y Cajicá</h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-paper">
            Sin sede física — todo el esfuerzo va en el maíz y en que tu
            pedido llegue caliente. Entrega en 25 a 40 minutos, todos los días
            de 8:00 a.m. a 10:00 p.m.
          </p>
          <div className="mx-auto mt-6 flex flex-wrap justify-center gap-3 font-mono text-xs uppercase tracking-[0.15em]">
            <span className="border border-tostado/50 px-4 py-2 text-tostado">
              Domicilio Chía · $5.000
            </span>
            <span className="border border-tostado/50 px-4 py-2 text-tostado">
              Domicilio Cajicá · $10.000
            </span>
          </div>
          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href={WHATSAPP_MSG("Hola, quiero hacer un pedido en Origen 🌽")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-paper/50 px-8 py-3 font-mono text-xs uppercase tracking-[0.15em] transition hover:border-paper hover:bg-paper/10"
            >
              Pedir por WhatsApp
            </a>
            <a href="tel:+573143195593" className="font-mono text-xs uppercase tracking-[0.1em] text-paper/80 transition hover:text-tostado">
              📞 Llámanos: 314 319 5593
            </a>
          </div>
        </Reveal>
      </section>

      {/* ================= TESTIMONIOS ================= */}
      <section id="clientes" className="border-t border-paper/10 px-6 py-16 md:px-14">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-achiote">05 — Clientes</p>
          <h2 className="mt-4 font-sans text-4xl font-bold uppercase leading-[0.9] tracking-[-0.02em] md:text-6xl">Lo que dicen de nosotros</h2>
        </Reveal>
        <div className="mx-auto grid max-w-5xl gap-x-12 gap-y-14 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={(i % 2) * 0.15}>
              <p className="mb-3 text-tostado">★★★★★</p>
              <p className="font-display text-xl italic leading-snug text-paper/90">
                “{t.quote}”
              </p>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.15em] text-paper/75">{t.name}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-achiote">{t.city}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= ACOMPAÑAMIENTO (capturas de WhatsApp) ================= */}
      <section id="acompanamos" className="border-t border-paper/10 px-6 py-16 md:px-14">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-achiote">06 — Acompañamiento</p>
          <h2 className="mt-4 font-sans text-4xl font-bold uppercase leading-[0.9] tracking-[-0.02em] md:text-6xl">
            Así te acompañamos, de principio a fin
          </h2>
        </Reveal>
        <div className="mx-auto grid max-w-3xl gap-6">
          {["/img/whatsapp/whatsapp-1.png", "/img/whatsapp/whatsapp-2.png", "/img/whatsapp/whatsapp-3.png"].map((src, i) => (
            <Reveal key={src} delay={i * 0.1}>
              <div className="relative aspect-[5/3] overflow-hidden border border-paper/15 bg-paper/[0.03]">
                <Image src={src} alt={`Conversación real por WhatsApp con un cliente de Origen ${i + 1}`} fill sizes="(min-width: 640px) 48rem, 90vw" className="object-contain" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= FOOTER / CONTACTO ================= */}
      <footer id="contacto" className="border-t border-paper/10 px-6 py-16 md:px-14">
        <p className="mx-auto mb-10 max-w-5xl font-mono text-xs uppercase tracking-[0.3em] text-achiote">07 — Contacto</p>
        <div className="mx-auto flex max-w-5xl flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-display text-2xl font-semibold uppercase tracking-tight text-paper">Origen</p>
            <p className="mt-1 text-sm text-paper/70">Sabor con Origen</p>
          </div>
          <div className="grid grid-cols-2 gap-10 font-mono text-xs">
            <div>
              <p className="mb-3 uppercase tracking-[0.15em] text-achiote">Contacto</p>
              <ul className="space-y-2 text-paper/85">
                <li><a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-achiote">WhatsApp: +57 314 319 5593</a></li>
                <li><a href="tel:+573143195593" className="hover:text-achiote">📞 Llámanos: 314 319 5593</a></li>
                <li><a href={RAPPI} target="_blank" rel="noopener noreferrer" className="hover:text-achiote">Rappi</a></li>
                <li><a href="https://www.instagram.com/origen5752/" target="_blank" rel="noopener noreferrer" className="hover:text-achiote">Instagram @origen5752</a></li>
                <li><a href="https://www.facebook.com/Origen1948/" target="_blank" rel="noopener noreferrer" className="hover:text-achiote">Facebook</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 uppercase tracking-[0.15em] text-achiote">Horario</p>
              <ul className="space-y-2 text-paper/85">
                <li>Lunes a domingo</li>
                <li>8:00 a.m. – 10:00 p.m.</li>
                <li>Chía y Cajicá</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-14 max-w-5xl font-mono text-[11px] text-paper/35">
          © 2026 Origen — hecho con maíz y paciencia.
        </p>
      </footer>

      {/* ================= HUD DE CÁMARA (marco film, toda la página) ================= */}
      {/* Marco tipo visor de cámara que persiste sobre todas las secciones, igual
          que en PRIME: esquinas, REC + timecode, specs de cámara y texto vertical.
          pointer-events-none para no bloquear clics del contenido. */}
      <div className="pointer-events-none fixed inset-0 z-40 hidden md:block">
        <span className="absolute left-6 top-20 h-6 w-6 border-l border-t border-paper/25" />
        <span className="absolute right-6 top-20 h-6 w-6 border-r border-t border-paper/25" />
        <span className="absolute bottom-[76px] left-6 h-6 w-6 border-b border-l border-paper/25" />
        <span className="absolute bottom-[76px] right-6 h-6 w-6 border-b border-r border-paper/25" />

        <div className="absolute left-10 top-[84px] flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/60">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-achiote opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-achiote" />
          </span>
          REC 00:00:{mm}:{ss}
        </div>

        <div className="absolute right-10 top-[84px] font-mono text-[11px] uppercase tracking-[0.18em] text-paper/45">
          4K · 24FPS · F2.8 · 1/50
        </div>

        <div
          className="absolute right-8 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-paper/30"
          style={{ writingMode: "vertical-rl" }}
        >
          Origen corte No.01 — maíz peto
        </div>
      </div>

      {/* espacio para que el scrubber fijo no tape el pie de página */}
      <div className="hidden h-20 md:block" />

      {/* ================= SCRUBBER INFERIOR (regla + lecturas) ================= */}
      <div className="fixed inset-x-0 bottom-0 z-40 hidden flex-col border-t border-paper/10 bg-carbon/90 backdrop-blur-md md:flex">
        {/* regla de marcas con indicador de diamante que avanza con el scroll */}
        <div className="relative h-6 overflow-hidden border-b border-paper/10">
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-1">
            {Array.from({ length: 80 }).map((_, i) => (
              <span key={i} className={`w-px bg-paper/20 ${i % 10 === 0 ? "h-4 bg-paper/35" : "h-2"}`} />
            ))}
          </div>
          <motion.div
            className="absolute inset-y-0 flex w-4 -translate-x-1/2 items-center justify-center"
            style={{ left: scrubLeft }}
          >
            <span className="h-3 w-3 rotate-45 bg-achiote shadow-[0_0_10px_rgba(217,79,30,0.8)]" />
          </motion.div>
        </div>
        {/* lecturas tipo visor */}
        <div className="flex items-center gap-6 px-6 py-2.5 md:px-14">
          <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.15em] text-paper/75">
            {String(activeSection + 1).padStart(2, "0")} · {sectionsList[activeSection].label}
          </span>
          <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-paper/10">
            <motion.div className="absolute inset-y-0 left-0 bg-achiote" style={{ width: progressWidth }} />
          </div>
          <div className="hidden items-center gap-5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.15em] text-paper/40 lg:flex">
            <span>ISO <span className="text-paper/70">800</span></span>
            <span>WB <span className="text-paper/70">5600K</span></span>
            <span>SECCIÓN <span className="text-paper/70">{String(activeSection + 1).padStart(2, "0")}</span> / 08</span>
            <span>FRAME <span className="text-paper/70">{String(frame).padStart(3, "0")}</span> / 200</span>
            <span className="text-tostado">◢ SCRUB ACTIVO</span>
          </div>
        </div>
      </div>

      {/* Barra de total fija en móvil — aparece al agregar algo al pedido. Mantiene
          el precio siempre visible y sirve de destino a la imagen voladora. */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t border-paper/15 bg-carbon/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <div ref={mobileTotalRef}>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/40">Total del pedido</p>
            <p className="font-display text-xl leading-none text-achiote">{formatCOP(grandTotal)}</p>
          </div>
          <a
            href={WHATSAPP_MSG(orderMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 border border-achiote bg-achiote px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-paper"
          >
            Pedir por WhatsApp
          </a>
        </div>
      )}

      <a
        href={WHATSAPP_MSG("Hola, quiero hacer un pedido en Origen 🌽")}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-5 right-5 z-50 ${cart.length ? "hidden" : "flex"} h-14 w-14 items-center justify-center rounded-full bg-achiote text-paper shadow-xl transition hover:scale-105 md:hidden`}
        aria-label="Pedir por WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.45 1.32 4.95L2 22l5.24-1.37a9.9 9.9 0 0 0 4.8 1.22h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2zm0 18.2h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.23 8.23 0 0 1-1.26-4.4c0-4.55 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.25 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.41 1.02 2.58.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
      </a>
    </div>
  )
}
