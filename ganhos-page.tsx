import * as React from "react"
import { Cell, Pie, PieChart } from "recharts"
import { ArrowLeft, UserRound, Wallet } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { PlatformIcon } from "@/components/platform-icon"
import { ReservasDrilldownDialog } from "@/components/reservas-drilldown-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatBRL, primeiroDiaMes, ultimoDiaMes } from "@/lib/format"
import { PLATFORM_BADGE, PLATFORM_COLOR } from "@/lib/platform"
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
      // Sem `border`/`rounded-xl`/`overflow-hidden` explícitos — o Card já
      // declara essa elevação sozinho (ring sutil + sombra em duas camadas);
      // duplicar com uma borda literal por cima vira "ghost card".
      className="animate-stagger-in min-w-0 gap-1 p-4 data-[hero=true]:border-foreground data-[hero=true]:bg-foreground data-[hero=true]:text-background"
      data-hero={hero}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="truncate text-xs font-medium text-muted-foreground group-data-[hero=true]/card:text-background/65">
        {label}
      </div>
      <div
        className={cn(
          // Mesma família (Space Grotesk) do resto dos cards — o hero só
          // ganha destaque por tamanho/peso/cor, não por trocar de fonte.
          "truncate font-heading tracking-tight tabular-nums",
          hero ? "text-2xl font-bold sm:text-3xl" : "text-xl font-bold sm:text-2xl"
        )}
      >
        {value}
      </div>
    </Card>
  )
}

// Paleta da barra segmentada (Líquido/Taxas/Marcio) e do donut — validada
// com o validador do skill dataviz (6 checks: faixa OKLCH, croma, separação
// CVD, piso de visão normal, contraste) contra as superfícies reais dos
// cards (#FFFFFF claro / #18181B escuro). O pedido original pedia índigo
// pras "Taxas da Plataforma", mas índigo #6366f1 ficou a ΔE 6.3 (piso de
// visão normal) do violeta da Comissão Marcio ao lado — imperceptível até
// pra quem enxerga cores normalmente. Trocado por âmbar, que abre distância
// nos três pares e ainda passa em claro e escuro com o mesmo hex.
const COR_LIQUIDO = "#059669" // esmeralda 600 — mesma cor já validada no resto da página
const COR_TAXAS_PLATAFORMA = "#d97706" // âmbar 600
const COR_COMISSAO_MARCIO = "#7c3aed" // violeta 600 — mesma cor já validada no resto da página

interface DonutTooltipPayloadItem {
  name?: string
  value?: number | string
  payload?: { color?: string }
}

// Tooltip flutuante do donut — mesmo padrão zinc/branco fixo (igual em claro
// e escuro) já usado nos outros elementos de gráfico desta página.
function DonutTooltip({ active, payload }: { active?: boolean; payload?: DonutTooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 text-xs font-medium text-zinc-900 shadow-lg dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-100">
      <div className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full" style={{ background: item.payload?.color }} />
        <span className="text-muted-foreground dark:text-zinc-400">{item.name}</span>
        <span className="ml-auto pl-3 font-mono font-semibold tabular-nums">{formatBRL(Number(item.value))}</span>
      </div>
    </div>
  )
}

// ChartContainer exige um ChartConfig, mas o donut colore cada fatia via
// <Cell fill> direto (cor por entidade/plataforma, não por --color-N do
// tema) — não há série alguma pra declarar aqui.
const donutChartConfig = {} satisfies ChartConfig

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

  // Fatias do donut de Comissão Marcio Filho — sempre por plataforma (é a
  // identidade que dá cor à fatia via PLATFORM_COLOR, a mesma usada nos
  // badges e no calendário). Fatias zeradas ficam de fora do donut.
  const donutData = React.useMemo(() => {
    const total = resultado.comissaoMarcioTotal
    return Object.entries(resultado.porPlataforma)
      .map(([plataforma, v]) => ({
        nome: plataforma,
        plataforma,
        valor: v.comissaoMarcio,
        color: PLATFORM_COLOR[plataforma] || PLATFORM_COLOR.Outro,
        pct: total > 0 ? (v.comissaoMarcio / total) * 100 : 0,
      }))
      .filter((d) => d.valor > 0)
      .sort((a, b) => b.valor - a.valor)
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Coluna esquerda — um card por plataforma, no lugar do gráfico
                de barras vertical: mesmos dados (qtd, bruto, líquido, taxas,
                comissão Marcio), lidos em texto em vez de altura de barra. */}
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Desempenho por plataforma</h2>
              {Object.entries(resultado.porPlataforma).map(([plat, v], i) => {
                const liquido = v.bruto - v.comissao - v.comissaoMarcio
                const pctLiquido = v.bruto > 0 ? (liquido / v.bruto) * 100 : 0
                const pctTaxas = v.bruto > 0 ? (v.comissao / v.bruto) * 100 : 0
                const pctMarcio = v.bruto > 0 ? (v.comissaoMarcio / v.bruto) * 100 : 0
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => abrirDrilldownPlataforma(plat)}
                    className="animate-stagger-in flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent/40 dark:border-zinc-800"
                    style={{ animationDelay: `${i * 55}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={cn("gap-1.5", PLATFORM_BADGE[plat] || PLATFORM_BADGE.Outro)}>
                        <PlatformIcon plataforma={plat} size="sm" />
                        {plat}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{v.qtd} reserva(s)</span>
                      <span className="ml-auto font-mono text-lg font-bold tabular-nums">{formatBRL(v.bruto)}</span>
                    </div>

                    {/* Barra segmentada — mesma proporção visual do bruto que
                        as três parcelas (líquido/taxas/comissão) representam;
                        gap de 2px entre segmentos é a mesma separação por
                        contraste que os rótulos abaixo reforçam em texto. */}
                    <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className="h-full rounded-full" style={{ width: `${pctLiquido}%`, background: COR_LIQUIDO }} />
                      <div className="h-full rounded-full" style={{ width: `${pctTaxas}%`, background: COR_TAXAS_PLATAFORMA }} />
                      <div className="h-full rounded-full" style={{ width: `${pctMarcio}%`, background: COR_COMISSAO_MARCIO }} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: COR_LIQUIDO }} />
                        Líquido <b className="tabular-nums text-foreground">{formatBRL(liquido)}</b>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: COR_TAXAS_PLATAFORMA }} />
                        Taxas <b className="tabular-nums text-foreground">{formatBRL(v.comissao)}</b>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: COR_COMISSAO_MARCIO }} />
                        Marcio <b className="tabular-nums text-foreground">{formatBRL(v.comissaoMarcio)}</b>
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Coluna direita — resumo da Comissão Marcio Filho + donut de
                distribuição por plataforma, no lugar do gráfico de barra
                única (que não tinha o que comparar, já que era 1 série só). */}
            <div className="flex flex-col gap-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                <UserRound className="size-3.5" />
                Comissão Marcio Filho
              </h2>

              <div className="rounded-2xl border border-zinc-200 bg-card p-5 shadow-sm dark:border-zinc-800">
                <div className="text-xs text-muted-foreground">Total acumulado no período</div>
                {/* violet-600/400 pedido explicitamente pelo dono — mesma cor
                    da fatia "Comissão Marcio" na barra segmentada e no
                    donut logo abaixo, não um roxo decorativo solto. */}
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                  {formatBRL(resultado.comissaoMarcioTotal)}
                </div>
              </div>

              <div className="flex flex-1 flex-col rounded-2xl border border-zinc-200 bg-card p-5 shadow-sm dark:border-zinc-800">
                <div className="mb-3 text-xs font-medium text-muted-foreground">Distribuição por plataforma</div>
                {donutData.length > 0 ? (
                  <div className="flex flex-1 items-center gap-6">
                    <ChartContainer config={donutChartConfig} className="mx-auto aspect-square h-36 w-36 shrink-0">
                      <PieChart>
                        <ChartTooltip content={<DonutTooltip />} />
                        <Pie
                          data={donutData}
                          dataKey="valor"
                          nameKey="nome"
                          innerRadius="62%"
                          outerRadius="100%"
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {donutData.map((d) => (
                            <Cell key={d.nome} fill={d.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-1 flex-col gap-2">
                      {donutData.map((d) => (
                        <button
                          key={d.nome}
                          type="button"
                          onClick={() => abrirDrilldownPlataforma(d.plataforma)}
                          className="flex items-center gap-2 rounded-md text-left text-xs transition-opacity hover:opacity-70"
                        >
                          <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} />
                          <span className="flex-1 truncate">{d.nome}</span>
                          <span className="font-mono tabular-nums text-muted-foreground">{d.pct.toFixed(0)}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Empty className="flex-1 py-6">
                    <EmptyMedia variant="icon">
                      <UserRound />
                    </EmptyMedia>
                    <EmptyDescription>Nenhuma comissão registrada nesse período.</EmptyDescription>
                  </Empty>
                )}
              </div>
            </div>
          </div>
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
