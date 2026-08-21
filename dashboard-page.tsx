import * as React from "react"
import { ChevronLeft, ChevronRight, Home as HomeIcon } from "lucide-react"

import { AlertasPanel } from "@/components/alertas-panel"
import { CalendarView } from "@/components/calendar-view"
import { NovaReservaDialog } from "@/components/nova-reserva-dialog"
import { ReservaSelecionadaPanel } from "@/components/reserva-selecionada-panel"
import { ReservasSection } from "@/components/reservas-section"
import { SummaryCards } from "@/components/summary-cards"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
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

  // Se a reserva selecionada sumir (excluída, cancelada some da lista, etc.),
  // esse find dá null e o painel volta sozinho pros Alertas — sem precisar
  // de efeito nenhum pra "limpar" a seleção.
  const reservaSelecionada = React.useMemo(
    () => data.reservas.find((r) => r.id === selectedReservaId) ?? null,
    [data.reservas, selectedReservaId]
  )

  function handleVerDetalhes(id: number) {
    setHighlightReservaId(id)
    document.getElementById(`reserva-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    window.setTimeout(() => setHighlightReservaId((atual) => (atual === id ? null : atual)), 2000)
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur">
        <SidebarTrigger />
        <ButtonGroup>
          <Button variant="outline" size="icon" className="size-7" onClick={() => onMudarMes(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <ButtonGroupText className="h-7 min-w-32 justify-center border-transparent bg-transparent font-heading capitalize">
            {nomeMes}
          </ButtonGroupText>
          <Button variant="outline" size="icon" className="size-7" onClick={() => onMudarMes(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </ButtonGroup>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onHoje}>
          Hoje
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <CalendarView
                casas={data.casas}
                reservasCasa={reservasCasa}
                modoTodasCasas={modoTodasCasas}
                mesAtual={mesAtual}
                selectedReservaId={selectedReservaId}
                onSelectReserva={setSelectedReservaId}
              />
              {reservaSelecionada ? (
                <ReservaSelecionadaPanel
                  reserva={reservaSelecionada}
                  casas={data.casas}
                  onEdit={() => onEditReserva(reservaSelecionada.id)}
                  onVerDetalhes={() => handleVerDetalhes(reservaSelecionada.id)}
                  onCancelar={(id) => data.atualizarStatusReserva(id, "cancelada")}
                  onFechar={() => setSelectedReservaId(null)}
                />
              ) : (
                <AlertasPanel
                  reservasCasa={reservasCasa}
                  modoTodasCasas={modoTodasCasas}
                  casas={data.casas}
                  onEditReserva={onEditReserva}
                />
              )}
            </div>

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
    </>
  )
}
