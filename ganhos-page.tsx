import * as React from "react"
import { motion } from "framer-motion"
import { ArrowLeft, TrendingDown, TrendingUp, UserRound, Wallet } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar } from "@/components/bar"
import { BarChart } from "@/components/bar-chart"
import { BarXAxis } from "@/components/bar-x-axis"
import { Grid } from "@/components/grid"
import { LineChart } from "@/components/line-chart"
import { profitLossColor, ProfitLossLine } from "@/components/profit-loss-line"
import { Ring } from "@/components/ring"
import { RingCenter } from "@/components/ring-center"
import { RingChart } from "@/components/ring-chart"
import { ChartTooltip } from "@/components/chart-tooltip-kit"
import { XAxis } from "@/components/x-axis"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { PlatformIcon } from "@/components/platform-icon"
import { ReservasDrilldownDialog } from "@/components/reservas-drilldown-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SpotlightCard, SpotlightOverlay } from "@/components/spotlight-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { comissaoPlataformaEfetiva, formatBRL, primeiroDiaMes, ultimoDiaMes, valorBrutoEfetivo } from "@/lib/format"
import { PLATFORM_BADGE, PLATFORM_COLOR } from "@/lib/platform"
import { cn } from "@/lib/utils"
import type { CasaSelecionada } from "@/hooks/use-aluguel-data"
import { useSpotlight } from "@/hooks/use-spotlight"
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
const th = "text-eyebrow px-4 py-3 text-muted-foreground"
const td = "px-4 py-3"

// Chave "AAAA-MM-DD" a partir de um Date local — mesma ideia do monthKey()
// do calendar-view.tsx, evita o desvio de fuso de Date.toISOString() (que
// converte pra UTC antes de cortar a data).
function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

// Períodos com mais de 60 dias (ex: "Ano Atual") viram visão mensal — 12
// barras agregadas em vez de ~365 pontos diários, ilegível num card. Abaixo
// disso (ex: "Mês Atual") continua dia a dia.
const LIMITE_DIAS_VISAO_MENSAL = 60

// Um ponto por dia OU por mês na série de evolução, dependendo da
// granularidade do período (ver LIMITE_DIAS_VISAO_MENSAL). No modo diário é
// o dia do CHECK-IN, com o valor da(s) reserva(s) inteira(s) que entraram
// naquele dia (não espalhado pelas noites), pra bater com a pergunta "o que
// gerou essa receita". `label` só existe no modo mensal — um rótulo curto
// tipo "Jan/26" pro eixo do gráfico de barras, evitando que a formatação de
// data do componente (dia + mês) mostre "1 de jan." pra um mês inteiro.
interface PontoEvolucao {
  date: Date
  label?: string
  bruto: number
  taxas: number
  liquido: number
  /** Quem gerou o valor — hóspede(s) (modo diário) ou "N reservas" (modo mensal); undefined = sem check-in. */
  origem?: string
  // Os componentes de gráfico (Bklit) esperam Record<string, unknown>[] —
  // essa assinatura de índice deixa PontoEvolucao[] atribuível direto,
  // sem precisar converter em cada uso.
  [key: string]: unknown
}

// Conteúdo rico do tooltip (Area/Bar/Line) — mostra a origem do valor
// (hóspede, ou contagem de reservas no modo mensal) e a composição Bruto →
// Taxas → Líquido, não só o número seco.
function EvolucaoTooltipContent({ point, granularidade }: { point: Record<string, unknown>; granularidade: "dia" | "mes" }) {
  const p = point as unknown as PontoEvolucao
  return (
    <div className="min-w-48 px-3 py-2.5">
      <div className="mb-1.5 text-xs font-medium text-chart-tooltip-foreground">
        {granularidade === "mes"
          ? p.date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
          : p.date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
      </div>
      {p.origem ? (
        <>
          <div className="mb-2 text-xs text-chart-tooltip-muted">{p.origem}</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-chart-tooltip-muted">Bruto</span>
              <span className="font-medium text-chart-tooltip-foreground tabular-nums">{formatBRL(p.bruto)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-chart-tooltip-muted">Taxas</span>
              <span className="font-medium text-chart-tooltip-foreground tabular-nums">-{formatBRL(p.taxas)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-white/10 border-t pt-1">
              <span className="text-chart-tooltip-muted">Líquido</span>
              <span className="font-semibold text-chart-tooltip-foreground tabular-nums">{formatBRL(p.liquido)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-xs text-chart-tooltip-muted">
          {granularidade === "mes" ? "Sem check-in nesse mês" : "Sem check-in nesse dia"}
        </div>
      )}
    </div>
  )
}

// KPI acima de cada gráfico — total do período + variação vs. o período
// anterior de mesma duração (não necessariamente "mês anterior": o filtro
// de data aqui é livre, então comparamos com o trecho imediatamente antes).
function KpiHeader({ label, valor, variacaoPct }: { label: string; valor: number; variacaoPct: number | null }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <div>
        <div className="text-eyebrow text-muted-foreground">{label}</div>
        <div className="font-mono text-2xl font-bold tabular-nums">{formatBRL(valor)}</div>
      </div>
      {variacaoPct !== null && (
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs tabular-nums",
            variacaoPct >= 0
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          )}
        >
          {variacaoPct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {variacaoPct >= 0 ? "+" : ""}
          {variacaoPct.toFixed(0)}% vs. período anterior
        </span>
      )}
    </div>
  )
}

function GanhosCard({ label, value, hero, index }: { label: string; value: string; hero?: boolean; index: number }) {
  return (
    <SpotlightCard
      className="animate-stagger-in min-w-0 gap-1 p-4 data-[hero=true]:border-foreground data-[hero=true]:bg-foreground data-[hero=true]:text-background"
      data-hero={hero}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="text-eyebrow truncate text-muted-foreground group-data-[hero=true]/card:text-background/65">
        {label}
      </div>
      <div
        className={cn(
          // Mono/tabular em todo valor em R$ — pedido explícito do dono pra
          // números alinharem e ficarem "nítidos" nos cards de resumo.
          "truncate font-mono tracking-tight tabular-nums",
          hero ? "text-2xl font-bold sm:text-3xl" : "text-xl font-bold sm:text-2xl"
        )}
      >
        {value}
      </div>
    </SpotlightCard>
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

// Card de plataforma com spotlight — é um <button> (precisa ser clicável
// pro drilldown), então não dá pra usar <SpotlightCard> (que é um <div>);
// reaproveita o mesmo hook `useSpotlight` por trás.
function PlataformaCard({
  children,
  delay,
  onClick,
}: {
  children: React.ReactNode
  delay: number
  onClick: () => void
}) {
  const { handleMouseMove, background } = useSpotlight()
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className="group/spotlight animate-stagger-in relative isolate flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent/40"
      style={{ animationDelay: `${delay}ms` }}
    >
      <SpotlightOverlay background={background} />
      {children}
    </button>
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

  // "Aba ativa" derivada do período atual (não de qual botão foi clicado
  // por último) — se o usuário editar as datas manualmente até baterem com
  // um dos atalhos, a aba correspondente acende sozinha; se ele desviar, as
  // duas apagam. Espelha exatamente o cálculo de cada atalho pra comparar
  // igual com igual.
  const hojeRef = new Date()
  const isMesAtual = de === primeiroDiaMes(hojeRef) && ate === ultimoDiaMes(hojeRef)
  const isAnoAtual =
    de === new Date(hojeRef.getFullYear(), 0, 1).toISOString().slice(0, 10) &&
    ate === new Date(hojeRef.getFullYear(), 11, 31).toISOString().slice(0, 10)

  const resultado = React.useMemo(() => {
    let filtradas = reservas.filter((r) => r.status !== "cancelada")
    if (casaFiltro !== todasValue) filtradas = filtradas.filter((r) => r.casa_id === Number(casaFiltro))
    // Overlap: conta a reserva se ela tem QUALQUER noite dentro do período escolhido
    if (de) filtradas = filtradas.filter((r) => r.checkout > de)
    if (ate) filtradas = filtradas.filter((r) => r.checkin <= ate)

    const valorBruto = filtradas.reduce((s, r) => s + valorBrutoEfetivo(r), 0)
    const comissaoTotal = filtradas.reduce((s, r) => s + comissaoPlataformaEfetiva(r), 0)
    const comissaoMarcioTotal = filtradas.reduce((s, r) => s + (Number(r.comissao_marcio) || 0), 0)
    // Desconto de hóspede de verdade — exclui Booking, onde esse mesmo campo
    // já virou "Comissão plataforma" (contado acima em comissaoTotal). Sem
    // isso o mesmo real apareceria duas vezes, em dois cards diferentes.
    const descontoTotal = filtradas.reduce((s, r) => s + (r.plataforma === "Booking" ? 0 : Number(r.desconto) || 0), 0)
    const limpezaTotal = filtradas.reduce((s, r) => s + (Number(r.taxa_limpeza) || 0), 0)
    const valorLiquido = valorBruto - comissaoTotal - comissaoMarcioTotal
    const totalReservas = filtradas.length

    const porPlataforma: Record<string, { bruto: number; comissao: number; comissaoMarcio: number; qtd: number }> = {}
    filtradas.forEach((r) => {
      const p = r.plataforma || "Outro"
      if (!porPlataforma[p]) porPlataforma[p] = { bruto: 0, comissao: 0, comissaoMarcio: 0, qtd: 0 }
      porPlataforma[p].bruto += valorBrutoEfetivo(r)
      porPlataforma[p].comissao += comissaoPlataformaEfetiva(r)
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
        acumulado[cid].bruto += valorBrutoEfetivo(r)
        acumulado[cid].comissao += comissaoPlataformaEfetiva(r)
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

  // Granularidade da série — mensal (12 barras agregadas) pra períodos
  // longos tipo "Ano Atual", diária (uma barra por dia) pra períodos curtos
  // tipo "Mês Atual". Ver LIMITE_DIAS_VISAO_MENSAL.
  const periodoDias =
    de && ate ? Math.round((new Date(`${ate}T00:00:00`).getTime() - new Date(`${de}T00:00:00`).getTime()) / 86400000) + 1 : 0
  const granularidade: "dia" | "mes" = periodoDias > LIMITE_DIAS_VISAO_MENSAL ? "mes" : "dia"

  // Série pro Area/Bar Chart e pro Profit/Loss Line (fallback de líquido
  // negativo) — um ponto por dia OU por mês de CHECK-IN (não espalhado
  // pelas noites da estadia), pra cada pico do gráfico corresponder a uma
  // reserva de verdade que o tooltip consegue explicar. Dias/meses sem
  // check-in ficam com valor zero (mantém o eixo do tempo contínuo).
  const evolucao = React.useMemo(() => {
    if (!de || !ate) return []
    let candidatas = reservas.filter((r) => r.status !== "cancelada" && r.checkin >= de && r.checkin <= ate)
    if (casaFiltro !== todasValue) candidatas = candidatas.filter((r) => r.casa_id === Number(casaFiltro))

    const inicio = new Date(`${de}T00:00:00`)
    const fim = new Date(`${ate}T00:00:00`)

    if (granularidade === "mes") {
      const porMes = new Map<string, { bruto: number; taxas: number; qtd: number }>()
      for (const r of candidatas) {
        const ci = new Date(`${r.checkin}T00:00:00`)
        const chave = `${ci.getFullYear()}-${String(ci.getMonth() + 1).padStart(2, "0")}`
        const bruto = valorBrutoEfetivo(r)
        const taxas = comissaoPlataformaEfetiva(r) + (Number(r.comissao_marcio) || 0)
        const acumulado = porMes.get(chave) ?? { bruto: 0, taxas: 0, qtd: 0 }
        acumulado.bruto += bruto
        acumulado.taxas += taxas
        acumulado.qtd += 1
        porMes.set(chave, acumulado)
      }

      const pontos: PontoEvolucao[] = []
      const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
      const limite = new Date(fim.getFullYear(), fim.getMonth(), 1)
      while (cursor.getTime() <= limite.getTime()) {
        const chave = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
        const registrado = porMes.get(chave)
        pontos.push({
          date: new Date(cursor),
          label: `${MESES_ABREV[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(2)}`,
          bruto: registrado?.bruto ?? 0,
          taxas: registrado?.taxas ?? 0,
          liquido: (registrado?.bruto ?? 0) - (registrado?.taxas ?? 0),
          origem: registrado?.qtd ? `${registrado.qtd} reserva${registrado.qtd > 1 ? "s" : ""}` : undefined,
        })
        cursor.setMonth(cursor.getMonth() + 1)
      }
      return pontos
    }

    const porDia = new Map<string, { bruto: number; taxas: number; hospedes: string[] }>()
    for (const r of candidatas) {
      const bruto = valorBrutoEfetivo(r)
      const taxas = comissaoPlataformaEfetiva(r) + (Number(r.comissao_marcio) || 0)
      const acumulado = porDia.get(r.checkin) ?? { bruto: 0, taxas: 0, hospedes: [] }
      acumulado.bruto += bruto
      acumulado.taxas += taxas
      if (r.hospede) acumulado.hospedes.push(r.hospede)
      porDia.set(r.checkin, acumulado)
    }

    const pontos: PontoEvolucao[] = []
    for (let t = inicio.getTime(); t <= fim.getTime(); t += 86400000) {
      const dia = new Date(t)
      const registrado = porDia.get(chaveDia(dia))
      pontos.push({
        date: dia,
        bruto: registrado?.bruto ?? 0,
        taxas: registrado?.taxas ?? 0,
        liquido: (registrado?.bruto ?? 0) - (registrado?.taxas ?? 0),
        origem: registrado?.hospedes.length ? registrado.hospedes.join(", ") : undefined,
      })
    }
    return pontos
  }, [reservas, casaFiltro, de, ate, granularidade])

  // Líquido pode, em tese, ficar negativo num dia (desconto maior que o
  // bruto) — o Bar Chart da Bklit só sabe desenhar barras a partir de zero
  // pra cima, então nesse caso raro caímos de volta pro Profit/Loss Line
  // (linha, que já lida com negativo colorindo de vermelho).
  const evolucaoTemNegativo = evolucao.some((p) => p.liquido < 0)

  // Totais do período anterior (mesma duração, imediatamente antes de `de`)
  // — vira a variação % nos cabeçalhos dos gráficos. Usa o mesmo critério de
  // "overlap" que os cards do topo (não o de check-in da série acima), pra
  // comparar maçã com maçã com o Valor Bruto/Líquido já mostrados ali.
  const periodoAnterior = React.useMemo(() => {
    if (!de || !ate) return null
    const inicio = new Date(`${de}T00:00:00`)
    const fim = new Date(`${ate}T00:00:00`)
    const duracaoDias = Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1
    const fimAnterior = new Date(inicio.getTime() - 86400000)
    const inicioAnterior = new Date(fimAnterior.getTime() - (duracaoDias - 1) * 86400000)
    const deAnterior = chaveDia(inicioAnterior)
    const ateAnterior = chaveDia(fimAnterior)

    let candidatas = reservas.filter((r) => r.status !== "cancelada" && r.checkout > deAnterior && r.checkin <= ateAnterior)
    if (casaFiltro !== todasValue) candidatas = candidatas.filter((r) => r.casa_id === Number(casaFiltro))

    const bruto = candidatas.reduce((s, r) => s + valorBrutoEfetivo(r), 0)
    const taxas = candidatas.reduce((s, r) => s + comissaoPlataformaEfetiva(r) + (Number(r.comissao_marcio) || 0), 0)
    return { bruto, liquido: bruto - taxas }
  }, [reservas, casaFiltro, de, ate])

  function variacaoPct(atual: number, anterior: number | undefined): number | null {
    if (!anterior) return null
    return ((atual - anterior) / anterior) * 100
  }

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
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
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
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={atalhoMesAtual}
              className={cn(
                "relative isolate h-6 rounded-md px-2.5 text-xs font-medium transition-colors",
                isMesAtual ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isMesAtual && (
                <motion.div
                  layoutId="ganhos-periodo-pill"
                  className="absolute inset-0 -z-10 rounded-md bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              Mês Atual
            </button>
            <button
              type="button"
              onClick={atalhoAnoAtual}
              className={cn(
                "relative isolate h-6 rounded-md px-2.5 text-xs font-medium transition-colors",
                isAnoAtual ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isAnoAtual && (
                <motion.div
                  layoutId="ganhos-periodo-pill"
                  className="absolute inset-0 -z-10 rounded-md bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              Ano Atual
            </button>
          </div>
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

          {/* Evolução no período — um ponto por dia OU por mês de check-in
              (nunca espalhado pelas noites), pra cada barra corresponder a
              reserva(s) de verdade que o tooltip consegue explicar.
              "Mês Atual"/períodos curtos: uma barra por dia. "Ano Atual"/
              períodos > 60 dias: agregado em 12 barras por mês (ver
              LIMITE_DIAS_VISAO_MENSAL) — 365 barras diárias não caberiam
              legíveis no card. Bar Chart nos dois casos (bruto e líquido);
              líquido cai pra Profit/Loss Line (linha) só no caso raro de
              ficar negativo, que o Bar Chart da Bklit não desenha.
              Margem generosa (padding) já é o padrão de Area/Bar/LineChart
              — barra/linha nunca encosta na borda do card. Some com menos
              de 2 pontos (não dá pra comparar com 1 barra só). */}
          {evolucao.length > 1 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardContent>
                  <KpiHeader label="Total Bruto no período" valor={resultado.valorBruto} variacaoPct={variacaoPct(resultado.valorBruto, periodoAnterior?.bruto)} />
                  <BarChart data={evolucao} xDataKey={granularidade === "mes" ? "label" : "date"} aspectRatio="16 / 9">
                    <Grid horizontal />
                    <Bar dataKey="bruto" fill="var(--chart-line-primary)" />
                    <BarXAxis />
                    <ChartTooltip content={({ point }) => <EvolucaoTooltipContent granularidade={granularidade} point={point} />} />
                  </BarChart>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <KpiHeader
                    label="Total Líquido no período"
                    valor={resultado.valorLiquido}
                    variacaoPct={variacaoPct(resultado.valorLiquido, periodoAnterior?.liquido)}
                  />
                  {evolucaoTemNegativo ? (
                    <LineChart data={evolucao} xDataKey="date" aspectRatio="16 / 9">
                      <Grid highlightRowValues={[0]} horizontal />
                      <ProfitLossLine dataKey="liquido" />
                      <XAxis />
                      <ChartTooltip
                        content={({ point }) => <EvolucaoTooltipContent granularidade={granularidade} point={point} />}
                        indicatorColor={(point: Record<string, unknown>) => profitLossColor((point.liquido as number) ?? 0)}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={evolucao} xDataKey={granularidade === "mes" ? "label" : "date"} aspectRatio="16 / 9">
                      <Grid horizontal />
                      <Bar dataKey="liquido" fill="var(--color-emerald-500)" />
                      <BarXAxis />
                      <ChartTooltip content={({ point }) => <EvolucaoTooltipContent granularidade={granularidade} point={point} />} />
                    </BarChart>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {resultado.porCasa.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-section-title text-foreground/80">Por casa</CardTitle>
                <p className="text-[11px] text-muted-foreground/70">Clique numa linha pra ver as reservas.</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-border">
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
              <h2 className="text-section-title text-foreground/80">Desempenho por plataforma</h2>
              {Object.entries(resultado.porPlataforma).map(([plat, v], i) => {
                const liquido = v.bruto - v.comissao - v.comissaoMarcio
                const pctLiquido = v.bruto > 0 ? (liquido / v.bruto) * 100 : 0
                const pctTaxas = v.bruto > 0 ? (v.comissao / v.bruto) * 100 : 0
                const pctMarcio = v.bruto > 0 ? (v.comissaoMarcio / v.bruto) * 100 : 0
                return (
                  <PlataformaCard
                    key={plat}
                    delay={i * 55}
                    onClick={() => abrirDrilldownPlataforma(plat)}
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
                    <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pctLiquido}%`, background: COR_LIQUIDO }} />
                      <div className="h-full rounded-full" style={{ width: `${pctTaxas}%`, background: COR_TAXAS_PLATAFORMA }} />
                      <div className="h-full rounded-full" style={{ width: `${pctMarcio}%`, background: COR_COMISSAO_MARCIO }} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
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
                  </PlataformaCard>
                )
              })}
            </div>

            {/* Coluna direita — resumo da Comissão Marcio Filho + donut de
                distribuição por plataforma, no lugar do gráfico de barra
                única (que não tinha o que comparar, já que era 1 série só). */}
            <div className="flex flex-col gap-4">
              <h2 className="text-section-title flex items-center gap-2 text-foreground/80">
                <UserRound className="size-3.5" />
                Comissão Marcio Filho
              </h2>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="text-xs text-muted-foreground">Total acumulado no período</div>
                {/* violet-600/400 pedido explicitamente pelo dono — mesma cor
                    da fatia "Comissão Marcio" na barra segmentada e no
                    donut logo abaixo, não um roxo decorativo solto. */}
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                  {formatBRL(resultado.comissaoMarcioTotal)}
                </div>
              </div>

              <div className="flex flex-1 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 text-xs font-medium text-muted-foreground">Distribuição por plataforma</div>
                {donutData.length > 0 ? (
                  <div className="flex flex-1 items-center gap-6">
                    {/* Anéis concêntricos (componente Ring Chart, instalado via
                        registry Bklit) no lugar do donut do Recharts — cada
                        anel é a fatia de uma plataforma na Comissão Marcio,
                        crescendo do centro pra fora. Passar o mouse num anel
                        troca o número do centro pelo valor daquela plataforma. */}
                    <RingChart
                      data={donutData.map((d) => ({
                        label: d.nome,
                        value: d.valor,
                        maxValue: resultado.comissaoMarcioTotal,
                        color: d.color,
                      }))}
                      size={144}
                      className="mx-auto shrink-0"
                    >
                      {donutData.map((d, i) => (
                        <Ring key={d.nome} index={i} />
                      ))}
                      <RingCenter defaultLabel="Total" formatOptions={{ style: "currency", currency: "BRL", maximumFractionDigits: 0 }} />
                    </RingChart>
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
