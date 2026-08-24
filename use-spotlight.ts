import * as React from "react"
import { useMotionTemplate, useMotionValue } from "framer-motion"

// Brilho radial (violeta/esmeralda) que segue o cursor — estilo "spotlight
// card" do catálogo SyntaxUI. Fica num hook à parte (não dentro de
// spotlight-card.tsx) só por causa da regra de fast-refresh do eslint: um
// arquivo que exporta hook + componente perde a hot-reload isolada.
export function useSpotlight() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    mouseX.set(event.clientX - rect.left)
    mouseY.set(event.clientY - rect.top)
  }

  const background = useMotionTemplate`radial-gradient(280px circle at ${mouseX}px ${mouseY}px, rgb(139 92 246 / 0.14), rgb(16 185 129 / 0.10) 45%, transparent 75%)`

  return { handleMouseMove, background }
}
