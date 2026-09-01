import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, BellRing, ChevronLeft, ChevronRight, Home as HomeIcon, ListChecks, Printer } from "lucide-react"

import { AlertasPanel } from "@/components/alertas-panel"
import { CalendarView, type CalendarViewHandle } from "@/components/calendar-view"
import { NovaReservaDialog } from "@/components/nova-reserva-dialog"
import { ReservaSelecionadaPanel } from "@/components/reserva-selecionada-panel"
import { ReservasSection } from "@/components/reservas-section"
import { SummaryCards } from "@/components/summary-cards"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { formatBRLCompacto } from "@/lib/format"
import type { UseAluguelData } from "@/hooks/use-aluguel-data"
import type { StatusReserva } from "@/types"

function inicioDoMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

interface DashboardPageProps {
  data: UseAluguelData
  onOpenCasas: () => void
  onEditReserva: (id: number) => void
  /** Incrementa a cada "Ir para hoje" disparado de fora (ex: Command Menu),
   *  pra rolar o feed mesmo quando o clique não veio do cabeçalho local. */
  hojeSignal: number
  onHoje: () => void
}

export function DashboardPage({ data, onOpenCasas, onEditReserva, hojeSignal, onHoje }: DashboardPageProps) {
  const modoTodasCasas = data.casaAtualId === "todas"
  const reservasCasa = React.useMemo(
    () => (modoTodasCasas ? data.reservas : data.reservas.filter((r) => r.casa_id === data.casaAtualId)),
    [data.reservas, data.casaAtualId, modoTodasCasas]
  )
  // "Unidade" que aparece no cabeçalho do relatório impresso.
  const nomeUnidadeImpressao = modoTodasCasas
    ? "Todas as casas"
    : (data.casas.find((c) => c.id === data.casaAtualId)?.nome ?? "—")

  const calendarRef = React.useRef<CalendarViewHandle>(null)
  // "Mês em foco" — o que está visível no topo do feed contínuo agora. Some
  // no rótulo do cabeçalho e alimenta os cards de resumo, atualizando sozinho
  // conforme o usuário rola (ver CalendarView.onMesFocoChange).
  const [mesFoco, setMesFoco] = React.useState<Date>(() => inicioDoMes(new Date()))
  const nomeMes = mesFoco.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  // Rola o feed pro mês de hoje no primeiro load (instantâneo, sem animação)
  // e de novo a cada "Ir para hoje" disparado de fora (suave). O rótulo do
  // cabeçalho e os cards de resumo não são atualizados aqui — eles seguem o
  // scrollspy do próprio CalendarView (onMesFocoChange), que confirma o
  // mês assim que o scroll chega lá.
  const isMountRef = React.useRef(true)
  React.useEffect(() => {
    const instant = isMountRef.current
    isMountRef.current = false
    calendarRef.current?.scrollToMonth(inicioDoMes(new Date()), { instant })
  }, [hojeSignal])

  // O feed só existe quando há casa cadastrada (antes disso é o estado
  // vazio). Se a primeira casa nasce com o usuário já na página, o
  // CalendarView monta pela primeira vez aqui — sem isso ele nasceria
  // rolado pro topo (2 meses atrás) em vez de já abrir no mês de hoje.
  const tinhaCasasRef = React.useRef(data.casas.length > 0)
  React.useEffect(() => {
    if (!tinhaCasasRef.current && data.casas.length > 0) {
      calendarRef.current?.scrollToMonth(inicioDoMes(new Date()), { instant: true })
    }
    tinhaCasasRef.current = data.casas.length > 0
  }, [data.casas.length])

  function handleMudarMes(delta: number) {
    const alvo = new Date(mesFoco.getFullYear(), mesFoco.getMonth() + delta, 1)
    setMesFoco(alvo)
    calendarRef.current?.scrollToMonth(alvo)
  }

  const hojeMesReal = React.useMemo(() => inicioDoMes(new Date()), [])
  const foraDoMesAtual = mesFoco.getTime() !== hojeMesReal.getTime()

  const [selectedReservaId, setSelectedReservaId] = React.useState<number | null>(null)
  const [highlightReservaId, setHighlightReservaId] = React.useState<number | null>(null)
  // Controla o Sheet lateral (Alertas OU Reserva selecionada, nunca os dois
  // — o conteúdo é decidido por `reservaSelecionada` existir ou não). Fica
  // separado de `selectedReservaId` pra permitir fechar o painel sem perder
  // o anel de seleção no calendário até a próxima escolha.
  const [painelAberto, setPainelAberto] = React.useState(false)

  // Se a reserva selecionada sumir (excluída, cancelada some da lista, etc.),
  // esse find dá null e o painel volta sozinho pros Alertas — sem precisar
  // de efeito nenhum pra "limpar" a seleção.
  const reservaSelecionada = React.useMemo(
    () => data.reservas.find((r) => r.id === selectedReservaId) ?? null,
    [data.reservas, selectedReservaId]
  )

  const totalPeriodo = React.useMemo(
    () => reservasCasa.filter((r) => r.status !== "cancelada").reduce((s, r) => s + (Number(r.valor_total) || 0), 0),
    [reservasCasa]
  )

  function handleSelectReserva(id: number) {
    setSelectedReservaId(id)
    setPainelAberto(true)
  }

  function handleAbrirAlertas() {
    setSelectedReservaId(null)
    setPainelAberto(true)
  }

  function handlePainelOpenChange(open: boolean) {
    setPainelAberto(open)
    if (!open) setSelectedReservaId(null)
  }

  function handleVerDetalhes(id: number) {
    setPainelAberto(false)
    setHighlightReservaId(id)
    document.getElementById(`reserva-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    window.setTimeout(() => setHighlightReservaId((atual) => (atual === id ? null : atual)), 2000)
  }

  function handleEditar(id: number) {
    setPainelAberto(false)
    onEditReserva(id)
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur print:hidden">
        <SidebarTrigger />
        <ButtonGroup>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={() => handleMudarMes(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <ButtonGroupText className="h-7 min-w-32 justify-center border-transparent bg-transparent text-base font-bold tracking-tight capitalize">
            {nomeMes}
          </ButtonGroupText>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={() => handleMudarMes(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </ButtonGroup>
        <Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={onHoje}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" className="size-7" onClick={handleAbrirAlertas}>
          <BellRing className="size-4" />
          <span className="sr-only">Alertas</span>
        </Button>
        {data.casas.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => window.print()}
              title="Imprimir / Exportar PDF"
            >
              <Printer className="size-4" />
              <span className="sr-only">Imprimir / Exportar PDF</span>
            </Button>
            <NovaReservaDialog
              casas={data.casas}
              casaAtualId={data.casaAtualId}
              modoTodasCasas={modoTodasCasas}
              comissaoMarcioPercentual={data.config.comissao_marcio_percentual}
              onCriarReserva={data.criarReserva}
            />
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 pb-28 sm:p-6 sm:pb-28">
        {data.casas.length === 0 ? (
          <Empty className="mx-auto max-w-md py-20">
            <EmptyMedia variant="icon">
              <HomeIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhuma casa cadastrada ainda</EmptyTitle>
            <EmptyDescription>Clique em "Nova casa" na barra lateral para começar a organizar suas reservas.</EmptyDescription>
            <Button className="mt-2" onClick={onOpenCasas}>
              + Criar primeira casa
            </Button>
          </Empty>
        ) : (
          <>
            <div className="print:hidden">
              <SummaryCards reservasCasa={reservasCasa} mesAtual={mesFoco} />
            </div>

            {/* Feed vertical contínuo — os meses rolam em sequência (estilo
                Airbnb Host Calendar) em vez de paginar um mês por vez. A
                tabela de reservas saiu daqui: agora vive no Bottom Sheet
                aberto pela pílula flutuante logo abaixo. Na impressão só o
                mês em foco (`mesFoco`) sobrevive — ver CalendarView. */}
            <CalendarView
              ref={calendarRef}
              casas={data.casas}
              reservasCasa={reservasCasa}
              modoTodasCasas={modoTodasCasas}
              selectedReservaId={selectedReservaId}
              onSelectReserva={handleSelectReserva}
              onMesFocoChange={setMesFoco}
              mesAtivoImpressao={mesFoco}
              nomeUnidadeImpressao={nomeUnidadeImpressao}
            />
          </>
        )}
      </main>

      {data.casas.length > 0 && (
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100%-2rem)] -translate-x-1/2 cursor-pointer items-center gap-3 rounded-full bg-foreground px-5 py-2.5 text-background shadow-2xl transition-transform hover:scale-105 active:scale-100 print:hidden"
            >
              <ListChecks className="size-4 shrink-0" />
              <span className="truncate text-sm font-medium">
                Ver todas as reservas{" "}
                <span className="font-mono tabular-nums">
                  ({reservasCasa.length} {reservasCasa.length === 1 ? "cadastrada" : "cadastradas"})
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-background/15 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums">
                {formatBRLCompacto(totalPeriodo)}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            style={{ height: "min(85vh, 46rem)" }}
            className="flex flex-col gap-0 rounded-t-3xl p-0 print:hidden"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-muted" aria-hidden="true" />
            <SheetHeader className="border-b border-border px-4 pt-2 pb-3">
              <SheetTitle>Todas as reservas</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <ReservasSection
                casas={data.casas}
                reservasCasaTotal={reservasCasa}
                modoTodasCasas={modoTodasCasas}
                highlightReservaId={highlightReservaId}
                onEdit={onEditReserva}
                onDelete={data.deletarReserva}
                onStatusChange={(id: number, status: StatusReserva) => data.atualizarStatusReserva(id, status)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <AnimatePresence>
        {data.casas.length > 0 && foraDoMesAtual && (
          <motion.button
            type="button"
            onClick={onHoje}
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed right-4 bottom-24 z-40 flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-colors hover:bg-accent sm:right-6 print:hidden"
            aria-label="Voltar para o mês atual"
            title="Voltar para o mês atual"
          >
            <ArrowUp className="size-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet open={painelAberto} onOpenChange={handlePainelOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-sm print:hidden">
          <SheetHeader className="border-b border-border">
            <SheetTitle>{reservaSelecionada ? "Reserva selecionada" : "Alertas"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {reservaSelecionada ? (
              <ReservaSelecionadaPanel
                reserva={reservaSelecionada}
                casas={data.casas}
                onEdit={() => handleEditar(reservaSelecionada.id)}
                onVerDetalhes={() => handleVerDetalhes(reservaSelecionada.id)}
                onCancelar={(id) => data.atualizarStatusReserva(id, "cancelada")}
              />
            ) : (
              <AlertasPanel
                reservasCasa={reservasCasa}
                modoTodasCasas={modoTodasCasas}
                casas={data.casas}
                onEditReserva={handleEditar}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
