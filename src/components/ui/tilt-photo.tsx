"use client"

/**
 * Foto de producto con inclinación 3D real al mover el mouse (perspectiva +
 * rotateX/rotateY con spring), más un brillo que sigue el cursor. Se
 * desactiva en touch (no hay mouse) y respeta prefers-reduced-motion.
 */
import { useRef } from "react"
import Image from "next/image"
import { motion, useMotionValue, useSpring, useTransform } from "motion/react"

interface TiltPhotoProps {
  src: string
  alt: string
  size?: number
  className?: string
}

export function TiltPhoto({ src, alt, size = 224, className }: TiltPhotoProps) {
  const ref = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { stiffness: 180, damping: 16, mass: 0.6 }
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [16, -16]), springConfig)
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-16, 16]), springConfig)
  const glowX = useTransform(x, [-0.5, 0.5], ["10%", "90%"])
  const glowY = useTransform(y, [-0.5, 0.5], ["10%", "90%"])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <div style={{ perspective: 900 }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.06 }}
        style={{ width: size, height: size, rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={
          "group relative overflow-hidden rounded-full border-4 border-paper shadow-[0_20px_40px_-10px_rgba(33,25,20,0.55)] " +
          (className ?? "")
        }
      >
        <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-cover" />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: useTransform(
              [glowX, glowY],
              ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.35), transparent 55%)`
            ),
          }}
        />
      </motion.div>
    </div>
  )
}

export default TiltPhoto
