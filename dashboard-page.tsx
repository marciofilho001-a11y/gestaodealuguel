import * as React from "react"
import { BellRing, ChevronLeft, ChevronRight, Home as HomeIcon } from "lucide-react"

import { AlertasPanel } from "@/components/alertas-panel"
import { CalendarView } from "@/components/calendar-view"
import { NovaReservaDialog } from "@/components/nova-reserva-dialog"
import { ReservaSelecionadaPanel } from "@/components/reserva-selecionada-panel"
import { ReservasSection } from "@/components/reservas-section"
import { SummaryCards } from "@/components/summary-cards"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { UseAluguelData } from "@/hooks/use-aluguel-data"
import type { StatusReserva } from "@/types"

interface DashboardPageProps {
  data: UseAluguelData
  onOpenCasas: () => void
  onEditReserva: (id: number) => void
  mesAtual: Date
  onMudarMes: (delta: number) => void
  onHoje: () => void
}

export function DashboardPage({ data, onOpenCasas, onEditReserva, mesAtual, onMudarMes, onHoje }: DashboardPageProps) {
  const modoTodasCasas = data.casaAtualId === "todas"
  const reservasCasa = React.useMemo(
    () => (modoTodasCasas ? data.reservas : data.reservas.filter((r) => r.casa_id === data.casaAtualId)),
    [data.reservas, data.casaAtualId, modoTodasCasas]
  )
  const nomeMes = mesAtual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

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
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur">
        <SidebarTrigger />
        <ButtonGroup>
          <Button variant="outline" size="icon" className="size-7" onClick={() => onMudarMes(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <ButtonGroupText className="h-7 min-w-32 justify-center border-transparent bg-transparent capitalize">
            {nomeMes}
          </ButtonGroupText>
          <Button variant="outline" size="icon" className="size-7" onClick={() => onMudarMes(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </ButtonGroup>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onHoje}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" className="size-7" onClick={handleAbrirAlertas}>
          <BellRing className="size-4" />
          <span className="sr-only">Alertas</span>
        </Button>
        {data.casas.length > 0 && (
          <div className="ml-auto">
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

      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
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
            <SummaryCards reservasCasa={reservasCasa} mesAtual={mesAtual} />

            {/* Calendário ocupa a largura inteira agora — o painel de
                alertas/reserva não espreme mais as colunas, vive num Sheet
                flutuante aberto sob demanda (ver abaixo). */}
            <CalendarView
              casas={data.casas}
              reservasCasa={reservasCasa}
              modoTodasCasas={modoTodasCasas}
              mesAtual={mesAtual}
              selectedReservaId={selectedReservaId}
              onSelectReserva={handleSelectReserva}
            />

            <ReservasSection
              casas={data.casas}
              reservasCasaTotal={reservasCasa}
              modoTodasCasas={modoTodasCasas}
              highlightReservaId={highlightReservaId}
              onEdit={onEditReserva}
              onDelete={data.deletarReserva}
              onStatusChange={(id: number, status: StatusReserva) => data.atualizarStatusReserva(id, status)}
            />
          </>
        )}
      </main>

      <Sheet open={painelAberto} onOpenChange={handlePainelOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-sm">
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
