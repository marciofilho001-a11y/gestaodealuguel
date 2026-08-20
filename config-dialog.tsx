import * as React from "react"
import { Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import type { Config } from "@/types"

interface ConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: Config
  onSalvar: (comissaoMarcioPercentual: number) => Promise<boolean>
}

export function ConfigDialog({ open, onOpenChange, config, onSalvar }: ConfigDialogProps) {
  const [percentual, setPercentual] = React.useState(String(config.comissao_marcio_percentual))
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta campo local ao abrir o dialog
    if (open) setPercentual(String(config.comissao_marcio_percentual))
  }, [open, config.comissao_marcio_percentual])

  async function handleSalvar() {
    const valor = parseFloat(percentual.replace(",", ".")) || 0
    setSaving(true)
    const ok = await onSalvar(valor)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-4.5 text-primary" /> Configurações
          </DialogTitle>
          <DialogDescription>Ajustes gerais do app.</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="config-comissao-marcio">Comissão Marcio Filho</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="config-comissao-marcio"
                type="number"
                step="0.01"
                min="0"
                max="100"
                inputMode="decimal"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
              />
              <InputGroupAddon align="inline-end">%</InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              Aplicada automaticamente sobre o valor total de cada reserva nova (ou quando você editar uma). Reservas
              já salvas mantêm o valor calculado na época — mudar aqui não altera o histórico.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
