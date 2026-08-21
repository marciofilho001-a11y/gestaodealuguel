import { Ban, CalendarDays, CalendarMinus, CalendarPlus, Eye, Home, Moon, Pencil, Wallet, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GuestAvatar } from "@/components/guest-avatar"
import { useConfirm } from "@/hooks/use-confirm"
import { calcularNoites, formatBRL, formatDate } from "@/lib/format"
import { STATUS_BADGE, STATUS_LABEL } from "@/lib/platform"
import type { Casa, Reserva, StatusReserva } from "@/types"

interface ReservaSelecionadaPanelProps {
  reserva: Reserva
  casas: Casa[]
  onEdit: () => void
  onVerDetalhes: () => void
  onCancelar: (id: number) => void
  onFechar: () => void
}

export function ReservaSelecionadaPanel({
  reserva,
  casas,
  onEdit,
  onVerDetalhes,
  onCancelar,
  onFechar,
}: ReservaSelecionadaPanelProps) {
  const confirm = useConfirm()
  const nomeCasa = casas.find((c) => c.id === reserva.casa_id)?.nome || "(removida)"
  const noites = calcularNoites(reserva.checkin, reserva.checkout)
  const status = (reserva.status as StatusReserva) || "confirmada"
  const jaCancelada = status === "cancelada"

  async function handleCancelar() {
    const ok = await confirm({
      title: "Cancelar esta reserva?",
      description: `${reserva.hospede || "Reserva sem nome"} · ${formatDate(reserva.checkin)} – ${formatDate(reserva.checkout)}`,
      confirmLabel: "Cancelar reserva",
      destructive: true,
    })
    if (ok) onCancelar(reserva.id)
  }

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarDays className="size-4 text-primary" />
          Reserva selecionada
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-6 text-muted-foreground"
            onClick={onFechar}
          >
            <X className="size-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <GuestAvatar
            nome={reserva.hospede || "?"}
            casas={casas}
            casaId={reserva.casa_id}
            size="lg"
            className="ring-2 ring-primary/25"
          />
          <div className="font-heading text-[15px] font-bold">{reserva.hospede || "(sem nome)"}</div>
          <Badge variant="outline" className={STATUS_BADGE[status]}>
            {STATUS_LABEL[status]}
          </Badge>
        </div>

        <dl className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <dt className="flex items-center gap-1.5">
              <Home className="size-3.5" /> Casa
            </dt>
            <dd className="font-medium text-foreground">{nomeCasa}</dd>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <dt className="flex items-center gap-1.5">
              <CalendarPlus className="size-3.5" /> Check-in
            </dt>
            <dd className="font-mono font-medium text-foreground">{formatDate(reserva.checkin)}</dd>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <dt className="flex items-center gap-1.5">
              <CalendarMinus className="size-3.5" /> Check-out
            </dt>
            <dd className="font-mono font-medium text-foreground">{formatDate(reserva.checkout)}</dd>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <dt className="flex items-center gap-1.5">
              <Moon className="size-3.5" /> Noites
            </dt>
            <dd className="font-mono font-medium tabular-nums text-foreground">{noites}</dd>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <dt className="flex items-center gap-1.5">
              <Wallet className="size-3.5" /> Valor total
            </dt>
            <dd className="font-mono text-sm font-bold tabular-nums text-primary">{formatBRL(reserva.valor_total)}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <span className="mb-0.5 text-[11px] font-semibold text-muted-foreground">Ações</span>
          <Button size="sm" className="w-full justify-start" onClick={onEdit}>
            <Pencil data-icon="inline-start" />
            Editar Reserva
          </Button>
          <Button size="sm" variant="outline" className="w-full justify-start" onClick={onVerDetalhes}>
            <Eye data-icon="inline-start" />
            Ver Detalhes
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={jaCancelada}
            className="w-full justify-start"
            onClick={handleCancelar}
          >
            <Ban data-icon="inline-start" />
            {jaCancelada ? "Já cancelada" : "Cancelar Reserva"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
