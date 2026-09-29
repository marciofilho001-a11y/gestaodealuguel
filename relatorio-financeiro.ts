// Camada de cálculo do Relatório Financeiro de Reservas (o PDF gerado pelo
// botão "Relatório financeiro" no cabeçalho do dashboard).
//
// ⚠️ Regra de ouro deste arquivo: os números daqui TÊM que bater com o Setor
// de Ganhos. Por isso ele lê bruto e comissão através de `valorBrutoEfetivo`
// e `comissaoPlataformaEfetiva` (ver format.ts) em vez dos campos crus, e
// repete a mesma convenção de "desconto de hóspede" que ganhos-page.tsx usa:
// no Booking a coluna `desconto` guarda a comissão da plataforma, não um
// desconto — então ali o desconto ao hóspede é sempre 0.
//
// A identidade abaixo fecha exatamente nas duas plataformas, e é ela que
// permite o PDF mostrar a "escada" de valores sem nunca dar diferença de
// centavo:
//
//   bruto = subtotalDiarias + limpeza − descontoHospede
//
//   Airbnb/Outro: valorBrutoEfetivo = valor_total
//                 = noites×diária + limpeza − desconto        ✓
//   Booking:      valorBrutoEfetivo = valor_total + desconto
//                 = noites×diária + limpeza                   ✓ (desconto = 0)

import { calcularNoites, comissaoPlataformaEfetiva, valorBrutoEfetivo } from "@/lib/format"
import type { Casa, Reserva } from "@/types"

export interface LinhaRelatorio {
  reserva: Reserva
  casa: Casa | undefined
  /** Quantidade de diárias = checkout − checkin, em noites */
  noites: number
  /** Média por noite (a coluna valor_diaria hoje guarda a média, não um input) */
  diariaMedia: number
  /** noites × média — equivale ao "Valor do aluguel" digitado no formulário */
  subtotalDiarias: number
  limpeza: number
  /** Desconto dado ao hóspede. No Booking é sempre 0 (lá `desconto` é comissão) */
  descontoHospede: number
  /** Valor bruto da reserva, comparável entre plataformas */
  bruto: number
  /** Comissão retida pela plataforma */
  comissaoPlataforma: number
  /** Valor líquido conforme o escopo: bruto − comissão da plataforma */
  liquido: number
  /** Comissão do Marcio Filho (fora da definição de líquido do escopo) */
  comissaoMarcio: number
  /** Líquido depois de também descontar a comissão do Marcio */
  liquidoFinal: number
}

export interface TotaisRelatorio {
  totalReservas: number
  totalNoites: number
  totalSubtotalDiarias: number
  totalLimpeza: number
  totalDescontoHospede: number
  totalBruto: number
  totalComissaoPlataforma: number
  totalLiquido: number
  totalComissaoMarcio: number
  totalLiquidoFinal: number
  /** Média por noite do período inteiro (bruto ÷ noites) */
  mediaPorNoite: number
  /** Média por reserva (bruto ÷ nº de reservas) */
  mediaPorReserva: number
}

export interface FiltrosRelatorio {
  de: string
  ate: string
  /** null = todas as casas */
  casaId: number | null
  /** null = todas as plataformas */
  plataforma: string | null
}

export function montarLinha(reserva: Reserva, casas: Casa[]): LinhaRelatorio {
  const noites = calcularNoites(reserva.checkin, reserva.checkout)
  const diariaMedia = Number(reserva.valor_diaria) || 0
  const limpeza = Number(reserva.taxa_limpeza) || 0

  // Mesma regra da linha 254 de ganhos-page.tsx — no Booking o campo
  // `desconto` é comissão da plataforma, então não conta como desconto.
  const descontoHospede = reserva.plataforma === "Booking" ? 0 : Number(reserva.desconto) || 0

  const bruto = valorBrutoEfetivo(reserva)
  const comissaoPlataforma = comissaoPlataformaEfetiva(reserva)
  const comissaoMarcio = Number(reserva.comissao_marcio) || 0
  const liquido = bruto - comissaoPlataforma

  return {
    reserva,
    casa: casas.find((c) => c.id === reserva.casa_id),
    noites,
    diariaMedia,
    subtotalDiarias: noites * diariaMedia,
    limpeza,
    descontoHospede,
    bruto,
    comissaoPlataforma,
    liquido,
    comissaoMarcio,
    liquidoFinal: liquido - comissaoMarcio,
  }
}

/**
 * Seleciona as reservas do período. Usa a mesma convenção de sobreposição do
 * Setor de Ganhos (`checkout > de` e `checkin <= ate`): a reserva entra no
 * relatório se a estadia dela cruza o período, não só se o check-in cai
 * dentro dele. Canceladas nunca entram.
 */
export function filtrarReservas(reservas: Reserva[], filtros: FiltrosRelatorio): Reserva[] {
  let out = reservas.filter((r) => r.status !== "cancelada")
  if (filtros.de) out = out.filter((r) => r.checkout > filtros.de)
  if (filtros.ate) out = out.filter((r) => r.checkin <= filtros.ate)
  if (filtros.casaId !== null) out = out.filter((r) => r.casa_id === filtros.casaId)
  if (filtros.plataforma !== null) out = out.filter((r) => (r.plataforma || "Outro") === filtros.plataforma)

  // Ordem cronológica de entrada — é como se lê um extrato.
  return out.sort((a, b) => a.checkin.localeCompare(b.checkin) || a.id - b.id)
}

export function calcularTotais(linhas: LinhaRelatorio[]): TotaisRelatorio {
  const soma = (fn: (l: LinhaRelatorio) => number) => linhas.reduce((s, l) => s + fn(l), 0)

  const totalBruto = soma((l) => l.bruto)
  const totalNoites = soma((l) => l.noites)
  const totalComissaoPlataforma = soma((l) => l.comissaoPlataforma)
  const totalComissaoMarcio = soma((l) => l.comissaoMarcio)
  const totalLiquido = totalBruto - totalComissaoPlataforma

  return {
    totalReservas: linhas.length,
    totalNoites,
    totalSubtotalDiarias: soma((l) => l.subtotalDiarias),
    totalLimpeza: soma((l) => l.limpeza),
    totalDescontoHospede: soma((l) => l.descontoHospede),
    totalBruto,
    totalComissaoPlataforma,
    totalLiquido,
    totalComissaoMarcio,
    totalLiquidoFinal: totalLiquido - totalComissaoMarcio,
    mediaPorNoite: totalNoites ? totalBruto / totalNoites : 0,
    mediaPorReserva: linhas.length ? totalBruto / linhas.length : 0,
  }
}

/** "1º de janeiro de 2027 a 31 de janeiro de 2027" — legenda do cabeçalho */
export function rotularPeriodo(de: string, ate: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
  if (!de && !ate) return "Todo o histórico"
  if (!de) return `Até ${fmt(ate)}`
  if (!ate) return `A partir de ${fmt(de)}`
  return `${fmt(de)} a ${fmt(ate)}`
}
