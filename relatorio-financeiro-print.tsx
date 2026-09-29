// O documento do Relatório Financeiro — é isto que vira PDF quando o usuário
// manda gerar. Vive num portal preso direto no <body> (fora do #root), e fica
// escondido o tempo todo: só aparece quando o body ganha
// `data-print-mode="relatorio"`, logo antes do window.print(). Ver as regras
// em index.css (seção "Relatório Financeiro").
//
// Decisões de composição, pra quem for mexer depois:
// • A4 retrato (o calendário imprime em paisagem — por isso a página nomeada
//   `@page relatorio` no CSS, senão os dois brigariam pelo mesmo @page).
// • Todo número usa IBM Plex Mono com tabular-nums: em coluna alinhada, o
//   olho confere a soma sem precisar somar. Fonte já instalada no projeto.
// • Cada reserva é um bloco com `break-inside: avoid` — uma reserva nunca
//   racha no meio entre duas páginas.
// • A "escada" de valores fecha exatamente (ver a identidade documentada em
//   lib/relatorio-financeiro.ts), então o leitor consegue auditar linha a
//   linha até o líquido. Linhas zeradas são omitidas pra não poluir.

import { formatBRL, formatDate } from "@/lib/format"
import { PLATFORM_COLOR } from "@/lib/platform"
import type { LinhaRelatorio, TotaisRelatorio } from "@/lib/relatorio-financeiro"
import { rotularPeriodo } from "@/lib/relatorio-financeiro"

// Sinal de menos de verdade (U+2212), não hífen — alinha na fonte mono e é o
// que se espera num documento financeiro.
function menos(v: number): string {
  return `−${formatBRL(v)}`
}

interface LinhaValorProps {
  rotulo: string
  valor: string
  negativo?: boolean
  forte?: boolean
}

function LinhaValor({ rotulo, valor, negativo, forte }: LinhaValorProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[2px]">
      <span
        className={
          forte
            ? "text-[9.5px] font-semibold tracking-[0.02em] text-foreground"
            : "text-[9.5px] text-muted-foreground"
        }
      >
        {rotulo}
      </span>
      <span
        className={
          "font-mono text-[9.5px] tabular-nums " +
          (negativo ? "text-muted-foreground" : forte ? "font-semibold text-foreground" : "text-foreground")
        }
      >
        {valor}
      </span>
    </div>
  )
}

function BlocoReserva({ linha, mostrarMarcio }: { linha: LinhaRelatorio; mostrarMarcio: boolean }) {
  const { reserva, casa } = linha
  const plataforma = reserva.plataforma || "Outro"
  const cor = PLATFORM_COLOR[plataforma] ?? PLATFORM_COLOR.Outro

  return (
    <article className="break-inside-avoid border-b border-border py-3 last:border-b-0">
      <div className="flex gap-3">
        {/* Filete na cor da plataforma — mesma linguagem visual do calendário */}
        <div className="mt-[3px] w-[3px] shrink-0 rounded-full" style={{ backgroundColor: cor }} />

        <div className="min-w-0 flex-1">
          {/* Identificação */}
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="truncate text-[12.5px] leading-tight font-semibold tracking-[-0.01em] text-foreground">
              {reserva.hospede || "Hóspede não informado"}
            </h3>
            <span
              className="shrink-0 text-[8px] font-bold tracking-[0.12em] uppercase"
              style={{ color: cor }}
            >
              {plataforma}
            </span>
          </div>

          <p className="mt-[3px] text-[9px] text-muted-foreground">
            {casa?.nome ?? "Casa removida"}
            <span className="mx-1.5 text-border">|</span>
            {formatDate(reserva.checkin)} <span className="text-border">→</span> {formatDate(reserva.checkout)}
            <span className="mx-1.5 text-border">|</span>
            {linha.noites} {linha.noites === 1 ? "diária" : "diárias"}
          </p>

          {/* Escada de valores — fecha exatamente até o líquido */}
          {/* px-2 aqui + -mx-2/px-2 na faixa dourada: a faixa sangra até a
              largura cheia da coluna, mas o número dela termina exatamente na
              mesma vertical dos valores de cima. Alinhamento é o que deixa a
              soma conferível de bater o olho. */}
          <div className="mt-2 px-2">
            <LinhaValor
              rotulo={`${linha.noites} × ${formatBRL(linha.diariaMedia)}`}
              valor={formatBRL(linha.subtotalDiarias)}
            />
            {linha.limpeza > 0 && <LinhaValor rotulo="Taxa de limpeza" valor={formatBRL(linha.limpeza)} />}
            {linha.descontoHospede > 0 && (
              <LinhaValor rotulo="Desconto ao hóspede" valor={menos(linha.descontoHospede)} negativo />
            )}

            <div className="my-1 border-t border-border" />
            <LinhaValor rotulo="Valor bruto" valor={formatBRL(linha.bruto)} forte />

            {linha.comissaoPlataforma > 0 && (
              <LinhaValor
                rotulo={`Comissão ${plataforma}`}
                valor={menos(linha.comissaoPlataforma)}
                negativo
              />
            )}

            {/* Destaque do líquido — exigência do escopo */}
            <div className="-mx-2 mt-1.5 flex items-baseline justify-between gap-3 rounded-[3px] bg-gold-soft px-2 py-[5px]">
              <span className="text-[8.5px] font-bold tracking-[0.14em] text-gold-foreground uppercase">
                Valor líquido
              </span>
              <span className="font-mono text-[12px] font-bold tabular-nums text-gold-foreground">
                {formatBRL(linha.liquido)}
              </span>
            </div>

            {mostrarMarcio && linha.comissaoMarcio > 0 && (
              <div className="mt-[3px]">
                <LinhaValor rotulo="Comissão Marcio Filho" valor={menos(linha.comissaoMarcio)} negativo />
                <LinhaValor rotulo="Líquido final" valor={formatBRL(linha.liquidoFinal)} forte />
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function LinhaTotal({
  rotulo,
  valor,
  negativo,
}: {
  rotulo: string
  valor: string
  negativo?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-[5px] last:border-b-0">
      <span className="text-[10px] text-muted-foreground">{rotulo}</span>
      <span
        className={
          "font-mono text-[11px] tabular-nums " +
          (negativo ? "text-muted-foreground" : "font-medium text-foreground")
        }
      >
        {valor}
      </span>
    </div>
  )
}

export interface RelatorioFinanceiroDocumentoProps {
  linhas: LinhaRelatorio[]
  totais: TotaisRelatorio
  de: string
  ate: string
  nomeCasa: string
  nomePlataforma: string
  mostrarMarcio: boolean
}

export function RelatorioFinanceiroDocumento({
  linhas,
  totais,
  de,
  ate,
  nomeCasa,
  nomePlataforma,
  mostrarMarcio,
}: RelatorioFinanceiroDocumentoProps) {
  const agora = new Date()
  const emitidoEm = `${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`

  return (
    <div className="relatorio-documento bg-background px-0 py-0 font-sans text-foreground">
      {/* ---------- Cabeçalho ---------- */}
      <header className="border-b-2 border-primary pb-3">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="block size-[9px] rounded-[2px] bg-primary" />
              <span className="text-[8px] font-bold tracking-[0.18em] text-primary uppercase">
                Gestão de Aluguel
              </span>
            </div>
            <h1 className="mt-1.5 text-[21px] leading-none font-bold tracking-[-0.025em] text-foreground">
              Relatório Financeiro de Reservas
            </h1>
            <p className="mt-1.5 text-[10px] text-muted-foreground">{rotularPeriodo(de, ate)}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[8px] font-bold tracking-[0.14em] text-muted-foreground uppercase">Emitido em</p>
            <p className="mt-0.5 font-mono text-[9.5px] tabular-nums text-foreground">{emitidoEm}</p>
            <p className="mt-2 text-[8.5px] text-muted-foreground">
              {nomeCasa}
              <br />
              {nomePlataforma}
            </p>
          </div>
        </div>
      </header>

      {/* ---------- Resumo de topo (assimétrico: o líquido pesa mais) ---------- */}
      <section className="mt-3 flex items-stretch gap-4 rounded-[4px] border border-border bg-muted/60 px-4 py-2.5">
        <div className="flex flex-col justify-center">
          <p className="text-[7.5px] font-bold tracking-[0.14em] text-muted-foreground uppercase">Reservas</p>
          <p className="font-mono text-[15px] leading-tight font-semibold tabular-nums text-foreground">
            {totais.totalReservas}
          </p>
        </div>
        <div className="w-px bg-border" />
        <div className="flex flex-col justify-center">
          <p className="text-[7.5px] font-bold tracking-[0.14em] text-muted-foreground uppercase">Diárias</p>
          <p className="font-mono text-[15px] leading-tight font-semibold tabular-nums text-foreground">
            {totais.totalNoites}
          </p>
        </div>
        <div className="w-px bg-border" />
        <div className="flex flex-col justify-center">
          <p className="text-[7.5px] font-bold tracking-[0.14em] text-muted-foreground uppercase">Total bruto</p>
          <p className="font-mono text-[15px] leading-tight font-semibold tabular-nums text-foreground">
            {formatBRL(totais.totalBruto)}
          </p>
        </div>
        <div className="ml-auto flex flex-col justify-center border-l border-border pl-4 text-right">
          <p className="text-[7.5px] font-bold tracking-[0.14em] text-primary uppercase">Total líquido</p>
          <p className="font-mono text-[20px] leading-tight font-bold tracking-[-0.02em] tabular-nums text-primary">
            {formatBRL(totais.totalLiquido)}
          </p>
        </div>
      </section>

      {/* ---------- Lista de reservas ---------- */}
      <section className="mt-4">
        <h2 className="text-[8.5px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
          Detalhamento por reserva
        </h2>
        <div className="mt-1 border-t border-border">
          {linhas.map((linha) => (
            <BlocoReserva key={linha.reserva.id} linha={linha} mostrarMarcio={mostrarMarcio} />
          ))}
        </div>
      </section>

      {/* ---------- Totalizador ---------- */}
      <section className="mt-5 break-inside-avoid">
        <h2 className="text-[8.5px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
          Totais consolidados
        </h2>

        <div className="mt-1.5 rounded-[4px] border border-border px-4 py-2">
          <LinhaTotal rotulo="Total de reservas" valor={String(totais.totalReservas)} />
          <LinhaTotal rotulo="Total de diárias" valor={String(totais.totalNoites)} />
          <LinhaTotal rotulo="Soma das diárias" valor={formatBRL(totais.totalSubtotalDiarias)} />
          {totais.totalLimpeza > 0 && (
            <LinhaTotal rotulo="Total de taxas de limpeza" valor={formatBRL(totais.totalLimpeza)} />
          )}
          {totais.totalDescontoHospede > 0 && (
            <LinhaTotal
              rotulo="Total de descontos ao hóspede"
              valor={menos(totais.totalDescontoHospede)}
              negativo
            />
          )}
          <LinhaTotal rotulo="Total bruto" valor={formatBRL(totais.totalBruto)} />
          <LinhaTotal
            rotulo="Total de comissões da plataforma"
            valor={menos(totais.totalComissaoPlataforma)}
            negativo
          />
        </div>

        {/* TOTAL LÍQUIDO — o número que o documento existe pra entregar */}
        <div className="mt-2 flex items-center justify-between gap-6 rounded-[4px] bg-primary px-4 py-3">
          <div>
            <p className="text-[9px] font-bold tracking-[0.18em] text-primary-foreground uppercase">
              Total líquido
            </p>
            <p className="mt-0.5 text-[8px] text-primary-foreground/80">
              Total bruto menos as comissões da plataforma
            </p>
          </div>
          <p className="font-mono text-[24px] leading-none font-bold tracking-[-0.03em] tabular-nums text-primary-foreground">
            {formatBRL(totais.totalLiquido)}
          </p>
        </div>

        {mostrarMarcio && totais.totalComissaoMarcio > 0 && (
          <div className="mt-2 rounded-[4px] border border-gold/50 bg-gold-soft px-4 py-2">
            <LinhaTotal rotulo="Comissão Marcio Filho" valor={menos(totais.totalComissaoMarcio)} negativo />
            <div className="flex items-baseline justify-between gap-4 pt-[5px]">
              <span className="text-[10px] font-semibold text-gold-foreground">
                Líquido final após comissão
              </span>
              <span className="font-mono text-[14px] font-bold tabular-nums text-gold-foreground">
                {formatBRL(totais.totalLiquidoFinal)}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ---------- Rodapé: as regras, pra quem for conferir ---------- */}
      <footer className="mt-5 break-inside-avoid border-t border-border pt-2">
        <p className="text-[7.5px] leading-relaxed text-muted-foreground">
          Diárias = data de saída − data de entrada. Valor bruto = soma das diárias + taxa de limpeza − desconto
          ao hóspede. Valor líquido = valor bruto − comissão da plataforma. Entram no relatório as reservas cuja
          estadia cruza o período selecionado; reservas canceladas não são contabilizadas. Valores em reais (R$).
        </p>
      </footer>
    </div>
  )
}
