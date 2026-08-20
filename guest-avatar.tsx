/* eslint-disable react-refresh/only-export-components */
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { corDaCasa } from "@/lib/colors"
import type { Casa } from "@/types"

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return "?"
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

interface GuestAvatarProps {
  nome: string
  casas: Casa[]
  casaId: number | null
  /** Cor explícita (ex: por plataforma) — se omitida, usa a cor da casa */
  cor?: string
  size?: "sm" | "default" | "lg"
  className?: string
}

export function GuestAvatar({ nome, casas, casaId, cor, size = "sm", className }: GuestAvatarProps) {
  const corFinal = cor ?? corDaCasa(casas, casaId)
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback
        className="text-[10px] font-bold text-white"
        style={{ backgroundColor: corFinal }}
      >
        {iniciais(nome || "?")}
      </AvatarFallback>
    </Avatar>
  )
}
