import * as React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { GuestAvatar } from "@/components/guest-avatar"
import { corDaCasa } from "@/lib/colors"
import { formatBRL, formatDate } from "@/lib/format"
import { PLATFORM_COLOR } from "@/lib/platform"
import { cn } from "@/lib/utils"
import type { Casa, Reserva } from "@/types"

const DOWS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]
// Quantos cartões de reserva mostrar antes de resumir em "+N"
const MAX_CARDS_POR_DIA = 2

interface CalendarViewProps {
  casas: Casa[]
  reservasCasa: Reserva[]
  modoTodasCasas: boolean
  mesAtual: Date
  selectedReservaId: number | null
  onSelectReserva: (id: number) => void
}

interface ReservaDayCardProps {
  reserva: Reserva
  casas: Casa[]
  modoTodasCasas: boolean
  selected: boolean
  onSelect: () => void
}

function ReservaDayCard({ reserva, casas, modoTodasCasas, selected, onSelect }: ReservaDayCardProps) {
  const cor = modoTodasCasas
    ? corDaCasa(casas, reserva.casa_id)
    : PLATFORM_COLOR[reserva.plataforma] || PLATFORM_COLOR.Outro

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 flex-col items-start gap-0.5 rounded-lg border p-2 text-left leading-tight transition-colors",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border/70 bg-card hover:bg-accent/40"
      )}
    >
      <div className="flex w-full min-w-0 items-center gap-1.5">
        <GuestAvatar
          nome={reserva.hospede || "?"}
          casas={casas}
          casaId={reserva.casa_id}
          cor={cor}
          size="sm"
          className="size-5 shrink-0"
        />
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{reserva.hospede || "(sem nome)"}</span>
      </div>
      <span className="w-full min-w-0 truncate text-[10px] text-muted-foreground">
        Check-in: {formatDate(reserva.checkin)}
      </span>
      <span className="w-full min-w-0 truncate text-[10px] text-muted-foreground">
        Check-out: {formatDate(reserva.checkout)}
      </span>
      <span className="w-full min-w-0 truncate font-mono text-[11px] font-bold text-primary">
        {formatBRL(reserva.valor_total)}
      </span>
    </button>
  )
}

export function CalendarView({
  casas,
  reservasCasa,
  modoTodasCasas,
  mesAtual,
  selectedReservaId,
  onSelectReserva,
}: CalendarViewProps) {
  const dias = React.useMemo(() => {
    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth()
    const primeiroDia = new Date(ano, mes, 1)
    const inicioGrid = new Date(primeiroDia)
    inicioGrid.setDate(primeiroDia.getDate() - primeiroDia.getDay())
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const ativas = reservasCasa.filter((r) => r.status !== "cancelada")

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicioGrid)
      d.setDate(inicioGrid.getDate() + i)
      // Cada reserva aparece uma única vez, no dia do check-in — evita
      // repetir o mesmo cartão em todos os dias da estadia.
      // Importante: "YYYY-MM-DD" sozinho o JS interpreta como UTC, mas `d`
      // é meia-noite no fuso local — em UTC-3 isso nunca batia e os
      // cartões nunca apareciam. Adicionando o horário força o parse local.
      const checkins = ativas.filter((r) => new Date(r.checkin + "T00:00:00").getTime() === d.getTime())
      return {
        data: d,
        outMonth: d.getMonth() !== mes,
        isToday: d.getTime() === hoje.getTime(),
        checkins,
      }
    })
  }, [mesAtual, reservasCasa])

  return (
    <Card className="gap-3 py-4">
      <CardContent className="px-3">
        <div className="grid grid-cols-7 gap-1">
          {DOWS.map((d) => (
            <div key={d} className="py-1 text-center font-mono text-[10.5px] font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
          {dias.map((dia, i) => (
            <div
              key={i}
              className={cn(
                "flex min-h-48 min-w-0 flex-col gap-1 rounded-lg p-1.5 text-[11.5px]",
                dia.outMonth ? "text-muted-foreground/40" : "text-foreground",
                dia.isToday && "bg-accent/40 ring-1 ring-primary/40"
              )}
            >
              <span className="px-0.5 font-semibold">{dia.data.getDate()}</span>
              {dia.checkins.length > 0 && (
                <div className="flex flex-col gap-1">
                  {dia.checkins.slice(0, MAX_CARDS_POR_DIA).map((r) => (
                    <ReservaDayCard
                      key={r.id}
                      reserva={r}
                      casas={casas}
                      modoTodasCasas={modoTodasCasas}
                      selected={r.id === selectedReservaId}
                      onSelect={() => onSelectReserva(r.id)}
                    />
                  ))}
                  {dia.checkins.length > MAX_CARDS_POR_DIA && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{dia.checkins.length - MAX_CARDS_POR_DIA} mais
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
          {modoTodasCasas
            ? casas.map((c) => (
                <span key={c.id} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: corDaCasa(casas, c.id) }} />
                  {c.nome}
                </span>
              ))
            : (["Airbnb", "Booking", "Outro"] as const).map((p) => (
                <span key={p} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: PLATFORM_COLOR[p] }} />
                  {p}
                </span>
              ))}
        </div>
      </CardContent>
    </Card>
  )
}
