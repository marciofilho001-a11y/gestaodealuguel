import type * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

// Botão de ação principal com brilho em degradê varrendo o fundo (loop
// lento, sutil) + micro-clique (scale 0.98). Reservado pra CTA "hero" do
// app (Adicionar Reserva) — usar em mais de um lugar dilui o destaque.
export function ShinyButton({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof motion.button>, "children"> & { children?: React.ReactNode }) {
  return (
    <motion.button
      data-slot="shiny-button"
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "group/button relative isolate inline-flex h-8 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors select-none hover:bg-primary/90 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className="animate-shiny-sweep pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 30%, rgb(255 255 255 / 0.4) 46%, rgb(255 255 255 / 0.4) 54%, transparent 70%)",
          backgroundSize: "220% 100%",
        }}
      />
      {children}
    </motion.button>
  )
}
