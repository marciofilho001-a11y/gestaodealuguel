import * as React from "react"
import { Camera, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DatePickerField } from "@/components/date-picker-field"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { calcularNoites, formatBRL } from "@/lib/format"
import { extrairDadosPrint } from "@/lib/ocr"
import { cn } from "@/lib/utils"
import type { Casa } from "@/types"
import type { CasaSelecionada, ReservaPayload } from "@/hooks/use-aluguel-data"

interface ReservaFormProps {
  casas: Casa[]
  casaAtualId: CasaSelecionada
  modoTodasCasas: boolean
  comissaoMarcioPercentual: number
  onCriarReserva: (payload: ReservaPayload) => Promise<{ ok: boolean }>
  onSuccess?: () => void
}

const PLATAFORMAS = ["Airbnb", "Booking", "Outro"] as const
const STATUS_OPCOES = [
  { value: "confirmada", label: "Confirmada" },
  { value: "aguardando_pagamento", label: "Aguard. Pagto" },
  { value: "cancelada", label: "Cancelada" },
] as const

const ESTADO_ALERT_VARIANT: Record<string, "default" | "destructive"> = {
  success: "default",
  warn: "default",
}

export function ReservaForm({
  casas,
  casaAtualId,
  modoTodasCasas,
  comissaoMarcioPercentual,
  onCriarReserva,
  onSuccess,
}: ReservaFormProps) {
  const [casaDestino, setCasaDestino] = React.useState<number | undefined>(casas[0]?.id)
  const [plataforma, setPlataforma] = React.useState<string>("Airbnb")
  const [hospede, setHospede] = React.useState("")
  const [checkin, setCheckin] = React.useState("")
  const [checkout, setCheckout] = React.useState("")
  const [valorAluguel, setValorAluguel] = React.useState("")
  const [limpeza, setLimpeza] = React.useState("")
  const [desconto, setDesconto] = React.useState("")
  const [comissaoMarcio, setComissaoMarcio] = React.useState("")
  const [comissaoMarcioManual, setComissaoMarcioManual] = React.useState(false)
  const [status, setStatus] = React.useState("confirmada")
  const [submitting, setSubmitting] = React.useState(false)

  const [ocrBusy, setOcrBusy] = React.useState(false)
  const [ocrStatus, setOcrStatus] = React.useState<{ estado: "loading" | "success" | "warn"; msg: string } | null>(
    null
  )
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const formRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- default local de UI, não sincroniza sistema externo
    if (modoTodasCasas && !casaDestino && casas.length) setCasaDestino(casas[0].id)
  }, [modoTodasCasas, casas, casaDestino])

  const { noites, mediaPorNoite, total, comissaoMarcioSugerida } = React.useMemo(() => {
    const n = calcularNoites(checkin, checkout)
    const aluguel = parseFloat(valorAluguel) || 0
    const l = parseFloat(limpeza) || 0
    const desc = parseFloat(desconto) || 0
    const t = aluguel + l - desc
    return {
      noites: n,
      mediaPorNoite: n > 0 ? aluguel / n : 0,
      total: t,
      comissaoMarcioSugerida: t * (comissaoMarcioPercentual / 100),
    }
  }, [checkin, checkout, valorAluguel, limpeza, desconto, comissaoMarcioPercentual])

  React.useEffect(() => {
    // Enquanto o usuário não digitar manualmente na comissão, ela acompanha a sugestão.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza campo com o cálculo, não é estado externo
    if (!comissaoMarcioManual) setComissaoMarcio(comissaoMarcioSugerida > 0 ? comissaoMarcioSugerida.toFixed(2) : "")
  }, [comissaoMarcioSugerida, comissaoMarcioManual])

  function limparForm() {
    setHospede("")
    setCheckin("")
    setCheckout("")
    setValorAluguel("")
    setLimpeza("")
    setDesconto("")
    setComissaoMarcio("")
    setComissaoMarcioManual(false)
    setPlataforma("Airbnb")
    setStatus("confirmada")
  }

  async function handleSubmit() {
    const casaFinal = modoTodasCasas ? casaDestino : (casaAtualId as number | null)
    if (!casaFinal) {
      toast.warning("Selecione ou crie uma casa primeiro")
      return
    }
    if (!hospede.trim()) {
      toast.warning("Preencha o nome do hóspede")
      return
    }
    if (!checkin || !checkout) {
      toast.warning("Preencha check-in e check-out")
      return
    }

    const payload: ReservaPayload = {
      casa_id: casaFinal,
      plataforma,
      hospede: hospede.trim(),
      checkin,
      checkout,
      valor_diaria: mediaPorNoite,
      taxa_limpeza: parseFloat(limpeza) || 0,
      desconto: parseFloat(desconto) || 0,
      comissao_plataforma: 0,
      comissao_marcio: parseFloat(comissaoMarcio) || 0,
      status,
    }

    setSubmitting(true)
    const res = await onCriarReserva(payload)
    setSubmitting(false)
    if (res.ok) {
      limparForm()
      onSuccess?.()
    }
  }

  async function processarPrints(fileList: FileList | null) {
    const arquivos = Array.from(fileList || [])
    if (!arquivos.length) return
    if (!casaAtualId) {
      toast.warning("Selecione ou crie uma casa primeiro")
      return
    }

    setOcrBusy(true)
    const { recognize } = await import("tesseract.js")

    let textoCombinado = ""
    for (let i = 0; i < arquivos.length; i++) {
      setOcrStatus({ estado: "loading", msg: `Lendo imagem ${i + 1} de ${arquivos.length}… isso leva alguns segundos` })
      try {
        const { data } = await recognize(arquivos[i], "por", { logger: () => {} })
        textoCombinado += "\n\n" + data.text
      } catch (e) {
        setOcrStatus({ estado: "warn", msg: "Não consegui ler a imagem " + (i + 1) + ": " + (e instanceof Error ? e.message : String(e)) })
        setOcrBusy(false)
        return
      }
    }

    const dados = extrairDadosPrint(textoCombinado)
    const camposEncontrados = Object.keys(dados).length

    if (camposEncontrados === 0) {
      setOcrStatus({ estado: "warn", msg: "Não consegui identificar nenhum dado nessas imagens. Preencha manualmente." })
      setOcrBusy(false)
      return
    }

    if (dados.plataforma) setPlataforma(dados.plataforma)
    if (dados.hospede) setHospede(dados.hospede)
    if (dados.checkin) setCheckin(dados.checkin)
    if (dados.checkout) setCheckout(dados.checkout)
    if (dados.taxa_limpeza !== undefined) setLimpeza(dados.taxa_limpeza ? String(dados.taxa_limpeza) : "")
    if (dados.desconto !== undefined) setDesconto(dados.desconto ? String(dados.desconto) : "")

    // "Valor aluguel total" = subtotal (soma das diárias, antes da limpeza) —
    // se não achou o subtotal direto, back-calcula a partir do total lido
    let aluguelTotalLido: number | null = null
    if (dados.subtotal !== undefined) aluguelTotalLido = dados.subtotal
    else if (dados.valor_total !== undefined) aluguelTotalLido = dados.valor_total - (dados.taxa_limpeza || 0) + (dados.desconto || 0)
    if (aluguelTotalLido !== null && aluguelTotalLido > 0) setValorAluguel(aluguelTotalLido.toFixed(2))

    const camposFaltando: string[] = []
    if (!dados.hospede) camposFaltando.push("hóspede")
    if (!dados.checkin || !dados.checkout) camposFaltando.push("datas")
    if (aluguelTotalLido === null) camposFaltando.push("valor")

    let avisoDivergencia = ""
    if (dados.subtotal !== undefined && dados.valor_total !== undefined) {
      const calculado = dados.subtotal + (dados.taxa_limpeza || 0) - (dados.desconto || 0)
      if (Math.abs(calculado - dados.valor_total) > 1) {
        avisoDivergencia = ` Os valores lidos não batem exatamente (subtotal+limpeza-desconto=${formatBRL(calculado)} vs total lido=${formatBRL(dados.valor_total)}) — confira com atenção.`
      }
    }

    let avisoDiariaVariavel = ""
    if (dados.diariasVariaveis) {
      avisoDiariaVariavel = ` As diárias variaram noite a noite (de ${formatBRL(dados.diariaMin)} a ${formatBRL(dados.diariaMax)}) — o valor total do aluguel já contempla a soma de todas.`
    }

    if (camposFaltando.length) {
      setOcrStatus({
        estado: "warn",
        msg: `Preenchi o que consegui ler (${arquivos.length} ${arquivos.length > 1 ? "imagens" : "imagem"}), mas não achei: ${camposFaltando.join(", ")}.${avisoDivergencia}${avisoDiariaVariavel} Confira e complete abaixo antes de salvar.`,
      })
    } else if (avisoDivergencia || avisoDiariaVariavel) {
      setOcrStatus({
        estado: "warn",
        msg: `Dados lidos de ${arquivos.length} ${arquivos.length > 1 ? "imagens" : "imagem"}.${avisoDivergencia}${avisoDiariaVariavel}`,
      })
    } else {
      setOcrStatus({
        estado: "success",
        msg: `Dados lidos de ${arquivos.length} ${arquivos.length > 1 ? "imagens" : "imagem"}! Confira os campos abaixo antes de clicar em "Adicionar Reserva".`,
      })
    }

    setOcrBusy(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div ref={formRef}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => processarPrints(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-gold/40 text-gold-foreground hover:bg-gold-soft"
            disabled={ocrBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {ocrBusy ? <Spinner data-icon="inline-start" /> : <Camera data-icon="inline-start" />}
            Importar de Print(s)
          </Button>
        </div>
      </div>
      <p className="mb-3.5 text-[11.5px] text-muted-foreground">
        Dica: selecione as <b>duas imagens de uma vez</b> (Ctrl/Cmd+clique) — uma costuma ter o valor/desconto e a
        outra o check-in/out, juntas o app entende o contexto completo.
      </p>

      {ocrStatus && (
        <Alert
          variant={ESTADO_ALERT_VARIANT[ocrStatus.estado]}
          className={cn("mb-4", ocrStatus.estado === "warn" && "border-gold/50 bg-gold-soft text-gold-foreground")}
        >
          <AlertDescription className={ocrStatus.estado === "warn" ? "text-gold-foreground" : undefined}>
            {ocrStatus.msg}
          </AlertDescription>
        </Alert>
      )}

      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modoTodasCasas && (
          <Field>
            <FieldLabel htmlFor="res-casa-destino">Casa</FieldLabel>
            <Select value={casaDestino ? String(casaDestino) : undefined} onValueChange={(v) => setCasaDestino(Number(v))}>
              <SelectTrigger id="res-casa-destino" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {casas.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

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
          <FieldLabel htmlFor="res-hospede">Hóspede</FieldLabel>
          <Input id="res-hospede" placeholder="Nome" value={hospede} onChange={(e) => setHospede(e.target.value)} />
        </Field>

        <DatePickerField id="res-checkin" label="Check-in" value={checkin} onChange={setCheckin} />
        <DatePickerField id="res-checkout" label="Check-out" value={checkout} onChange={setCheckout} />

        <Field>
          <FieldLabel htmlFor="res-valor-aluguel">Valor do aluguel (total da estadia)</FieldLabel>
          <Input
            id="res-valor-aluguel"
            type="number"
            step="0.01"
            placeholder="0,00"
            className="font-mono"
            value={valorAluguel}
            onChange={(e) => setValorAluguel(e.target.value)}
          />
          {noites > 0 && valorAluguel && (
            <span className="text-[11px] tabular-nums text-muted-foreground">≈ {formatBRL(mediaPorNoite)} / noite</span>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="res-limpeza">Taxa limpeza (R$)</FieldLabel>
          <Input
            id="res-limpeza"
            type="number"
            step="0.01"
            placeholder="0,00"
            className="font-mono"
            value={limpeza}
            onChange={(e) => setLimpeza(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="res-desconto">
            {plataforma === "Booking" ? "Comissão plataforma (R$)" : "Desconto (R$)"}
          </FieldLabel>
          <Input
            id="res-desconto"
            type="number"
            step="0.01"
            placeholder="0,00"
            className="font-mono"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="res-comissao-marcio">
            Comissão Marcio Filho
            <span className="font-normal text-muted-foreground">(sugestão: {comissaoMarcioPercentual}%)</span>
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="res-comissao-marcio"
              type="number"
              step="0.01"
              placeholder="0,00"
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
                title={comissaoMarcioSugerida > 0 ? `Usar sugestão de ${formatBRL(comissaoMarcioSugerida)}` : "Calcule a sugestão preenchendo o valor e as datas"}
                onClick={() => {
                  if (comissaoMarcioSugerida > 0) {
                    setComissaoMarcio(comissaoMarcioSugerida.toFixed(2))
                    setComissaoMarcioManual(true)
                  }
                }}
                disabled={comissaoMarcioSugerida <= 0}
                className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field>
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Spinner data-icon="inline-start" />}
          Adicionar Reserva
        </Button>
        <div className="font-mono text-sm tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{noites}</span> noites → <b className="text-foreground">{formatBRL(total)}</b>
        </div>
      </div>
    </div>
  )
}
