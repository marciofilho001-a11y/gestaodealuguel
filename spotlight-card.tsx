import * as React from "react"
import { motion } from "framer-motion"

import { useSpotlight } from "@/hooks/use-spotlight"
import { cn } from "@/lib/utils"

// Camada do brilho em si — `-z-10` faz ela pintar depois do fundo do card e
// antes do conteúdo em fluxo (sem precisar envolver os filhos em wrapper
// nenhum, o que quebraria o `gap`/`:last-child` de quem já usa este card).
export function SpotlightOverlay({ background }: { background: ReturnType<typeof useSpotlight>["background"] }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
      style={{ background }}
    />
  )
}

// Substituto direto do <Card> — mesma aparência (borda, fundo, sombra,
// cantos), só que com o spotlight no hover. Trocar <Card> por
// <SpotlightCard> não muda mais nada no resto do markup.
export function SpotlightCard({ className, children, ...props }: React.ComponentProps<"div">) {
  const { handleMouseMove, background } = useSpotlight()

  return (
    <div
      data-slot="spotlight-card"
      onMouseMove={handleMouseMove}
      className={cn(
        // `group/card` também é declarado aqui (não só `group/spotlight`) —
        // quem já usava `group-data-[...]/card:` esperando o <Card> padrão
        // como ancestral (ex: GanhosCard, pro estado `hero`) continua
        // funcionando ao trocar <Card> por <SpotlightCard>.
        "group/card group/spotlight relative isolate flex flex-col gap-(--card-spacing) overflow-hidden rounded-2xl border border-border bg-card py-(--card-spacing) text-sm text-card-foreground shadow-sm [--card-spacing:--spacing(4)]",
        className
      )}
      {...props}
    >
      <SpotlightOverlay background={background} />
      {children}
    </div>
  )
}
