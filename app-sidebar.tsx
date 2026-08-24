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
import { cn } from "@/lib/utils"
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-0 border-b border-sidebar-border px-3 py-3.5">
        <div className="flex items-center gap-2.5 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Home className="size-4 text-white" strokeWidth={2.3} />
          </span>
          <div className="text-[15px] leading-tight font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            <span>GESTÃO</span> <span className="text-sidebar-foreground/60">DE ALUGUEL</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Casas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={casaAtualId === "todas"}
                  onClick={() => onSelectCasa("todas")}
                  tooltip="Todas as Casas"
                  className={cn(
                    "transition-colors duration-150",
                    casaAtualId === "todas" && "bg-primary/10 font-medium text-primary hover:bg-primary/15 hover:text-primary dark:bg-primary/15 dark:hover:bg-primary/20"
                  )}
                >
                  <Grid2x2 />
                  <span>Todas as Casas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {casas.map((casa, i) => (
                <SidebarMenuItem key={casa.id} className="animate-stagger-in" style={{ animationDelay: `${i * 45}ms` }}>
                  <SidebarMenuButton
                    isActive={casaAtualId === casa.id}
                    onClick={() => onSelectCasa(casa.id)}
                    tooltip={casa.nome}
                    className={cn(
                      "transition-colors duration-150",
                      casaAtualId === casa.id && "bg-primary/10 font-medium text-primary hover:bg-primary/15 hover:text-primary dark:bg-primary/15 dark:hover:bg-primary/20"
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: corDaCasa(casas, casa.id) }}
                    />
                    <span className="truncate">{casa.nome}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenCasas}
                  tooltip="Nova casa"
                  className="text-sidebar-foreground/70 transition-colors duration-150"
                >
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
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/ganhos"}
                  tooltip="Setor de Ganhos"
                  className={cn(
                    "transition-colors duration-150",
                    location.pathname === "/ganhos" && "bg-primary/10 font-medium text-primary hover:bg-primary/15 hover:text-primary dark:bg-primary/15 dark:hover:bg-primary/20"
                  )}
                >
                  <NavLink to="/ganhos">
                    <Wallet />
                    <span>Setor de Ganhos</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenCasas} tooltip="Gerenciar Casas" className="transition-colors duration-150">
                  <Building2 />
                  <span>Gerenciar Casas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenConfig} tooltip="Configurações" className="transition-colors duration-150">
                  <Settings />
                  <span>Configurações</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onOpenCommand}
              tooltip="Busca rápida"
              className="text-sidebar-foreground/60 transition-colors duration-150"
            >
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
