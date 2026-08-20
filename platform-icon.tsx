import { cn } from "@/lib/utils"
import { PLATFORM_COLOR } from "@/lib/platform"

interface PlatformIconProps {
  plataforma: string
  size?: "sm" | "default"
  className?: string
}

// Selo redondo com a inicial da plataforma, na cor de marca dela — dá um
// "ponto de reconhecimento visual" parecido com um logo, sem reproduzir a
// marca registrada de terceiros (Airbnb/Booking).
export function PlatformIcon({ plataforma, size = "default", className }: PlatformIconProps) {
  const cor = PLATFORM_COLOR[plataforma] || PLATFORM_COLOR.Outro
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        size === "sm" ? "size-4 text-[9px]" : "size-5 text-[10px]",
        className
      )}
      style={{ backgroundColor: cor }}
      aria-hidden="true"
    >
      {(plataforma || "?").charAt(0).toUpperCase()}
    </span>
  )
}
