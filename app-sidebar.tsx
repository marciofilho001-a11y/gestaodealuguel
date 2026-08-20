import { Building2, Command, Grid2x2, Home, PlusCircle, Settings, Wallet } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import { Kbd } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { corDaCasa } from "@/lib/colors"
import type { Casa } from "@/types"
import type { CasaSelecionada } from "@/hooks/use-aluguel-data"

interface AppSidebarProps {
  casas: Casa[]
  casaAtualId: CasaSelecionada
  onSelectCasa: (id: CasaSelecionada) => void
  onOpenCasas: () => void
  onOpenConfig: () => void
  onOpenCommand: () => void
}

export function AppSidebar({
  casas,
  casaAtualId,
  onSelectCasa,
  onOpenCasas,
  onOpenConfig,
  onOpenCommand,
}: AppSidebarProps) {
  const location = useLocation()
  return (
    <Sidebar>
      <SidebarHeader className="gap-0 border-b border-sidebar-border/60 px-3 py-3.5">
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#124C52] shadow-sm">
            <Home className="size-4 text-white" strokeWidth={2.3} />
          </span>
          <div className="font-display text-[15px] leading-tight font-semibold tracking-wide">
            <span>GESTÃO</span> <span className="text-sidebar-foreground/55">DE ALUGUEL</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Casas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={casaAtualId === "todas"} onClick={() => onSelectCasa("todas")}>
                  <Grid2x2 />
                  <span>Todas as Casas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {casas.map((casa, i) => (
                <SidebarMenuItem key={casa.id} className="animate-stagger-in" style={{ animationDelay: `${i * 45}ms` }}>
                  <SidebarMenuButton isActive={casaAtualId === casa.id} onClick={() => onSelectCasa(casa.id)}>
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: corDaCasa(casas, casa.id) }}
                    />
                    <span className="truncate">{casa.nome}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenCasas} className="text-sidebar-foreground/70">
                  <PlusCircle />
                  <span>Nova casa</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/ganhos"}>
                  <NavLink to="/ganhos">
                    <Wallet />
                    <span>Setor de Ganhos</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenCasas}>
                  <Building2 />
                  <span>Gerenciar Casas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenConfig}>
                  <Settings />
                  <span>Configurações</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenCommand} className="text-sidebar-foreground/60">
              <Command />
              <span>Busca rápida</span>
              <Kbd className="ml-auto">⌘K</Kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
