import * as React from "react"
import { motion } from "framer-motion"

import {
  calcularEstatisticasImpressao,
  PrintReportFooter,
  PrintReportHeader,
  PrintReportLegend,
  PrintReportSummary,
} from "@/components/calendar-print-report"
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

// Quantos meses o feed já nasce carregado (antes/depois do mês atual) e até
// onde a rolagem infinita pode esticar o range — evita crescer pra sempre
// se alguém ficar rolando com o dedo preso.
const MESES_INICIAIS_PASSADO = 2
const MESES_INICIAIS_FUTURO = 5
const LIMITE_PASSADO = 24
const LIMITE_FUTURO = 36

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

interface ReservaDayCardProps {
  reserva: Reserva
  casas: Casa[]
  modoTodasCasas: boolean
  selected: boolean
  onSelect: () => void
}

// Único lugar da UI onde a cor da casa/plataforma ainda aparece: uma faixa
// fina na lateral esquerda do card, não mais barras cobrindo o topo do dia
// nem o avatar inteiro tingido — a cor vira um indicador pequeno, não o
// elemento dominante do card.
function ReservaDayCard({ reserva, casas, modoTodasCasas, selected, onSelect }: ReservaDayCardProps) {
  const cor = modoTodasCasas
    ? corDaCasa(casas, reserva.casa_id)
    : PLATFORM_COLOR[reserva.plataforma] || PLATFORM_COLOR.Outro

  const nomeAbreviado = abreviarNome(reserva.hospede) || "(sem nome)"

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex w-full min-w-0 flex-col items-start gap-0.5 rounded-lg border border-l-[3px] bg-card py-1 pr-2 pl-2 text-left leading-tight shadow-none transition-colors print:gap-0 print:rounded-md print:border-zinc-200 print:py-0.5",
        selected ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-muted/60"
      )}
      style={{ borderLeftColor: cor }}
    >
      <span className="flex w-full min-w-0 items-center gap-1">
        {/* Na tela a cor já está na faixa lateral do card — repetir num
            ponto some seria redundante. No papel a faixa fica sutil demais
            (impressora não reproduz bem 3px de cor), então a bolinha antes
            do nome garante que a cor da casa/plataforma continue lisível. */}
        <span
          aria-hidden="true"
          className="hidden size-[5px] shrink-0 rounded-full print:inline-block"
          style={{ backgroundColor: cor }}
        />
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-foreground print:text-[7.5px]">
          {nomeAbreviado}
        </span>
      </span>
      <span className="w-full min-w-0 truncate font-mono text-[10px] leading-tight tabular-nums text-muted-foreground print:text-[7px]">
        {formatDiaMes(reserva.checkin)} → {formatDiaMes(reserva.checkout)}
      </span>
      <span className="w-full min-w-0 truncate font-mono text-[10px] leading-tight tabular-nums text-muted-foreground/75 print:text-[7px]">
        {formatBRLCompacto(reserva.valor_total)}
      </span>
    </motion.button>
  )
}

interface CheckoutBadgeProps {
  reserva: Reserva
  selected: boolean
  onSelect: () => void
}

// Uma linha discreta, não mais um card vermelho — o vermelho aqui é só um
// tom de texto suave, pra sinalizar "casa libera hoje" sem competir com os
// cards de check-in.
function CheckoutBadge({ reserva, selected, onSelect }: CheckoutBadgeProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 items-baseline gap-1 rounded-md px-1.5 py-0.5 text-left transition-colors print:px-1 print:py-0",
        selected ? "bg-destructive/10 text-destructive" : "text-destructive/65 hover:bg-destructive/5"
      )}
    >
      <span aria-hidden="true" className="text-[10px] leading-none print:text-[7px]">
        ←
      </span>
      <span className="min-w-0 flex-1 truncate text-[10.5px] leading-tight font-medium print:text-[7px]">
        Saída · {abreviarNome(reserva.hospede) || "(sem nome)"}
      </span>
    </button>
  )
}

interface MonthSectionProps {
  mes: Date
  sectionRef: (el: HTMLElement | null) => void
  casas: Casa[]
  reservasCasa: Reserva[]
  modoTodasCasas: boolean
  selectedReservaId: number | null
  onSelectReserva: (id: number) => void
  /** Único mês que sobrevive na impressão — os demais somem via `print:hidden`
   *  (o feed continua rolando normalmente na tela, só o papel filtra). */
  ativoNaImpressao: boolean
  /** "Nome da unidade" que aparece no cabeçalho do papel — nome da casa
   *  selecionada, ou "Todas as casas" no modo agregado. */
  nomeUnidadeImpressao: string
}

function MonthSection({
  mes,
  sectionRef,
  casas,
  reservasCasa,
  modoTodasCasas,
  selectedReservaId,
  onSelectReserva,
  ativoNaImpressao,
  nomeUnidadeImpressao,
}: MonthSectionProps) {
  const key = monthKey(mes)

  const hoje = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const ehMesAtual = isSameMonth(mes, hoje)

  const { dias, primeiroDiaSemana } = React.useMemo(() => {
    const ano = mes.getFullYear()
    const mesIdx = mes.getMonth()
    const primeiro = new Date(ano, mesIdx, 1).getDay()
    const totalDias = new Date(ano, mesIdx + 1, 0).getDate()
    const ativas = reservasCasa.filter((r) => r.status !== "cancelada")

    const lista = Array.from({ length: totalDias }, (_, i) => {
      const d = new Date(ano, mesIdx, i + 1)
      const checkins = ativas.filter((r) => new Date(r.checkin + "T00:00:00").getTime() === d.getTime())
      const checkouts = ativas.filter((r) => new Date(r.checkout + "T00:00:00").getTime() === d.getTime())
      return { data: d, isToday: d.getTime() === hoje.getTime(), checkins, checkouts }
    })

    return { dias: lista, primeiroDiaSemana: primeiro }
  }, [mes, reservasCasa, hoje])

  const nomeMes = mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  const totalCelulas = primeiroDiaSemana + dias.length
  const trailing = (7 - (totalCelulas % 7)) % 7

  // Só vale a pena somar reservas x 30 dias pros meses que vão realmente
  // sair no papel — o feed pode ter dezenas de meses montados ao mesmo
  // tempo (rolagem infinita), e o resto nem chega a aparecer na tela.
  const statsImpressao = React.useMemo(
    () => (ativoNaImpressao ? calcularEstatisticasImpressao(mes, reservasCasa) : null),
    [ativoNaImpressao, mes, reservasCasa]
  )

  return (
    <section
      ref={sectionRef}
      data-month-key={key}
      className={cn(
        "scroll-mt-16",
        !ativoNaImpressao && "print:hidden",
        ativoNaImpressao && "print:flex print:h-[190mm] print:flex-col"
      )}
    >
      {ativoNaImpressao && statsImpressao && (
        <>
          <PrintReportHeader mes={mes} nomeUnidade={nomeUnidadeImpressao} />
          <PrintReportSummary stats={statsImpressao} />
        </>
      )}

      <div className="mb-3 px-0.5 print:hidden">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground capitalize">{nomeMes}</h2>
          {ehMesAtual && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              mês atual
            </span>
          )}
        </div>
      </div>

      {/* Rótulos de dia da semana num grid próprio (não junto com as células
          dos dias) — só assim dá pra deixar essa linha com altura fixa no
          papel e sobrar o máximo de espaço vertical pras semanas em si,
          que usam `auto-rows-fr` pra dividir igualmente o que sobrar da
          folha. Mesmas colunas/gap dos dois grids garantem alinhamento. */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 print:mt-2 print:shrink-0 print:gap-1">
        {DOWS.map((d) => (
          <div
            key={d}
            className="py-1 text-center font-mono text-[10.5px] font-semibold text-muted-foreground print:py-0.5 print:text-[7px]"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 print:flex-1 print:auto-rows-fr print:gap-1 print:break-inside-avoid print:[page-break-inside:avoid]">
        {Array.from({ length: primeiroDiaSemana }, (_, i) => (
          <div key={`lead-${i}`} aria-hidden="true" />
        ))}
        {dias.map((dia) => {
          const fimDeSemana = dia.data.getDay() === 0 || dia.data.getDay() === 6
          return (
            <div
              key={dia.data.toISOString()}
              className={cn(
                "flex min-h-24 min-w-0 flex-col gap-1 rounded-xl border border-border/60 bg-muted/40 p-1.5 text-[11.5px] sm:min-h-28 print:min-h-0 print:gap-0.5 print:rounded-md print:border-zinc-200 print:p-1 print:text-[9px]",
                dia.isToday
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/25 print:bg-primary/5"
                  : fimDeSemana
                    ? "print:bg-zinc-50/80"
                    : "print:bg-white"
              )}
            >
              <span
                className={cn(
                  "px-0.5 text-[12px] font-bold print:text-[13px]",
                  dia.isToday ? "text-primary" : "text-foreground"
                )}
              >
                {dia.data.getDate()}
              </span>
              {dia.checkins.length > 0 && (
                <div className="flex flex-col gap-1 print:gap-0.5">
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
                    <span className="px-1 text-[10px] text-muted-foreground print:text-[7px]">
                      +{dia.checkins.length - MAX_CARDS_POR_DIA} mais
                    </span>
                  )}
                </div>
              )}
              {dia.checkouts.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {dia.checkouts.slice(0, MAX_SAIDAS_POR_DIA).map((r) => (
                    <CheckoutBadge
                      key={`checkout-${r.id}`}
                      reserva={r}
                      selected={r.id === selectedReservaId}
                      onSelect={() => onSelectReserva(r.id)}
                    />
                  ))}
                  {dia.checkouts.length > MAX_SAIDAS_POR_DIA && (
                    <span className="px-1 text-[10px] text-muted-foreground print:text-[7px]">
                      +{dia.checkouts.length - MAX_SAIDAS_POR_DIA} saídas
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {Array.from({ length: trailing }, (_, i) => (
          <div key={`trail-${i}`} aria-hidden="true" />
        ))}
      </div>

      {ativoNaImpressao && statsImpressao && (
        <>
          <PrintReportLegend modoTodasCasas={modoTodasCasas} casas={casas} />
          <PrintReportFooter stats={statsImpressao} />
        </>
      )}
    </section>
  )
}

export interface CalendarViewHandle {
  /** Rola o feed até o mês pedido, esticando o range carregado se preciso.
   *  `instant` pula a animação (usado no primeiro load, pra não abrir a
   *  página já "rolando" na frente do usuário). */
  scrollToMonth: (date: Date, opts?: { instant?: boolean }) => void
}

interface CalendarViewProps {
  casas: Casa[]
  reservasCasa: Reserva[]
  modoTodasCasas: boolean
  selectedReservaId: number | null
  onSelectReserva: (id: number) => void
  /** Dispara sempre que o mês "em foco" (o que está no topo da viewport)
   *  muda durante a rolagem — o dashboard usa isso pro rótulo do cabeçalho,
   *  os cards de resumo e o botão de "voltar pro mês atual". */
  onMesFocoChange?: (mes: Date) => void
  /** Mês que deve sobreviver quando o usuário mandar imprimir — normalmente
   *  o próprio mês em foco. Os demais meses do feed somem só no papel
   *  (ver `ativoNaImpressao` em MonthSection); a rolagem na tela não muda. */
  mesAtivoImpressao?: Date
  /** "Nome da unidade" mostrado no cabeçalho do relatório impresso. */
  nomeUnidadeImpressao?: string
}

export const CalendarView = React.forwardRef<CalendarViewHandle, CalendarViewProps>(function CalendarView(
  {
    casas,
    reservasCasa,
    modoTodasCasas,
    selectedReservaId,
    onSelectReserva,
    onMesFocoChange,
    mesAtivoImpressao,
    nomeUnidadeImpressao,
  },
  ref
) {
  const hoje0 = React.useMemo(() => startOfMonth(new Date()), [])
  const [meses, setMeses] = React.useState<Date[]>(() => {
    const arr: Date[] = []
    for (let i = -MESES_INICIAIS_PASSADO; i <= MESES_INICIAIS_FUTURO; i++) arr.push(addMonths(hoje0, i))
    return arr
  })

  const sectionRefs = React.useRef(new Map<string, HTMLElement>())
  const topSentinelRef = React.useRef<HTMLDivElement>(null)
  const bottomSentinelRef = React.useRef<HTMLDivElement>(null)
  // Guarda a altura do documento no instante em que um mês é inserido *antes*
  // do topo, pra corrigir o scroll logo em seguida — sem isso, prepend faz a
  // página "pular" porque o conteúdo cresce acima do que o usuário está vendo.
  const prependAdjustRef = React.useRef<number | null>(null)
  const onMesFocoChangeRef = React.useRef(onMesFocoChange)
  React.useEffect(() => {
    onMesFocoChangeRef.current = onMesFocoChange
  })

  function setSectionRef(key: string) {
    return (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(key, el)
      else sectionRefs.current.delete(key)
    }
  }

  // Scrollspy: observa uma faixa fina logo abaixo do cabeçalho fixo — o mês
  // cuja seção estiver cruzando essa faixa é "o mês em foco" no momento.
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const key = (entry.target as HTMLElement).dataset.monthKey
          if (!key) continue
          const [y, m] = key.split("-").map(Number)
          onMesFocoChangeRef.current?.(new Date(y, m - 1, 1))
        }
      },
      { rootMargin: "-72px 0px -80% 0px", threshold: 0 }
    )
    sectionRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [meses])

  // Corrige o scroll depois de um prepend (ver prependAdjustRef acima).
  React.useLayoutEffect(() => {
    if (prependAdjustRef.current == null) return
    const diff = document.documentElement.scrollHeight - prependAdjustRef.current
    if (diff > 0) window.scrollBy(0, diff)
    prependAdjustRef.current = null
  }, [meses])

  // Rolagem infinita: sentinelas finas no topo e no fim do feed. Rolar perto
  // delas carrega mais um mês, até os limites de segurança.
  React.useEffect(() => {
    const topEl = topSentinelRef.current
    const bottomEl = bottomSentinelRef.current
    if (!topEl || !bottomEl) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (entry.target === bottomEl) {
            setMeses((ms) => {
              const ultimo = ms[ms.length - 1]
              if (!ultimo || ultimo.getTime() >= addMonths(hoje0, LIMITE_FUTURO).getTime()) return ms
              return [...ms, addMonths(ultimo, 1)]
            })
          } else if (entry.target === topEl) {
            setMeses((ms) => {
              const primeiro = ms[0]
              if (!primeiro || primeiro.getTime() <= addMonths(hoje0, -LIMITE_PASSADO).getTime()) return ms
              prependAdjustRef.current = document.documentElement.scrollHeight
              return [addMonths(primeiro, -1), ...ms]
            })
          }
        }
      },
      { rootMargin: "800px 0px 800px 0px" }
    )
    observer.observe(topEl)
    observer.observe(bottomEl)
    return () => observer.disconnect()
  }, [hoje0])

  React.useImperativeHandle(
    ref,
    () => ({
      scrollToMonth(date, opts) {
        const alvo = startOfMonth(date)
        const key = monthKey(alvo)

        const tentar = () => {
          const el = sectionRefs.current.get(key)
          if (!el) return false
          el.scrollIntoView({ behavior: opts?.instant ? "auto" : "smooth", block: "start" })
          return true
        }

        if (tentar()) return

        // Mês ainda não carregado no feed — estica o range pra incluir o
        // alvo e tenta rolar de novo no próximo frame, já com o DOM pronto.
        setMeses((ms) => {
          const primeiro = ms[0]
          const ultimo = ms[ms.length - 1]
          if (alvo.getTime() < primeiro.getTime()) {
            const novos: Date[] = []
            for (let d = alvo; d.getTime() < primeiro.getTime(); d = addMonths(d, 1)) novos.push(d)
            return [...novos, ...ms]
          }
          if (alvo.getTime() > ultimo.getTime()) {
            const novos: Date[] = []
            for (let d = addMonths(ultimo, 1); d.getTime() <= alvo.getTime(); d = addMonths(d, 1)) novos.push(d)
            return [...ms, ...novos]
          }
          return ms
        })
        requestAnimationFrame(() => requestAnimationFrame(tentar))
      },
    }),
    []
  )

  return (
    <div className="flex flex-col">
      <div ref={topSentinelRef} aria-hidden="true" className="h-px" />
      <div className="flex flex-col gap-10">
        {meses.map((mes) => (
          <MonthSection
            key={monthKey(mes)}
            mes={mes}
            sectionRef={setSectionRef(monthKey(mes))}
            casas={casas}
            reservasCasa={reservasCasa}
            modoTodasCasas={modoTodasCasas}
            selectedReservaId={selectedReservaId}
            onSelectReserva={onSelectReserva}
            ativoNaImpressao={mesAtivoImpressao ? isSameMonth(mes, mesAtivoImpressao) : false}
            nomeUnidadeImpressao={nomeUnidadeImpressao ?? "Todas as casas"}
          />
        ))}
      </div>
      <div ref={bottomSentinelRef} aria-hidden="true" className="h-px" />

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground print:hidden">
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
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-destructive/60" />
          Saída (check-out)
        </span>
      </div>
    </div>
  )
})
