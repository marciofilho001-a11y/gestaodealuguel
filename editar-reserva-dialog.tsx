import * as React from "react"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DatePickerField } from "@/components/date-picker-field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { calcularNoites, formatBRL } from "@/lib/format"
import type { ReservaPayload } from "@/hooks/use-aluguel-data"
import type { Reserva } from "@/types"

interface EditarReservaDialogProps {
  reserva: Reserva | null
  comissaoMarcioPercentual: number
  onOpenChange: (open: boolean) => void
  onSalvar: (id: number, payload: ReservaPayload) => Promise<{ ok: boolean }>
}

const PLATAFORMAS = ["Airbnb", "Booking", "Outro"] as const
const STATUS_OPCOES = [
  { value: "confirmada", label: "Confirmada" },
  { value: "aguardando_pagamento", label: "Aguard. Pagto" },
  { value: "cancelada", label: "Cancelada" },
] as const

export function EditarReservaDialog({ reserva, comissaoMarcioPercentual, onOpenChange, onSalvar }: EditarReservaDialogProps) {
  const [plataforma, setPlataforma] = React.useState("Airbnb")
  const [hospede, setHospede] = React.useState("")
  const [checkin, setCheckin] = React.useState("")
  const [checkout, setCheckout] = React.useState("")
  const [valorAluguel, setValorAluguel] = React.useState("")
  const [limpeza, setLimpeza] = React.useState("")
  const [desconto, setDesconto] = React.useState("")
  const [comissaoPlataforma, setComissaoPlataforma] = React.useState(0)
  const [comissaoMarcio, setComissaoMarcio] = React.useState("")
  const [comissaoMarcioManual, setComissaoMarcioManual] = React.useState(true)
  const [status, setStatus] = React.useState("confirmada")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!reserva) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preenche o form local a partir da prop
    setPlataforma(reserva.plataforma || "Airbnb")
    setHospede(reserva.hospede || "")
    setCheckin(reserva.checkin)
    setCheckout(reserva.checkout)
    const aluguelTotal = (reserva.valor_total || 0) - (reserva.taxa_limpeza || 0) + (reserva.desconto || 0)
    setValorAluguel(aluguelTotal ? aluguelTotal.toFixed(2) : "")
    setLimpeza(reserva.taxa_limpeza ? String(reserva.taxa_limpeza) : "")
    setDesconto(reserva.desconto ? String(reserva.desconto) : "")
    setComissaoPlataforma(reserva.comissao_plataforma || 0)
    setComissaoMarcio(reserva.comissao_marcio ? String(reserva.comissao_marcio) : "")
    setComissaoMarcioManual(true) // preserva o valor já salvo em vez de recalcular por cima
    setStatus(reserva.status || "confirmada")
  }, [reserva])

  const { noites, mediaPorNoite, comissaoMarcioSugerida } = React.useMemo(() => {
    const n = calcularNoites(checkin, checkout)
    const aluguel = parseFloat(valorAluguel) || 0
    const l = parseFloat(limpeza) || 0
    const desc = parseFloat(desconto) || 0
    const total = aluguel + l - desc
    return {
      noites: n,
      mediaPorNoite: n > 0 ? aluguel / n : 0,
      comissaoMarcioSugerida: total * (comissaoMarcioPercentual / 100),
    }
  }, [checkin, checkout, valorAluguel, limpeza, desconto, comissaoMarcioPercentual])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza sugestão com os outros campos até o usuário digitar o próprio valor
    if (!comissaoMarcioManual) setComissaoMarcio(comissaoMarcioSugerida > 0 ? comissaoMarcioSugerida.toFixed(2) : "")
  }, [comissaoMarcioSugerida, comissaoMarcioManual])

  async function handleSalvar() {
    if (!reserva) return
    if (!hospede.trim() || !checkin || !checkout) return
    setSaving(true)
    const res = await onSalvar(reserva.id, {
      casa_id: reserva.casa_id as number,
      plataforma,
      hospede: hospede.trim(),
      checkin,
      checkout,
      valor_diaria: mediaPorNoite,
      taxa_limpeza: parseFloat(limpeza) || 0,
      desconto: parseFloat(desconto) || 0,
      comissao_plataforma: comissaoPlataforma,
      comissao_marcio: parseFloat(comissaoMarcio) || 0,
      status,
    })
    setSaving(false)
    if (res.ok) onOpenChange(false)
  }

  return (
    <Dialog open={!!reserva} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Reserva</DialogTitle>
          <DialogDescription className="sr-only">Atualize os dados desta reserva.</DialogDescription>
        </DialogHeader>

        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Plataforma</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={plataforma}
              onValueChange={(v) => v && setPlataforma(v)}
              className="w-full"
            >
              {PLATAFORMAS.map((p) => (
                <ToggleGroupItem key={p} value={p} className="flex-1">
                  {p}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-res-hospede">Hóspede</FieldLabel>
            <Input id="edit-res-hospede" placeholder="Nome" value={hospede} onChange={(e) => setHospede(e.target.value)} />
          </Field>

          <DatePickerField id="edit-res-checkin" label="Check-in" value={checkin} onChange={setCheckin} />
          <DatePickerField id="edit-res-checkout" label="Check-out" value={checkout} onChange={setCheckout} />

          <Field>
            <FieldLabel htmlFor="edit-res-valor-aluguel">Valor do aluguel (total da estadia)</FieldLabel>
            <Input
              id="edit-res-valor-aluguel"
              type="number"
              step="0.01"
              className="font-mono"
              value={valorAluguel}
              onChange={(e) => setValorAluguel(e.target.value)}
            />
            {noites > 0 && valorAluguel && (
              <span className="text-[11px] text-muted-foreground">≈ {formatBRL(mediaPorNoite)} / noite</span>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-res-limpeza">Taxa limpeza (R$)</FieldLabel>
            <Input
              id="edit-res-limpeza"
              type="number"
              step="0.01"
              className="font-mono"
              value={limpeza}
              onChange={(e) => setLimpeza(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-res-desconto">Desconto (R$)</FieldLabel>
            <Input
              id="edit-res-desconto"
              type="number"
              step="0.01"
              className="font-mono"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-res-comissao-marcio">
              Comissão Marcio Filho
              <span className="font-normal text-muted-foreground">(sugestão: {comissaoMarcioPercentual}%)</span>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="edit-res-comissao-marcio"
                type="number"
                step="0.01"
                className="font-mono"
                value={comissaoMarcio}
                onChange={(e) => {
                  setComissaoMarcio(e.target.value)
                  setComissaoMarcioManual(true)
                }}
              />
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  title="Usar valor sugerido"
                  onClick={() => setComissaoMarcioManual(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel>Status</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={status}
              onValueChange={(v) => v && setStatus(v)}
              className="w-full"
            >
              {STATUS_OPCOES.map((s) => (
                <ToggleGroupItem key={s.value} value={s.value} className="flex-1 text-[12px]">
                  {s.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={saving || !hospede.trim() || !checkin || !checkout}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
