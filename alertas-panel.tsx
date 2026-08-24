import * as React from "react"
import { BellRing, CalendarClock, CalendarHeart, DoorOpen, KeyRound } from "lucide-react"

import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { formatDate } from "@/lib/format"
import type { Casa, Reserva } from "@/types"

interface AlertaItem {
  tipo: "checkin-hoje" | "checkout-hoje" | "proximo" | "futura"
  ordem: number
  reservaId: number
  titulo: string
  sub: string
}

interface AlertasPanelProps {
  reservasCasa: Reserva[]
  modoTodasCasas: boolean
  casas: Casa[]
  onEditReserva: (id: number) => void
}

const ICONES: Record<AlertaItem["tipo"], React.ElementType> = {
  "checkin-hoje": KeyRound,
  "checkout-hoje": DoorOpen,
  proximo: CalendarClock,
  futura: CalendarHeart,
}

const CORES: Record<AlertaItem["tipo"], string> = {
  "checkin-hoje": "bg-accent text-accent-foreground",
  "checkout-hoje": "bg-gold-soft text-gold-foreground",
  proximo: "bg-secondary text-secondary-foreground",
  futura: "bg-secondary text-secondary-foreground",
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

// Quantas reservas futuras (além da janela de 3 dias) aparecem como legenda
const MAX_FUTURAS = 5
// Até quantos dias à frente essas legendas olham
const JANELA_FUTURAS_DIAS = 90

// Sem Card próprio — este painel vive dentro do Sheet lateral aberto pelo
// dashboard (o Sheet já é o "cartão"; aninhar outro por dentro duplicaria a
// moldura). SheetHeader/SheetTitle ficam a cargo de quem monta o Sheet.
export function AlertasPanel({ reservasCasa, modoTodasCasas, casas, onEditReserva }: AlertasPanelProps) {
  const alertas = React.useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const ativas = reservasCasa.filter((r) => r.status !== "cancelada")
    const lista: AlertaItem[] = []
    const futuras: AlertaItem[] = []

    ativas.forEach((r) => {
      const ci = new Date(r.checkin + "T00:00:00")
      const co = new Date(r.checkout + "T00:00:00")
      const diasParaCheckin = Math.round((ci.getTime() - hoje.getTime()) / 86400000)
      const diasParaCheckout = Math.round((co.getTime() - hoje.getTime()) / 86400000)
      const nomeCasa = casas.find((c) => c.id === r.casa_id)?.nome || ""
      const prefixoCasa = modoTodasCasas ? `${nomeCasa} · ` : ""
      const nome = r.hospede || "(sem nome)"

      if (diasParaCheckin === 0) {
        lista.push({
          tipo: "checkin-hoje",
          ordem: 0,
          reservaId: r.id,
          titulo: `Check-in hoje: ${nome}`,
          sub: `${prefixoCasa}${r.plataforma} · ${formatDate(r.checkout)} é o check-out`,
        })
      } else if (diasParaCheckout === 0) {
        lista.push({
          tipo: "checkout-hoje",
          ordem: 1,
          reservaId: r.id,
          titulo: `Check-out hoje: ${nome}`,
          sub: `${prefixoCasa}${r.plataforma} · chegou em ${formatDate(r.checkin)}`,
        })
      } else if (diasParaCheckin > 0 && diasParaCheckin <= 3) {
        lista.push({
          tipo: "proximo",
          ordem: 2 + diasParaCheckin,
          reservaId: r.id,
          titulo: `Check-in em ${diasParaCheckin} dia(s): ${nome}`,
          sub: `${prefixoCasa}${r.plataforma} · ${formatDate(r.checkin)}`,
        })
      } else if (diasParaCheckin > 3 && diasParaCheckin <= JANELA_FUTURAS_DIAS) {
        // Legenda narrativa pra reservas mais à frente, tipo "de olho no mês que vem"
        const mes = MESES[ci.getMonth()]
        futuras.push({
          tipo: "futura",
          ordem: 100 + diasParaCheckin,
          reservaId: r.id,
          titulo: `Em ${mes}${modoTodasCasas ? `, ${nomeCasa}` : ""}: reserva de ${nome}`,
          sub: `${formatDate(r.checkin)} a ${formatDate(r.checkout)} · ${r.plataforma}`,
        })
      }
    })

    futuras.sort((a, b) => a.ordem - b.ordem)
    return [...lista.sort((a, b) => a.ordem - b.ordem), ...futuras.slice(0, MAX_FUTURAS)]
  }, [reservasCasa, modoTodasCasas, casas])

  return (
    <div className="flex flex-col gap-2">
      {alertas.length === 0 ? (
        <Empty className="py-6">
          <EmptyMedia variant="icon">
            <BellRing />
          </EmptyMedia>
          <EmptyTitle className="text-sm">Tudo tranquilo</EmptyTitle>
          <EmptyDescription>Nenhum check-in ou check-out nos próximos dias.</EmptyDescription>
        </Empty>
      ) : (
        alertas.map((a, i) => {
          const Icone = ICONES[a.tipo]
          return (
            <button
              key={i}
              type="button"
              onClick={() => onEditReserva(a.reservaId)}
              className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 text-left transition-colors hover:bg-accent/40"
            >
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${CORES[a.tipo]}`}>
                <Icone className="size-3.5" />
              </span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-semibold">{a.titulo}</div>
                <div className="truncate text-[11.5px] text-muted-foreground">{a.sub}</div>
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}
