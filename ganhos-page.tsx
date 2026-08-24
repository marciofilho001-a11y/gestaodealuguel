import * as React from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ArrowLeft, UserRound, Wallet } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { PlatformIcon } from "@/components/platform-icon"
import { ReservasDrilldownDialog } from "@/components/reservas-drilldown-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatBRL, primeiroDiaMes, ultimoDiaMes } from "@/lib/format"
import { PLATFORM_BADGE } from "@/lib/platform"
import { cn } from "@/lib/utils"
import type { CasaSelecionada } from "@/hooks/use-aluguel-data"
import type { Casa, Reserva } from "@/types"

interface GanhosPageProps {
  casas: Casa[]
  reservas: Reserva[]
  casaAtualId: CasaSelecionada
}

const todasValue = "__todas__"

// Espaçamento generoso pras tabelas do Setor de Ganhos — mesmo padrão já
// usado no drilldown de reservas (px-4 py-3), em vez do p-2 compacto padrão
// do componente Table genérico.
const th = "px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
const td = "px-4 py-3"

function GanhosCard({ label, value, hero, index }: { label: string; value: string; hero?: boolean; index: number }) {
  return (
    <Card
      className="animate-stagger-in min-w-0 gap-1 overflow-hidden rounded-xl border p-4 data-[hero=true]:border-foreground data-[hero=true]:bg-foreground data-[hero=true]:text-background"
      data-hero={hero}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="truncate text-xs font-medium text-muted-foreground group-data-[hero=true]/card:text-background/65">
        {label}
      </div>
      <div
        className={
          hero
            ? "truncate font-display text-2xl font-semibold tracking-wide tabular-nums sm:text-3xl"
            : "truncate font-heading text-xl font-bold tracking-tight tabular-nums sm:text-2xl"
        }
      >
        {value}
      </div>
    </Card>
  )
}

// Paleta fixa (não segue os tokens --chart-N do tema) — série de dados tem
// cor própria por convenção, igual em claro e escuro, em vez de herdar as
// cores genéricas de gráfico do tema (que incluíam um rosa saturado aqui).
const chartConfig = {
  bruto: { label: "Bruto", color: "#6366f1" }, // índigo
  liquido: { label: "Líquido", color: "#10b981" }, // esmeralda
  comissao: { label: "Comissão", color: "#8b5cf6" }, // violeta
} satisfies ChartConfig

const marcioChartConfig = {
  comissaoMarcio: { label: "Comissão Marcio Filho", color: "#a78bfa" }, // violeta suave
} satisfies ChartConfig

// "R$ 200" abaixo de mil (evita vários ticks repetindo "R$0k" quando os
// valores são pequenos, como na comissão do Marcio); "R$3k" a partir daí.
function formatEixoY(v: number): string {
  const abs = Math.round(Math.abs(v))
  return abs < 1000 ? `R$ ${abs}` : `R$${Math.round(v / 1000)}k`
}

interface ChartTooltipBRLPayloadItem {
  value?: number | string
  color?: string
  dataKey?: string | number
}

// Tooltip flutuante translúcido — deliberadamente mais escuro/opaco que o
// resto do card mesmo no tema claro (padrão comum em dashboards, dá
// contraste extra sobre a área do gráfico), mas com uma variante clara
// pro tema claro pra não ficar ilegível lá.
function ChartTooltipBRL({
  active,
  payload,
  label,
  config,
}: {
  active?: boolean
  payload?: ChartTooltipBRLPayloadItem[]
  label?: string
  config: ChartConfig
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 text-xs font-medium text-zinc-900 shadow-lg dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-100">
      {label && <div className="mb-1.5 font-medium">{label}</div>}
      <div className="grid gap-1.5">
        {payload.map((item, i) => {
          const key = String(item.dataKey ?? "")
          const itemLabel = config[key]?.label ?? key
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="text-muted-foreground dark:text-zinc-400">{itemLabel}</span>
              <span className="ml-auto pl-3 font-mono font-semibold tabular-nums">
                {formatBRL(Number(item.value))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function GanhosPage({ casas, reservas, casaAtualId }: GanhosPageProps) {
  const [casaFiltro, setCasaFiltro] = React.useState(() => (typeof casaAtualId === "number" ? String(casaAtualId) : todasValue))
  const [de, setDe] = React.useState(() => primeiroDiaMes(new Date()))
  const [ate, setAte] = React.useState(() => ultimoDiaMes(new Date()))

  function atalhoMesAtual() {
    const hoje = new Date()
    setDe(primeiroDiaMes(hoje))
    setAte(ultimoDiaMes(hoje))
  }

  function atalhoAnoAtual() {
    const hoje = new Date()
    setDe(new Date(hoje.getFullYear(), 0, 1).toISOString().slice(0, 10))
    setAte(new Date(hoje.getFullYear(), 11, 31).toISOString().slice(0, 10))
  }

  const resultado = React.useMemo(() => {
    let filtradas = reservas.filter((r) => r.status !== "cancelada")
    if (casaFiltro !== todasValue) filtradas = filtradas.filter((r) => r.casa_id === Number(casaFiltro))
    // Overlap: conta a reserva se ela tem QUALQUER noite dentro do período escolhido
    if (de) filtradas = filtradas.filter((r) => r.checkout > de)
    if (ate) filtradas = filtradas.filter((r) => r.checkin <= ate)

    const valorBruto = filtradas.reduce((s, r) => s + (Number(r.valor_total) || 0), 0)
    const comissaoTotal = filtradas.reduce((s, r) => s + (Number(r.comissao_plataforma) || 0), 0)
    const comissaoMarcioTotal = filtradas.reduce((s, r) => s + (Number(r.comissao_marcio) || 0), 0)
    const descontoTotal = filtradas.reduce((s, r) => s + (Number(r.desconto) || 0), 0)
    const limpezaTotal = filtradas.reduce((s, r) => s + (Number(r.taxa_limpeza) || 0), 0)
    const valorLiquido = valorBruto - comissaoTotal - comissaoMarcioTotal
    const totalReservas = filtradas.length

    const porPlataforma: Record<string, { bruto: number; comissao: number; comissaoMarcio: number; qtd: number }> = {}
    filtradas.forEach((r) => {
      const p = r.plataforma || "Outro"
      if (!porPlataforma[p]) porPlataforma[p] = { bruto: 0, comissao: 0, comissaoMarcio: 0, qtd: 0 }
      porPlataforma[p].bruto += Number(r.valor_total) || 0
      porPlataforma[p].comissao += Number(r.comissao_plataforma) || 0
      porPlataforma[p].comissaoMarcio += Number(r.comissao_marcio) || 0
      porPlataforma[p].qtd += 1
    })

    let porCasa: Array<{
      id: number
      nome: string
      bruto: number
      liquido: number
      comissao: number
      comissaoMarcio: number
      qtd: number
    }> = []
    if (casaFiltro === todasValue) {
      const acumulado: Record<number, { bruto: number; comissao: number; comissaoMarcio: number; qtd: number }> = {}
      filtradas.forEach((r) => {
        const cid = r.casa_id ?? 0
        if (!acumulado[cid]) acumulado[cid] = { bruto: 0, comissao: 0, comissaoMarcio: 0, qtd: 0 }
        acumulado[cid].bruto += Number(r.valor_total) || 0
        acumulado[cid].comissao += Number(r.comissao_plataforma) || 0
        acumulado[cid].comissaoMarcio += Number(r.comissao_marcio) || 0
        acumulado[cid].qtd += 1
      })
      porCasa = Object.entries(acumulado)
        .map(([cid, v]) => ({
          id: Number(cid),
          nome: casas.find((c) => c.id === Number(cid))?.nome || "(casa removida)",
          bruto: v.bruto,
          liquido: v.bruto - v.comissao - v.comissaoMarcio,
          comissao: v.comissao,
          comissaoMarcio: v.comissaoMarcio,
          qtd: v.qtd,
        }))
        .sort((a, b) => b.bruto - a.bruto)
    }

    return {
      filtradas,
      valorBruto,
      comissaoTotal,
      comissaoMarcioTotal,
      descontoTotal,
      limpezaTotal,
      valorLiquido,
      totalReservas,
      porPlataforma,
      porCasa,
    }
  }, [reservas, casaFiltro, de, ate, casas])

  const nomeCasa = casaFiltro === todasValue ? "Todas as casas" : casas.find((c) => c.id === Number(casaFiltro))?.nome

  // Ordenado decrescente por bruto (regra da própria base de UX: sempre ordenar
  // por magnitude quando o insight principal é comparação/ranking)
  const chartData = React.useMemo(() => {
    const base = resultado.porCasa.length
      ? resultado.porCasa.map((c) => ({ nome: c.nome, bruto: c.bruto, liquido: c.liquido, comissao: c.comissao }))
      : Object.entries(resultado.porPlataforma).map(([plataforma, v]) => ({
          nome: plataforma,
          bruto: v.bruto,
          liquido: v.bruto - v.comissao - v.comissaoMarcio,
          comissao: v.comissao,
        }))
    return [...base].sort((a, b) => b.bruto - a.bruto)
  }, [resultado])

  // Panorama dedicado da Comissão Marcio Filho — mesma lógica do gráfico
  // principal (por casa quando "todas as casas", por plataforma quando uma
  // casa específica está selecionada), sempre respeitando os filtros do topo
  const marcioChartData = React.useMemo(() => {
    const base = resultado.porCasa.length
      ? resultado.porCasa.map((c) => ({ nome: c.nome, comissaoMarcio: c.comissaoMarcio, casaId: c.id }))
      : Object.entries(resultado.porPlataforma).map(([plataforma, v]) => ({
          nome: plataforma,
          comissaoMarcio: v.comissaoMarcio,
          plataforma,
        }))
    return [...base].sort((a, b) => b.comissaoMarcio - a.comissaoMarcio)
  }, [resultado])

  const [drilldown, setDrilldown] = React.useState<{
    titulo: string
    reservas: Reserva[]
    mostrarCasa: boolean
    plataforma?: string
  } | null>(null)

  function abrirDrilldownCasa(casaId: number, nome: string) {
    setDrilldown({
      titulo: nome,
      reservas: resultado.filtradas.filter((r) => r.casa_id === casaId),
      mostrarCasa: false,
    })
  }

  function abrirDrilldownPlataforma(plataforma: string) {
    setDrilldown({
      titulo: plataforma,
      reservas: resultado.filtradas.filter((r) => (r.plataforma || "Outro") === plataforma),
      mostrarCasa: casaFiltro === todasValue,
      plataforma,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-wide">
          <Wallet className="size-5 text-primary" /> Setor de Ganhos
        </h1>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 px-4 py-4 sm:px-6">
          <Field className="w-48">
            <FieldLabel className="text-[11px]">Casa</FieldLabel>
            <Select value={casaFiltro} onValueChange={setCasaFiltro}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={todasValue}>Todas as casas (combinado)</SelectItem>
                {casas.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="w-40">
            <FieldLabel className="text-[11px]">Período de</FieldLabel>
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="border-input bg-background flex h-8 w-full rounded-md border px-2.5 font-mono text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </Field>
          <Field className="w-40">
            <FieldLabel className="text-[11px]">Até</FieldLabel>
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="border-input bg-background flex h-8 w-full rounded-md border px-2.5 font-mono text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </Field>
          <Button variant="outline" size="sm" onClick={atalhoMesAtual}>
            Mês Atual
          </Button>
          <Button variant="outline" size="sm" onClick={atalhoAnoAtual}>
            Ano Atual
          </Button>
        </CardContent>
      </Card>

      {resultado.totalReservas === 0 ? (
        <Card>
          <CardContent>
            <Empty className="py-10">
              <EmptyMedia variant="icon">
                <Wallet />
              </EmptyMedia>
              <EmptyTitle>Nenhuma reserva encontrada</EmptyTitle>
              <EmptyDescription>
                Não há reservas em <b>{nomeCasa}</b> nesse período.
              </EmptyDescription>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <GanhosCard hero index={0} label="Valor Bruto" value={formatBRL(resultado.valorBruto)} />
            <GanhosCard index={1} label="Valor Líquido" value={formatBRL(resultado.valorLiquido)} />
            <GanhosCard index={2} label="Comissão Plataforma" value={formatBRL(resultado.comissaoTotal)} />
            <GanhosCard index={3} label="Comissão Marcio Filho" value={formatBRL(resultado.comissaoMarcioTotal)} />
            <GanhosCard index={4} label="Total Reservas" value={String(resultado.totalReservas)} />
            <GanhosCard index={5} label="Taxas Limpeza" value={formatBRL(resultado.limpezaTotal)} />
            <GanhosCard index={6} label="Descontos" value={formatBRL(resultado.descontoTotal)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Bruto, líquido e comissão — {resultado.porCasa.length ? "por casa" : "por plataforma"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[420px] w-full">
                <BarChart data={chartData} margin={{ top: 24, left: -12, right: 12 }} barCategoryGap="18%" barGap={4}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="nome" tickLine={false} axisLine={false} tickMargin={10} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={64} tickFormatter={formatEixoY} />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    content={<ChartTooltipBRL config={chartConfig} />}
                  />
                  <ChartLegend content={<ChartLegendContent indicatorClassName="size-2.5 rounded-full" />} />
                  <Bar dataKey="bruto" fill="var(--color-bruto)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="liquido" fill="var(--color-liquido)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="comissao" fill="var(--color-comissao)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
            {resultado.porCasa.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Por casa</CardTitle>
                  <p className="text-[11px] text-muted-foreground/70">Clique numa linha pra ver as reservas.</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className={th}>Casa</TableHead>
                          <TableHead className={cn(th, "text-right")}>Reservas</TableHead>
                          <TableHead className={cn(th, "text-right")}>Bruto</TableHead>
                          <TableHead className={cn(th, "text-right")}>Líquido</TableHead>
                          <TableHead className={cn(th, "text-right")}>Comissão</TableHead>
                          <TableHead className={cn(th, "text-right")}>Marcio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultado.porCasa.map((c) => (
                          <TableRow
                            key={c.id}
                            className="cursor-pointer hover:bg-accent/60"
                            onClick={() => abrirDrilldownCasa(c.id, c.nome)}
                          >
                            <TableCell className={cn(td, "font-medium")}>{c.nome}</TableCell>
                            <TableCell className={cn(td, "text-right font-mono tabular-nums")}>{c.qtd}</TableCell>
                            <TableCell className={cn(td, "text-right font-mono font-semibold tabular-nums")}>
                              {formatBRL(c.bruto)}
                            </TableCell>
                            <TableCell className={cn(td, "text-right font-mono font-semibold tabular-nums")}>
                              {formatBRL(c.liquido)}
                            </TableCell>
                            <TableCell className={cn(td, "text-right font-mono tabular-nums text-muted-foreground")}>
                              {formatBRL(c.comissao)}
                            </TableCell>
                            <TableCell className={cn(td, "text-right font-mono tabular-nums text-muted-foreground")}>
                              {formatBRL(c.comissaoMarcio)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Por plataforma</CardTitle>
                <p className="text-[11px] text-muted-foreground/70">Clique numa linha pra ver as reservas.</p>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {Object.entries(resultado.porPlataforma).map(([plat, v]) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => abrirDrilldownPlataforma(plat)}
                    className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-left text-xs transition-colors hover:bg-accent/60 dark:border-zinc-800"
                  >
                    <Badge variant="outline" className={cn("gap-1.5", PLATFORM_BADGE[plat] || PLATFORM_BADGE.Outro)}>
                      <PlatformIcon plataforma={plat} size="sm" />
                      {plat}
                    </Badge>
                    <span className="text-muted-foreground">{v.qtd} reserva(s)</span>
                    <span className="ml-auto font-mono font-semibold tabular-nums">{formatBRL(v.bruto)}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">− {formatBRL(v.comissao)} comissão</span>
                    <span className="font-mono tabular-nums text-muted-foreground">− {formatBRL(v.comissaoMarcio)} Marcio</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                <UserRound className="size-3.5" />
                Comissão Marcio Filho — panorama {resultado.porCasa.length ? "por casa" : "por plataforma"}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground/70">Clique numa barra pra ver quais reservas formaram esse valor.</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={marcioChartConfig} className="h-72 w-full">
                <BarChart data={marcioChartData} margin={{ top: 24, left: -12, right: 12 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="nome" tickLine={false} axisLine={false} tickMargin={10} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={64}
                    domain={[0, "dataMax + 100"]}
                    tickFormatter={formatEixoY}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    content={<ChartTooltipBRL config={marcioChartConfig} />}
                  />
                  <Bar
                    dataKey="comissaoMarcio"
                    fill="var(--color-comissaoMarcio)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                    className="cursor-pointer"
                    onClick={(data: { payload?: { nome: string; casaId?: number; plataforma?: string } }) => {
                      const item = data.payload
                      if (!item) return
                      if (item.casaId !== undefined) abrirDrilldownCasa(item.casaId, item.nome)
                      else if (item.plataforma) abrirDrilldownPlataforma(item.plataforma)
                    }}
                  >
                    <LabelList
                      dataKey="comissaoMarcio"
                      position="top"
                      fontSize={10}
                      className="fill-foreground tabular-nums"
                      formatter={(v: React.ReactNode) => formatBRL(Number(v))}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}

      <ReservasDrilldownDialog
        open={!!drilldown}
        onOpenChange={(open) => !open && setDrilldown(null)}
        titulo={drilldown?.titulo || ""}
        reservas={drilldown?.reservas || []}
        casas={casas}
        mostrarCasa={drilldown?.mostrarCasa || false}
        plataforma={drilldown?.plataforma}
      />
    </div>
  )
}
