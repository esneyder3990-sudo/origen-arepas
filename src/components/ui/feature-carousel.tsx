"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  type MotionStyle,
  type MotionValue,
  type Variants,
} from "motion/react"

// Adaptado de Cult UI (@cult-ui/feature-carousel): la versión original
// muestra pares de capturas de pantalla por paso (pensada para SaaS). Acá
// se simplifica a una sola foto por paso, con nuestro contenido real.

type WrapperStyle = MotionStyle & {
  "--x": MotionValue<string>
  "--y": MotionValue<string>
}

export interface FeatureStep {
  title: string
  description: string
  image: string
  alt: string
}

interface FeatureCarouselProps {
  steps: FeatureStep[]
  interval?: number
  bgClass?: string
}

const stepVariants: Variants = {
  inactive: { scale: 0.8, opacity: 0.5 },
  active: { scale: 1, opacity: 1 },
}

function useNumberCycler(totalSteps: number, interval: number) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setupTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % totalSteps)
      setupTimer()
    }, interval)
  }, [interval, totalSteps])

  const goTo = useCallback(
    (index: number) => {
      setCurrent(index)
      setupTimer()
    },
    [setupTimer]
  )

  useEffect(() => {
    setupTimer()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [setupTimer])

  return { current, goTo }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 768px)").matches)
  }, [])
  return isMobile
}

function Steps({
  steps,
  current,
  onChange,
}: {
  steps: FeatureStep[]
  current: number
  onChange: (index: number) => void
}) {
  return (
    <nav aria-label="Beneficios" className="flex flex-wrap justify-center gap-2 px-4">
      {steps.map((step, i) => {
        const isCurrent = current === i
        return (
          <motion.button
            key={step.title}
            type="button"
            initial="inactive"
            animate={isCurrent ? "active" : "inactive"}
            variants={stepVariants}
            transition={{ duration: 0.3 }}
            onClick={() => onChange(i)}
            className={cn(
              "rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors",
              isCurrent
                ? "border-tostado bg-tostado/15 text-tostado"
                : "border-paper/15 text-paper/50 hover:text-paper/80"
            )}
          >
            {step.title}
          </motion.button>
        )
      })}
    </nav>
  )
}

export function FeatureCarousel({
  steps,
  interval = 3800,
  bgClass,
}: FeatureCarouselProps) {
  const { current, goTo } = useNumberCycler(steps.length, interval)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const isMobile = useIsMobile()

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    if (isMobile) return
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  const step = steps[current]

  return (
    <motion.div
      className="relative w-full rounded-[28px]"
      onMouseMove={handleMouseMove}
      style={
        {
          "--x": useMotionTemplate`${mouseX}px`,
          "--y": useMotionTemplate`${mouseY}px`,
        } as WrapperStyle
      }
    >
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-[28px] border border-paper/10 bg-gradient-to-b from-carbon to-[#171009]",
          bgClass
        )}
      >
        <div className="grid gap-0 md:grid-cols-2">
          <div className="flex flex-col justify-center gap-4 p-10 md:p-14">
            <span className="font-mono text-xs uppercase tracking-widest text-tostado">
              {String(current + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
            </span>
            <div className="relative min-h-[140px] md:min-h-[130px]">
              <AnimatePresence>
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16, position: "absolute" }}
                  transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute inset-x-0 top-0 flex flex-col gap-3"
                >
                  <h3 className="font-display text-2xl font-bold text-paper md:text-3xl">
                    {step.title}
                  </h3>
                  <p className="max-w-sm text-sm leading-relaxed text-paper/70 md:text-base">
                    {step.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="relative min-h-[260px] md:min-h-[360px]">
            <AnimatePresence>
              <motion.div
                key={step.image}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                className="absolute inset-0"
              >
                <Image
                  src={step.image}
                  alt={step.alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                  priority={current === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-carbon/40 via-transparent to-transparent md:bg-gradient-to-l" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Steps steps={steps} current={current} onChange={goTo} />
      </div>
    </motion.div>
  )
}

export default FeatureCarousel
