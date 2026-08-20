import * as React from "react"
import { PlusCircle } from "lucide-react"

import { ReservaForm } from "@/components/reserva-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Casa } from "@/types"
import type { CasaSelecionada, ReservaPayload } from "@/hooks/use-aluguel-data"

interface NovaReservaDialogProps {
  casas: Casa[]
  casaAtualId: CasaSelecionada
  modoTodasCasas: boolean
  comissaoMarcioPercentual: number
  onCriarReserva: (payload: ReservaPayload) => Promise<{ ok: boolean }>
}

// Antes o formulário ficava sempre aberto na tela — virou esse dialog pra
// não deixar o dashboard poluído; só aparece quando o usuário clica.
export function NovaReservaDialog({
  casas,
  casaAtualId,
  modoTodasCasas,
  comissaoMarcioPercentual,
  onCriarReserva,
}: NovaReservaDialogProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle data-icon="inline-start" /> Adicionar Reserva
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>+ Nova Reserva</DialogTitle>
          <DialogDescription className="sr-only">Cadastre uma nova reserva manualmente ou por print.</DialogDescription>
        </DialogHeader>
        <ReservaForm
          casas={casas}
          casaAtualId={casaAtualId}
          modoTodasCasas={modoTodasCasas}
          comissaoMarcioPercentual={comissaoMarcioPercentual}
          onCriarReserva={onCriarReserva}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
