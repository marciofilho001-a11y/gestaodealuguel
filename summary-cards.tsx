import * as React from "react"
import { Area, AreaChart } from "recharts"

import { Card } from "@/components/ui/card"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Reserva } from "@/types"

interface SummaryCardsProps {
  reservasCasa: Reserva[]
  mesAtual: Date
}

function MesSparkline({ pontos }: { pontos: { dia: number; valor: number }[] }) {
  if (!pontos.some((p) => p.valor > 0)) return null
  return (
    <div className="-mx-1 mt-1 h-10 w-[calc(100%+0.5rem)] opacity-90">
      <AreaChart width={220} height={40} data={pontos} margin={{ top: 2, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--background)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--background)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="valor"
          stroke="var(--background)"
          strokeWidth={1.5}
          fill="url(#sparkFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  hero,
  sparkline,
  index = 0,
}: {
  label: string
  value: string
  sub: string
  hero?: boolean
  sparkline?: { dia: number; valor: number }[]
  index?: number
}) {
  return (
    <Card
      className={cn(
        "animate-stagger-in min-w-0 gap-1 overflow-hidden rounded-xl border p-4",
        hero ? "border-foreground bg-foreground text-background" : "bg-card"
      )}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className={cn("truncate text-xs font-medium", hero ? "text-background/65" : "text-muted-foreground")}>
        {label}
      </div>
      <div
        className={cn(
          "truncate font-heading text-xl font-bold tracking-tight tabular-nums sm:text-2xl",
          hero && "font-display text-2xl font-semibold tracking-wide tabular-nums sm:text-3xl"
        )}
      >
        {value}
      </div>
      <div className={cn("truncate text-[11px]", hero ? "text-background/55" : "text-muted-foreground/80")}>{sub}</div>
      {sparkline && <MesSparkline pontos={sparkline} />}
    </Card>
  )
}

export function SummaryCards({ reservasCasa, mesAtual }: SummaryCardsProps) {
  const metrics = React.useMemo(() => {
    const inicioMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
    const fimMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0)
    const hoje = new Date()
    const inicioSemana = new Date(hoje)
    inicioSemana.setDate(hoje.getDate() - hoje.getDay())
    const fimSemana = new Date(inicioSemana)
    fimSemana.setDate(inicioSemana.getDate() + 6)

    function overlap(r: Reserva, ini: Date, fim: Date) {
      const ci = new Date(r.checkin)
      const co = new Date(r.checkout)
      return ci <= fim && co >= ini
    }

    const ativas = reservasCasa.filter((r) => r.status !== "cancelada")
    const doMes = ativas.filter((r) => overlap(r, inicioMes, fimMes))
    const daSemana = ativas.filter((r) => overlap(r, inicioSemana, fimSemana))

    const totalMes = doMes.reduce((s, r) => s + (Number(r.valor_total) || 0), 0)
    const totalSemana = daSemana.reduce((s, r) => s + (Number(r.valor_total) || 0), 0)
    const somaDescontos = doMes.reduce((s, r) => s + (Number(r.desconto) || 0), 0)
    const somaLimpeza = doMes.reduce((s, r) => s + (Number(r.taxa_limpeza) || 0), 0)
    const somaComissao = doMes.reduce((s, r) => s + (Number(r.comissao_plataforma) || 0), 0)
    const receitaLiquida = totalMes - somaComissao
    const mediaDiaria = doMes.length ? doMes.reduce((s, r) => s + (Number(r.valor_diaria) || 0), 0) / doMes.length : 0

    // Receita por noite ocupada, dia a dia do mês — vira o sparkline do card hero
    const diasNoMes = fimMes.getDate()
    const sparkline = Array.from({ length: diasNoMes }, (_, i) => {
      const dia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), i + 1)
      const valor = doMes.reduce((s, r) => {
        const ci = new Date(r.checkin)
        const co = new Date(r.checkout)
        return dia >= ci && dia < co ? s + (Number(r.valor_diaria) || 0) : s
      }, 0)
      return { dia: i + 1, valor }
    })

    return {
      totalMes,
      totalSemana,
      somaDescontos,
      somaLimpeza,
      somaComissao,
      receitaLiquida,
      mediaDiaria,
      doMes,
      sparkline,
    }
  }, [reservasCasa, mesAtual])

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      <SummaryCard
        hero
        index={0}
        label="Total do Mês"
        value={formatBRL(metrics.totalMes)}
        sub={`${metrics.doMes.length} reserva(s) no período`}
        sparkline={metrics.sparkline}
      />
      <SummaryCard index={1} label="Receita Líquida" value={formatBRL(metrics.receitaLiquida)} sub="mês menos comissão" />
      <SummaryCard index={2} label="Total da Semana" value={formatBRL(metrics.totalSemana)} sub="semana atual" />
      <SummaryCard index={3} label="Diária Média" value={formatBRL(metrics.mediaDiaria)} sub="média do mês" />
      <SummaryCard index={4} label="Taxas de Limpeza" value={formatBRL(metrics.somaLimpeza)} sub="total no mês" />
      <SummaryCard index={5} label="Descontos" value={formatBRL(metrics.somaDescontos)} sub="total no mês" />
      <SummaryCard index={6} label="Comissão Plataforma" value={formatBRL(metrics.somaComissao)} sub="retido pela plataforma" />
    </div>
  )
}
