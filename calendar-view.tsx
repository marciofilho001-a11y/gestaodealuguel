import * as React from "react"
import { motion } from "framer-motion"
import { DoorOpen } from "lucide-react"

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

function ReservaDayCard({ reserva, casas, modoTodasCasas, selected, onSelect }: ReservaDayCardProps) {
  const cor = modoTodasCasas
    ? corDaCasa(casas, reserva.casa_id)
    : PLATFORM_COLOR[reserva.plataforma] || PLATFORM_COLOR.Outro

  // O dia do check-in já é a própria posição do card no grid — repetir a
  // data de chegada aqui dentro seria redundante. Só a saída importa.
  const nomeAbreviado = abreviarNome(reserva.hospede) || "(sem nome)"

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex w-full min-w-0 flex-col items-start gap-0.5 rounded-lg border p-2 text-left leading-tight shadow-none transition-[background-color,border-color,box-shadow] hover:shadow-sm",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/70 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-accent/40"
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
      <span className="w-full min-w-0 truncate font-mono text-[11px] leading-tight tabular-nums text-emerald-700/80 dark:text-muted-foreground">
        → {formatDiaMes(reserva.checkout)}
      </span>
      <span className="w-full min-w-0 truncate font-mono text-[11px] leading-tight font-bold tabular-nums text-emerald-800 dark:text-emerald-400">
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

// Aviso compacto de saída — deliberadamente menor e mais discreto que o
// card de check-in, só pra sinalizar "casa libera hoje" de relance.
function CheckoutBadge({ reserva, selected, onSelect }: CheckoutBadgeProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 rounded-md border p-1.5 text-left leading-tight transition-[background-color,border-color,box-shadow] hover:shadow-sm",
        selected
          ? "border-rose-400 bg-rose-100 text-rose-900 ring-1 ring-rose-400 dark:border-destructive dark:bg-destructive/15 dark:text-destructive dark:ring-destructive"
          : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100/70 dark:border-destructive/25 dark:bg-destructive/5 dark:text-destructive/80 dark:hover:bg-destructive/10"
      )}
    >
      <DoorOpen className="size-3 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[11px] leading-tight font-medium">
        Saída: {abreviarNome(reserva.hospede) || "(sem nome)"}
      </span>
    </motion.button>
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
}

function MonthSection({
  mes,
  sectionRef,
  casas,
  reservasCasa,
  modoTodasCasas,
  selectedReservaId,
  onSelectReserva,
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

  return (
    <section ref={sectionRef} data-month-key={key} className="scroll-mt-16">
      <div className="mb-3 flex items-baseline gap-2.5 px-0.5">
        <h2 className="text-2xl font-bold tracking-tight text-foreground capitalize">{nomeMes}</h2>
        {ehMesAtual && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            mês atual
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {DOWS.map((d) => (
          <div key={d} className="py-1 text-center font-mono text-[10.5px] font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
        {Array.from({ length: primeiroDiaSemana }, (_, i) => (
          <div key={`lead-${i}`} aria-hidden="true" />
        ))}
        {dias.map((dia) => (
          <div
            key={dia.data.toISOString()}
            className={cn(
              "flex min-h-32 min-w-0 flex-col gap-1.5 rounded-2xl border border-border bg-card/60 p-2 text-[11.5px] sm:min-h-40",
              dia.isToday && "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
            )}
          >
            <span className={cn("px-0.5 font-semibold", dia.isToday ? "text-primary" : "text-foreground")}>
              {dia.data.getDate()}
            </span>
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
        {Array.from({ length: trailing }, (_, i) => (
          <div key={`trail-${i}`} aria-hidden="true" />
        ))}
      </div>
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
}

export const CalendarView = React.forwardRef<CalendarViewHandle, CalendarViewProps>(function CalendarView(
  { casas, reservasCasa, modoTodasCasas, selectedReservaId, onSelectReserva, onMesFocoChange },
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
          />
        ))}
      </div>
      <div ref={bottomSentinelRef} aria-hidden="true" className="h-px" />

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
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
    </div>
  )
})
