import * as React from "react"
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"

import { AppSidebar } from "@/components/app-sidebar"
import { CasasDialog } from "@/components/casas-dialog"
import { CommandMenu } from "@/components/command-menu"
import { ConfigDialog } from "@/components/config-dialog"
import { EditarReservaDialog } from "@/components/editar-reserva-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useTheme } from "@/components/theme-provider"
import { ConfirmProvider } from "@/hooks/use-confirm"
import { useAluguelData, type CasaSelecionada } from "@/hooks/use-aluguel-data"
import { DashboardPage } from "@/pages/dashboard-page"
import { GanhosPage } from "@/pages/ganhos-page"

function LoadingShell() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="w-full max-w-4xl space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}

function AppShell() {
  const data = useAluguelData()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [casasOpen, setCasasOpen] = React.useState(false)
  const [configOpen, setConfigOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<number | null>(null)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [mesAtual, setMesAtual] = React.useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  function mudarMes(delta: number) {
    setMesAtual((atual) => {
      const novo = new Date(atual)
      novo.setMonth(novo.getMonth() + delta)
      return novo
    })
  }

  function irParaHoje() {
    const hoje = new Date()
    hoje.setDate(1)
    setMesAtual(hoje)
    navigate("/")
  }

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCommandOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const editReserva = editId ? (data.reservas.find((r) => r.id === editId) ?? null) : null

  function handleSelectCasa(id: CasaSelecionada) {
    data.setCasaAtualId(id)
    navigate("/")
  }

  if (data.loading) return <LoadingShell />

  return (
    <SidebarProvider>
      <AppSidebar
        casas={data.casas}
        casaAtualId={data.casaAtualId}
        onSelectCasa={handleSelectCasa}
        onOpenCasas={() => setCasasOpen(true)}
        onOpenConfig={() => setConfigOpen(true)}
        onOpenCommand={() => setCommandOpen(true)}
      />
      <SidebarInset>
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                data={data}
                onOpenCasas={() => setCasasOpen(true)}
                onEditReserva={setEditId}
                mesAtual={mesAtual}
                onMudarMes={mudarMes}
                onHoje={irParaHoje}
              />
            }
          />
          <Route
            path="/ganhos"
            element={<GanhosPage casas={data.casas} reservas={data.reservas} casaAtualId={data.casaAtualId} />}
          />
        </Routes>
      </SidebarInset>

      <CasasDialog
        open={casasOpen}
        onOpenChange={setCasasOpen}
        casas={data.casas}
        reservas={data.reservas}
        onCriar={data.criarCasa}
        onAtualizar={data.atualizarCasa}
        onDeletar={data.deletarCasa}
      />

      <EditarReservaDialog
        reserva={editReserva}
        comissaoMarcioPercentual={data.config.comissao_marcio_percentual}
        onOpenChange={(open) => !open && setEditId(null)}
        onSalvar={data.atualizarReserva}
      />

      <ConfigDialog open={configOpen} onOpenChange={setConfigOpen} config={data.config} onSalvar={data.atualizarConfig} />

      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        casas={data.casas}
        onSelectCasa={handleSelectCasa}
        onOpenCasas={() => setCasasOpen(true)}
        onOpenConfig={() => setConfigOpen(true)}
        onHoje={irParaHoje}
      />

      <Toaster theme={theme === "system" ? undefined : theme} richColors position="bottom-center" />
    </SidebarProvider>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider>
        <AppShell />
      </ConfirmProvider>
    </BrowserRouter>
  )
}

export default App
