import { Building2, Grid2x2, Home, PlusCircle, Settings, Wallet } from "lucide-react"
import { useNavigate } from "react-router-dom"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { corDaCasa } from "@/lib/colors"
import type { CasaSelecionada } from "@/hooks/use-aluguel-data"
import type { Casa } from "@/types"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  casas: Casa[]
  onSelectCasa: (id: CasaSelecionada) => void
  onOpenCasas: () => void
  onOpenConfig: () => void
  onHoje: () => void
}

export function CommandMenu({ open, onOpenChange, casas, onSelectCasa, onOpenCasas, onOpenConfig, onHoje }: CommandMenuProps) {
  const navigate = useNavigate()

  function runAndClose(fn: () => void) {
    fn()
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Busca rápida" description="Navegue pelo app">
      <CommandInput placeholder="Buscar casa ou ação…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Casas">
          <CommandItem onSelect={() => runAndClose(() => onSelectCasa("todas"))}>
            <Grid2x2 />
            Todas as Casas
          </CommandItem>
          {casas.map((c) => (
            <CommandItem key={c.id} onSelect={() => runAndClose(() => onSelectCasa(c.id))}>
              <span className="size-2.5 rounded-full" style={{ background: corDaCasa(casas, c.id) }} />
              {c.nome}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ações">
          <CommandItem onSelect={() => runAndClose(onHoje)}>
            <Home />
            Ir para hoje
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => navigate("/ganhos"))}>
            <Wallet />
            Abrir Setor de Ganhos
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(onOpenCasas)}>
            <Building2 />
            Gerenciar Casas
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(onOpenCasas)}>
            <PlusCircle />
            Nova Casa
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(onOpenConfig)}>
            <Settings />
            Configurações
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
