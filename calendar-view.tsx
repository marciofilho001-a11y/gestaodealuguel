import * as React from "react"
import { Pencil } from "lucide-react"

import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { GuestAvatar } from "@/components/guest-avatar"
import { PlatformIcon } from "@/components/platform-icon"
import { corDaCasa } from "@/lib/colors"
import { calcularNoites, formatBRL, formatDate } from "@/lib/format"
import { PLATFORM_BADGE, PLATFORM_COLOR } from "@/lib/platform"
import { cn } from "@/lib/utils"
import type { Casa, Reserva } from "@/types"

const DOWS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]

interface CalendarViewProps {
  casas: Casa[]
  reservasCasa: Reserva[]
  modoTodasCasas: boolean
  mesAtual: Date
  onEditReserva: (id: number) => void
}

interface ReservaPopoverContentProps {
  reserva: Reserva
  nomeCasa: string
  casas: Casa[]
  onEdit: () => void
}

function ReservaPopoverContent({ reserva, nomeCasa, casas, onEdit }: ReservaPopoverContentProps) {
  const noites = calcularNoites(reserva.checkin, reserva.checkout)
  const statusLabel =
    { confirmada: "Confirmada", aguardando_pagamento: "Aguardando Pagamento", cancelada: "Cancelada" }[
      reserva.status || "confirmada"
    ] || reserva.status

  return (
    <div className="w-64 space-y-2.5">
      <Badge variant="outline" className={cn("gap-1.5", PLATFORM_BADGE[reserva.plataforma] || PLATFORM_BADGE.Outro)}>
        <PlatformIcon plataforma={reserva.plataforma} size="sm" />
        {reserva.plataforma}
      </Badge>
      <div className="flex items-center gap-2">
        <GuestAvatar nome={reserva.hospede || "?"} casas={casas} casaId={reserva.casa_id} />
        <div className="font-heading text-[15px] font-bold">{reserva.hospede || "(sem nome)"}</div>
      </div>
      <dl className="space-y-1 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <dt>Casa</dt>
          <dd className="font-medium text-foreground">{nomeCasa}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Check-in</dt>
          <dd className="font-mono font-medium text-foreground">{formatDate(reserva.checkin)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Check-out</dt>
          <dd className="font-mono font-medium text-foreground">{formatDate(reserva.checkout)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Noites</dt>
          <dd className="font-mono font-medium tabular-nums text-foreground">{noites}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Status</dt>
          <dd className="font-medium text-foreground">{statusLabel}</dd>
        </div>
      </dl>
      <div className="border-t border-border pt-2 font-mono text-base font-bold tabular-nums text-primary">
        {formatBRL(reserva.valor_total)}
      </div>
      <Button size="sm" className="w-full" onClick={onEdit}>
        <Pencil data-icon="inline-start" />
        Editar Reserva
      </Button>
    </div>
  )
}

export function CalendarView({ casas, reservasCasa, modoTodasCasas, mesAtual, onEditReserva }: CalendarViewProps) {
  const dias = React.useMemo(() => {
    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth()
    const primeiroDia = new Date(ano, mes, 1)
    const inicioGrid = new Date(primeiroDia)
    inicioGrid.setDate(primeiroDia.getDate() - primeiroDia.getDay())
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicioGrid)
      d.setDate(inicioGrid.getDate() + i)
      const ocupantes = reservasCasa.filter((r) => {
        if (r.status === "cancelada") return false
        const ci = new Date(r.checkin)
        const co = new Date(r.checkout)
        return d >= ci && d < co
      })
      return {
        data: d,
        outMonth: d.getMonth() !== mes,
        isToday: d.getTime() === hoje.getTime(),
        ocupantes,
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
                "flex aspect-square flex-col items-center gap-0.5 rounded-lg p-1 text-[11.5px]",
                dia.outMonth ? "text-muted-foreground/40" : "text-foreground",
                dia.isToday && "bg-accent font-bold text-accent-foreground ring-1 ring-primary/40"
              )}
            >
              <span>{dia.data.getDate()}</span>
              <div className="flex w-full flex-1 items-center justify-center px-0.5">
                {modoTodasCasas ? (
                  dia.ocupantes.length > 0 && (
                    <AvatarGroup>
                      {dia.ocupantes.slice(0, 3).map((r) => (
                        <Popover key={r.id}>
                          <PopoverTrigger asChild>
                            <button className="rounded-full transition-transform hover:z-10 hover:scale-110">
                              <GuestAvatar
                                nome={r.hospede || "?"}
                                casas={casas}
                                casaId={r.casa_id}
                                size="sm"
                                className="size-5"
                              />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3" align="center">
                            <ReservaPopoverContent
                              reserva={r}
                              nomeCasa={casas.find((c) => c.id === r.casa_id)?.nome || ""}
                              casas={casas}
                              onEdit={() => onEditReserva(r.id)}
                            />
                          </PopoverContent>
                        </Popover>
                      ))}
                      {dia.ocupantes.length > 3 && (
                        <AvatarGroupCount className="size-5 text-[9px]">+{dia.ocupantes.length - 3}</AvatarGroupCount>
                      )}
                    </AvatarGroup>
                  )
                ) : (
                  dia.ocupantes[0] && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="rounded-full transition-transform hover:scale-110">
                          <GuestAvatar
                            nome={dia.ocupantes[0].hospede || "?"}
                            casas={casas}
                            casaId={dia.ocupantes[0].casa_id}
                            cor={PLATFORM_COLOR[dia.ocupantes[0].plataforma] || PLATFORM_COLOR.Outro}
                            size="sm"
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="center">
                        <ReservaPopoverContent
                          reserva={dia.ocupantes[0]}
                          nomeCasa={casas.find((c) => c.id === dia.ocupantes[0].casa_id)?.nome || ""}
                          casas={casas}
                          onEdit={() => onEditReserva(dia.ocupantes[0].id)}
                        />
                      </PopoverContent>
                    </Popover>
                  )
                )}
              </div>
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
