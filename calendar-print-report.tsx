/* eslint-disable react-refresh/only-export-components */
// "Acabamento" do relatório impresso do calendário — cabeçalho com título/
// data de geração, resumo gerencial (4 números), legenda das cores e o
// fechamento com o resumo do mês. Nada daqui aparece na tela: todo mundo
// usa `hidden ... print:block` (ou `print:flex`/`print:grid`), então esses
// componentes só ganham vida quando a página é impressa — ver MonthSection
// em calendar-view.tsx, que é quem decide qual mês recebe esse chrome.

import { corDaCasa } from "@/lib/colors"
import { formatBRL, valorBrutoEfetivo } from "@/lib/format"
import { PLATFORM_COLOR } from "@/lib/platform"
import type { Casa, Reserva } from "@/types"

export interface PrintReportStats {
  totalReservas: number
  /** Dias do mês com pelo menos uma reserva ativa cobrindo a data — não é
   *  soma de noites por reserva (uma reserva não pode "dobrar" um dia). */
  diasOcupados: number
  receita: number
  taxaOcupacao: number
  mediaPorReserva: number
}

// Mesma lógica de "overlap" que os cards de resumo da tela usam (ver
// summary-cards.tsx) — reserva conta pro mês se o período dela cruza o mês,
// não só se o check-in cai dentro dele. Mantém os dois relatórios (tela e
// papel) batendo com o mesmo número.
export function calcularEstatisticasImpressao(mes: Date, reservasCasa: Reserva[]): PrintReportStats {
  const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1)
  const fimMesExclusivo = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()

  const ativas = reservasCasa.filter((r) => r.status !== "cancelada")
  const doMes = ativas.filter((r) => {
    const ci = new Date(r.checkin + "T00:00:00")
    const co = new Date(r.checkout + "T00:00:00")
    return ci < fimMesExclusivo && co > inicioMes
  })

  let diasOcupados = 0
  for (let i = 0; i < diasNoMes; i++) {
    const dia = new Date(mes.getFullYear(), mes.getMonth(), i + 1)
    const ocupado = doMes.some((r) => {
      const ci = new Date(r.checkin + "T00:00:00")
      const co = new Date(r.checkout + "T00:00:00")
      return dia >= ci && dia < co
    })
    if (ocupado) diasOcupados++
  }

  const receita = doMes.reduce((s, r) => s + valorBrutoEfetivo(r), 0)

  return {
    totalReservas: doMes.length,
    diasOcupados,
    receita,
    taxaOcupacao: diasNoMes ? diasOcupados / diasNoMes : 0,
    mediaPorReserva: doMes.length ? receita / doMes.length : 0,
  }
}

interface PrintReportHeaderProps {
  mes: Date
  nomeUnidade: string
}

export function PrintReportHeader({ mes, nomeUnidade }: PrintReportHeaderProps) {
  const nomeMes = mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  const geradoEm = new Date().toLocaleDateString("pt-BR")

  return (
    <div className="hidden print:block print:shrink-0">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-none font-bold tracking-tight text-foreground capitalize">
            {nomeMes}
          </h1>
          <p className="mt-1 text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Relatório de Reservas — Gestão de Aluguel
          </p>
        </div>
        <div className="shrink-0 text-right text-[8px] leading-relaxed text-muted-foreground">
          <div>Gerado em: {geradoEm}</div>
          <div>Unidade: {nomeUnidade}</div>
        </div>
      </div>
      <div className="mt-1.5 h-px w-full bg-border" />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-md border border-border px-2.5 py-1.5">
      <div className="truncate text-[7px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-0.5 truncate font-mono text-[13px] font-bold tabular-nums text-foreground">{value}</div>
    </div>
  )
}

export function PrintReportSummary({ stats }: { stats: PrintReportStats }) {
  return (
    <div className="mt-2 hidden grid-cols-4 gap-2 print:grid print:shrink-0">
      <StatCard label="Reservas" value={String(stats.totalReservas)} />
      <StatCard label="Dias ocupados" value={`${stats.diasOcupados} dias`} />
      <StatCard label="Receita" value={formatBRL(stats.receita)} />
      <StatCard label="Taxa de ocupação" value={`${Math.round(stats.taxaOcupacao * 100)}%`} />
    </div>
  )
}

interface PrintReportLegendProps {
  modoTodasCasas: boolean
  casas: Casa[]
}

export function PrintReportLegend({ modoTodasCasas, casas }: PrintReportLegendProps) {
  return (
    <div className="mt-1.5 hidden shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-1.5 print:flex">
      <span className="text-[7px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Legenda</span>
      {modoTodasCasas
        ? casas.map((c) => (
            <span key={c.id} className="flex items-center gap-1 text-[7px] text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ background: corDaCasa(casas, c.id) }} />
              {c.nome}
            </span>
          ))
        : (["Airbnb", "Booking", "Outro"] as const).map((p) => (
            <span key={p} className="flex items-center gap-1 text-[7px] text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ background: PLATFORM_COLOR[p] }} />
              {p}
            </span>
          ))}
      <span className="flex items-center gap-1 text-[7px] text-muted-foreground">
        <span aria-hidden="true" className="leading-none text-destructive/70">
          ←
        </span>
        Saída (check-out)
      </span>
    </div>
  )
}

export function PrintReportFooter({ stats }: { stats: PrintReportStats }) {
  return (
    <div className="mt-1.5 hidden shrink-0 border-t border-border pt-1.5 print:block">
      <div className="text-[8px] font-bold tracking-[0.1em] text-foreground uppercase">Resumo do mês</div>
      <div className="mt-1 grid grid-cols-4 gap-x-4 text-[8px] text-muted-foreground">
        <div>
          Total de reservas: <span className="font-semibold text-foreground">{stats.totalReservas}</span>
        </div>
        <div>
          Total de diárias: <span className="font-semibold text-foreground">{stats.diasOcupados}</span>
        </div>
        <div>
          Receita prevista: <span className="font-semibold text-foreground">{formatBRL(stats.receita)}</span>
        </div>
        <div>
          Média por reserva: <span className="font-semibold text-foreground">{formatBRL(stats.mediaPorReserva)}</span>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[7px] text-muted-foreground/70">
        <span>Relatório gerado automaticamente</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  )
}
