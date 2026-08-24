import * as React from "react"
import { DoorOpen } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { GuestAvatar } from "@/components/guest-avatar"
import { corDaCasa } from "@/lib/colors"
import { abreviarNome, formatBRLCompacto, formatDiaMes } from "@/lib/format"
import { PLATFORM_COLOR } from "@/lib/platform"
import { cn } from "@/lib/utils"
import type { Casa, Reserva } from "@/types"

const DOWS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]
// Quantos cartões de reserva (check-in) mostrar antes de resumir em "+N"
const MAX_CARDS_POR_DIA = 2
// Quantos avisos de saída (check-out) mostrar antes de resumir em "+N"
const MAX_SAIDAS_POR_DIA = 3

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

  // O dia do check-in já é a própria posição do card no grid — repetir a
  // data de chegada aqui dentro seria redundante. Só a saída importa.
  const nomeAbreviado = abreviarNome(reserva.hospede) || "(sem nome)"

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 flex-col items-start gap-0.5 rounded-lg border p-1.5 text-left leading-tight transition-colors",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/70 dark:border-border/70 dark:bg-card dark:text-foreground dark:hover:bg-accent/40"
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
        <span className="min-w-0 flex-1 truncate text-[11px] leading-tight font-semibold">{nomeAbreviado}</span>
      </div>
      <span className="w-full min-w-0 truncate text-[11px] leading-tight text-emerald-700/80 dark:text-muted-foreground">
        → {formatDiaMes(reserva.checkout)}
      </span>
      <span className="w-full min-w-0 truncate text-[11px] leading-tight font-bold tabular-nums text-emerald-800 dark:text-emerald-400">
        {formatBRLCompacto(reserva.valor_total)}
      </span>
    </button>
  )
}

interface CheckoutBadgeProps {
  reserva: Reserva
  selected: boolean
  onSelect: () => void
}

// Aviso compacto de saída — deliberadamente menor e mais discreto que o
// card de check-in, só pra sinalizar "casa libera hoje" de relance.
function CheckoutBadge({ reserva, selected, onSelect }: CheckoutBadgeProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 rounded-md border p-1.5 text-left leading-tight transition-colors",
        selected
          ? "border-rose-400 bg-rose-100 text-rose-900 ring-1 ring-rose-400 dark:border-destructive dark:bg-destructive/15 dark:text-destructive dark:ring-destructive"
          : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100/70 dark:border-destructive/25 dark:bg-destructive/5 dark:text-destructive/80 dark:hover:bg-destructive/10"
      )}
    >
      <DoorOpen className="size-3 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[11px] leading-tight font-medium">
        Saída: {abreviarNome(reserva.hospede) || "(sem nome)"}
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
      // Mesma lógica do check-in, mas pro dia de saída — permite sinalizar
      // "casa libera hoje" mesmo quando não é o dia de chegada de ninguém.
      const checkouts = ativas.filter((r) => new Date(r.checkout + "T00:00:00").getTime() === d.getTime())
      return {
        data: d,
        outMonth: d.getMonth() !== mes,
        isToday: d.getTime() === hoje.getTime(),
        checkins,
        checkouts,
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
              {dia.checkouts.length > 0 && (
                <div className="flex flex-col gap-1">
                  {dia.checkouts.slice(0, MAX_SAIDAS_POR_DIA).map((r) => (
                    <CheckoutBadge
                      key={`checkout-${r.id}`}
                      reserva={r}
                      selected={r.id === selectedReservaId}
                      onSelect={() => onSelectReserva(r.id)}
                    />
                  ))}
                  {dia.checkouts.length > MAX_SAIDAS_POR_DIA && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{dia.checkouts.length - MAX_SAIDAS_POR_DIA} saídas
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
          <span className="flex items-center gap-1.5 text-rose-700 dark:text-destructive/80">
            <DoorOpen className="size-3" />
            Saída (check-out)
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
