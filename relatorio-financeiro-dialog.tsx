// Botão "Relatório financeiro" do cabeçalho + o painel de filtros que monta o
// PDF. O documento em si está em relatorio-financeiro-print.tsx; aqui só se
// escolhe O QUE entra nele.
//
// Por que a seleção de reservas mora aqui e não na tabela: o escopo pedia
// "gerar de todas as reservas ou apenas das selecionadas". Espalhar checkbox
// pela tabela do app inteiro mudaria uma tela que já está estável — então a
// seleção acontece dentro do próprio painel, sobre a lista já filtrada pelo
// período. Tudo nasce marcado; desmarcar é a exceção.
//
// A impressão usa o mecanismo nativo do navegador (window.print() → "Salvar
// como PDF"), igual ao que o calendário já fazia. É de propósito: sai texto
// vetorial de verdade, selecionável e nítido em qualquer zoom, sem somar
// biblioteca nenhuma ao bundle (que já passa de 1,4 MB).

import * as React from "react"
import { createPortal } from "react-dom"
import { Check, FileText, Loader2 } from "lucide-react"

import { RelatorioFinanceiroDocumento } from "@/components/relatorio-financeiro-print"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatBRL, formatDate, primeiroDiaMes, ultimoDiaMes } from "@/lib/format"
import { PLATFORM_COLOR } from "@/lib/platform"
import {
  calcularTotais,
  filtrarReservas,
  montarLinha,
  type LinhaRelatorio,
} from "@/lib/relatorio-financeiro"
import { cn } from "@/lib/utils"
import type { Casa, Reserva } from "@/types"

const TODAS = "__todas__"

interface RelatorioFinanceiroDialogProps {
  casas: Casa[]
  reservas: Reserva[]
}

export function RelatorioFinanceiroDialog({ casas, reservas }: RelatorioFinanceiroDialogProps) {
  const [open, setOpen] = React.useState(false)
  const hoje = React.useMemo(() => new Date(), [])

  const [de, setDe] = React.useState(() => primeiroDiaMes(hoje))
  const [ate, setAte] = React.useState(() => ultimoDiaMes(hoje))
  const [casaFiltro, setCasaFiltro] = React.useState(TODAS)
  const [plataformaFiltro, setPlataformaFiltro] = React.useState(TODAS)
  const [excluidas, setExcluidas] = React.useState<Set<number>>(new Set())
  const [incluirMarcio, setIncluirMarcio] = React.useState(true)
  const [gerando, setGerando] = React.useState(false)

  // Estado do documento a imprimir. Enquanto for null, nada é renderizado no
  // portal — o DOM do relatório só existe no instante da impressão.
  const [documento, setDocumento] = React.useState<null | {
    linhas: LinhaRelatorio[]
    de: string
    ate: string
    nomeCasa: string
    nomePlataforma: string
    mostrarMarcio: boolean
  }>(null)

  const candidatas = React.useMemo(
    () =>
      filtrarReservas(reservas, {
        de,
        ate,
        casaId: casaFiltro === TODAS ? null : Number(casaFiltro),
        plataforma: plataformaFiltro === TODAS ? null : plataformaFiltro,
      }),
    [reservas, de, ate, casaFiltro, plataformaFiltro],
  )

  const selecionadas = React.useMemo(
    () => candidatas.filter((r) => !excluidas.has(r.id)),
    [candidatas, excluidas],
  )

  const linhas = React.useMemo(
    () => selecionadas.map((r) => montarLinha(r, casas)),
    [selecionadas, casas],
  )
  const totais = React.useMemo(() => calcularTotais(linhas), [linhas])

  const temComissaoMarcio = linhas.some((l) => l.comissaoMarcio > 0)

  // Plataformas que realmente aparecem nos dados — não adianta oferecer filtro
  // por uma plataforma que o usuário nunca usou.
  const plataformas = React.useMemo(() => {
    const set = new Set(reservas.filter((r) => r.status !== "cancelada").map((r) => r.plataforma || "Outro"))
    return Array.from(set).sort()
  }, [reservas])

  function aplicarPreset(preset: "mes" | "mesPassado" | "ano") {
    const agora = new Date()
    if (preset === "mes") {
      setDe(primeiroDiaMes(agora))
      setAte(ultimoDiaMes(agora))
    } else if (preset === "mesPassado") {
      const anterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
      setDe(primeiroDiaMes(anterior))
      setAte(ultimoDiaMes(anterior))
    } else {
      setDe(`${agora.getFullYear()}-01-01`)
      setAte(`${agora.getFullYear()}-12-31`)
    }
    setExcluidas(new Set())
  }

  function alternar(id: number) {
    setExcluidas((prev) => {
      const proximo = new Set(prev)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  function gerar() {
    if (linhas.length === 0) return
    setGerando(true)
    // Fecha o painel antes de imprimir: some da tela e, principalmente, tira
    // o portal do Radix do caminho da folha.
    setOpen(false)
    setDocumento({
      linhas,
      de,
      ate,
      nomeCasa: casaFiltro === TODAS ? "Todas as casas" : (casas.find((c) => String(c.id) === casaFiltro)?.nome ?? "—"),
      nomePlataforma: plataformaFiltro === TODAS ? "Todas as plataformas" : plataformaFiltro,
      mostrarMarcio: incluirMarcio && temComissaoMarcio,
    })
  }

  // Dispara a impressão só depois que o portal pintou. Dois requestAnimationFrame
  // encadeados: o primeiro garante que o React já commitou o DOM, o segundo que
  // o navegador já desenhou — window.print() trava a thread, então imprimir cedo
  // demais sairia com a folha em branco.
  React.useEffect(() => {
    if (!documento) return

    const encerrar = () => {
      document.body.removeAttribute("data-print-mode")
      setDocumento(null)
      setGerando(false)
    }

    document.body.setAttribute("data-print-mode", "relatorio")
    const id = requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
    window.addEventListener("afterprint", encerrar)

    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener("afterprint", encerrar)
      document.body.removeAttribute("data-print-mode")
    }
  }, [documento])

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="size-7" title="Relatório financeiro (PDF)">
            <FileText className="size-4" />
            <span className="sr-only">Relatório financeiro</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Relatório financeiro</DialogTitle>
            <DialogDescription>
              Escolha o período e as reservas. O PDF sai com o detalhamento de cada hospedagem e os totais no fim.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* ---- Período ---- */}
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={() => aplicarPreset("mes")}>
                  Mês atual
                </Button>
                <Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={() => aplicarPreset("mesPassado")}>
                  Mês passado
                </Button>
                <Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={() => aplicarPreset("ano")}>
                  Ano atual
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="rel-de" className="text-xs">
                    De
                  </Label>
                  <Input id="rel-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} className="h-8" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rel-ate" className="text-xs">
                    Até
                  </Label>
                  <Input id="rel-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="h-8" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Casa</Label>
                  <Select value={casaFiltro} onValueChange={(v) => { setCasaFiltro(v); setExcluidas(new Set()) }}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODAS}>Todas as casas</SelectItem>
                      {casas.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Plataforma</Label>
                  <Select value={plataformaFiltro} onValueChange={(v) => { setPlataformaFiltro(v); setExcluidas(new Set()) }}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODAS}>Todas</SelectItem>
                      {plataformas.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ---- Seleção das reservas ---- */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">
                  Reservas no período
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {selecionadas.length} de {candidatas.length} selecionadas
                  </span>
                </Label>
                {candidatas.length > 0 && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setExcluidas(new Set())}>
                      Todas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setExcluidas(new Set(candidatas.map((r) => r.id)))}
                    >
                      Nenhuma
                    </Button>
                  </div>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                {candidatas.length === 0 ? (
                  <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma reserva nesse período com esses filtros.
                  </p>
                ) : (
                  candidatas.map((r) => {
                    const ativo = !excluidas.has(r.id)
                    const casa = casas.find((c) => c.id === r.casa_id)
                    const cor = PLATFORM_COLOR[r.plataforma || "Outro"] ?? PLATFORM_COLOR.Outro
                    return (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => alternar(r.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 border-b border-border px-2.5 py-1.5 text-left transition-colors last:border-b-0 hover:bg-accent/40",
                          !ativo && "opacity-45",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                            ativo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent",
                          )}
                        >
                          {ativo && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        <span className="h-3.5 w-[2px] shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">
                          {r.hospede || "Sem nome"}
                        </span>
                        <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                          {casa?.nome}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                          {formatDate(r.checkin)}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* ---- Comissão Marcio ---- */}
            {temComissaoMarcio && (
              <button
                type="button"
                aria-pressed={incluirMarcio}
                onClick={() => setIncluirMarcio((v) => !v)}
                className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                    incluirMarcio ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {incluirMarcio && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className="text-xs">
                  Mostrar a Comissão Marcio Filho
                  <span className="ml-1.5 text-muted-foreground">
                    (o "Total líquido" do escopo não a inclui — ela aparece como um bloco à parte)
                  </span>
                </span>
              </button>
            )}

            {/* ---- Prévia dos números ---- */}
            {linhas.length > 0 && (
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-md bg-muted px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  Diárias <b className="font-mono font-semibold tabular-nums text-foreground">{totais.totalNoites}</b>
                </span>
                <span className="text-muted-foreground">
                  Bruto <b className="font-mono font-semibold tabular-nums text-foreground">{formatBRL(totais.totalBruto)}</b>
                </span>
                <span className="text-muted-foreground">
                  Comissões{" "}
                  <b className="font-mono font-semibold tabular-nums text-foreground">
                    {formatBRL(totais.totalComissaoPlataforma)}
                  </b>
                </span>
                <span className="ml-auto font-semibold text-primary">
                  Líquido{" "}
                  <b className="font-mono text-sm font-bold tabular-nums">{formatBRL(totais.totalLiquido)}</b>
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={gerar} disabled={linhas.length === 0 || gerando}>
              {gerando ? (
                <>
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> Gerando...
                </>
              ) : (
                <>
                  <FileText className="size-4" data-icon="inline-start" /> Gerar PDF
                  {linhas.length > 0 && ` (${linhas.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* O documento vive fora do #root pra que a regra de impressão consiga
          esconder o app inteiro e deixar só ele na folha. */}
      {documento &&
        createPortal(
          <div id="relatorio-print-root">
            <RelatorioFinanceiroDocumento
              linhas={documento.linhas}
              totais={calcularTotais(documento.linhas)}
              de={documento.de}
              ate={documento.ate}
              nomeCasa={documento.nomeCasa}
              nomePlataforma={documento.nomePlataforma}
              mostrarMarcio={documento.mostrarMarcio}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
