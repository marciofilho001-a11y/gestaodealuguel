import { ListFilter } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { PlatformIcon } from "@/components/platform-icon"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Casa, Reserva } from "@/types"

interface ReservasDrilldownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  reservas: Reserva[]
  casas: Casa[]
  mostrarCasa: boolean
  /** Quando o detalhamento é de uma plataforma específica, tinge o modal com
   * a cor dela (só cor — nunca reproduz a logo/marca de terceiros) */
  plataforma?: string
}

const th = "h-auto px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
const td = "px-4 py-3 text-sm"

const TEMA_PLATAFORMA: Record<string, { headerBg: string; totalBg: string; text: string; border: string }> = {
  Airbnb: { headerBg: "bg-airbnb-soft/70", totalBg: "bg-airbnb-soft/50", text: "text-airbnb", border: "border-airbnb/25" },
  Booking: {
    headerBg: "bg-booking-soft/70",
    totalBg: "bg-booking-soft/50",
    text: "text-booking",
    border: "border-booking/25",
  },
}

// Mostra exatamente quais reservas formaram um valor agregado (bruto,
// comissão, comissão Marcio...) que apareceu num card, numa linha "por
// plataforma" ou numa barra do gráfico — pra nunca deixar um número vago.
// Em telas pequenas, vira uma lista de cards em vez de tabela com scroll
// horizontal.
export function ReservasDrilldownDialog({
  open,
  onOpenChange,
  titulo,
  reservas,
  casas,
  mostrarCasa,
  plataforma,
}: ReservasDrilldownDialogProps) {
  const tema = plataforma ? TEMA_PLATAFORMA[plataforma] : undefined
  const ordenadas = [...reservas].sort((a, b) => a.checkin.localeCompare(b.checkin))
  const totais = ordenadas.reduce(
    (acc, r) => ({
      bruto: acc.bruto + (Number(r.valor_total) || 0),
      comissao: acc.comissao + (Number(r.comissao_plataforma) || 0),
      marcio: acc.marcio + (Number(r.comissao_marcio) || 0),
    }),
    { bruto: 0, comissao: 0, marcio: 0 }
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {plataforma ? (
              <PlatformIcon plataforma={plataforma} />
            ) : (
              <ListFilter className={cn("size-4.5", tema?.text || "text-primary")} />
            )}
            {titulo}
          </DialogTitle>
          <DialogDescription>
            {ordenadas.length} reserva{ordenadas.length === 1 ? "" : "s"} formam esse valor.
          </DialogDescription>
        </DialogHeader>

        {ordenadas.length === 0 ? (
          <Empty className="py-8">
            <EmptyMedia variant="icon">
              <ListFilter />
            </EmptyMedia>
            <EmptyTitle className="text-sm">Nenhuma reserva encontrada</EmptyTitle>
            <EmptyDescription>Não há reservas nesse recorte.</EmptyDescription>
          </Empty>
        ) : (
          <>
            {/* Desktop / tablet: tabela de verdade, sem scroll horizontal (modal já é larga o bastante) */}
            <div className={cn("hidden max-h-[60vh] overflow-y-auto rounded-lg border sm:block", tema?.border || "border-border")}>
              <Table>
                <TableHeader>
                  <TableRow className={tema?.headerBg}>
                    {mostrarCasa && <TableHead className={th}>Casa</TableHead>}
                    <TableHead className={th}>Hóspede</TableHead>
                    <TableHead className={th}>Check-in</TableHead>
                    <TableHead className={th}>Check-out</TableHead>
                    <TableHead className={cn(th, "text-right")}>Total</TableHead>
                    <TableHead className={cn(th, "text-right")}>Comissão Plataf.</TableHead>
                    <TableHead className={cn(th, "text-right")}>Comissão Marcio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenadas.map((r) => (
                    <TableRow key={r.id}>
                      {mostrarCasa && (
                        <TableCell className={cn(td, "font-medium")}>
                          {casas.find((c) => c.id === r.casa_id)?.nome || "(casa removida)"}
                        </TableCell>
                      )}
                      <TableCell className={td}>{r.hospede || "(sem nome)"}</TableCell>
                      <TableCell className={cn(td, "font-mono text-xs")}>{formatDate(r.checkin)}</TableCell>
                      <TableCell className={cn(td, "font-mono text-xs")}>{formatDate(r.checkout)}</TableCell>
                      <TableCell className={cn(td, "text-right font-mono tabular-nums")}>{formatBRL(r.valor_total)}</TableCell>
                      <TableCell className={cn(td, "text-right font-mono tabular-nums")}>
                        {formatBRL(r.comissao_plataforma)}
                      </TableCell>
                      <TableCell className={cn(td, "text-right font-mono tabular-nums")}>{formatBRL(r.comissao_marcio)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className={tema?.totalBg}>
                    <TableCell colSpan={mostrarCasa ? 4 : 3} className={cn(td, "font-bold")}>
                      Total
                    </TableCell>
                    <TableCell className={cn(td, "text-right font-mono font-bold tabular-nums")}>{formatBRL(totais.bruto)}</TableCell>
                    <TableCell className={cn(td, "text-right font-mono font-bold tabular-nums")}>
                      {formatBRL(totais.comissao)}
                    </TableCell>
                    <TableCell className={cn(td, "text-right font-mono font-bold tabular-nums")}>{formatBRL(totais.marcio)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Mobile: cards empilhados — mais fácil de ler que tabela com scroll horizontal */}
            <div className="max-h-[60vh] space-y-2 overflow-y-auto sm:hidden">
              {ordenadas.map((r) => (
                <div key={r.id} className={cn("rounded-lg border p-3", tema?.border || "border-border")}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{r.hospede || "(sem nome)"}</div>
                      {mostrarCasa && (
                        <div className="text-xs text-muted-foreground">
                          {casas.find((c) => c.id === r.casa_id)?.nome || "(casa removida)"}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 font-mono text-xs text-muted-foreground">
                      {formatDate(r.checkin)} – {formatDate(r.checkout)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-border pt-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Total</div>
                      <div className="font-mono font-semibold tabular-nums">{formatBRL(r.valor_total)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Comissão</div>
                      <div className="font-mono tabular-nums">{formatBRL(r.comissao_plataforma)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Marcio</div>
                      <div className="font-mono tabular-nums">{formatBRL(r.comissao_marcio)}</div>
                    </div>
                  </div>
                </div>
              ))}

              <div className={cn("rounded-lg p-3", tema?.totalBg || "bg-muted/50")}>
                <div className="mb-2 text-sm font-bold">Total</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Total</div>
                    <div className="font-mono font-bold tabular-nums">{formatBRL(totais.bruto)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Comissão</div>
                    <div className="font-mono font-bold tabular-nums">{formatBRL(totais.comissao)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Marcio</div>
                    <div className="font-mono font-bold tabular-nums">{formatBRL(totais.marcio)}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
