// Utilitários de formatação — portados 1:1 da lógica original do index.html

import type { Reserva } from "@/types"

// A "Comissão plataforma" do Booking não vive na coluna comissao_plataforma
// (essa ficou congelada em 0 desde que o campo saiu do formulário — ver
// CLAUDE.md) — o formulário reaproveita o campo `desconto` pra isso (rótulo
// muda pra "Comissão plataforma (R$)" quando a reserva é do Booking, ver
// reserva-form.tsx). Pra Airbnb/Outro, `desconto` continua sendo desconto
// de hóspede de verdade, e a comissão (se houver) é a antiga
// comissao_plataforma. Essas duas funções são o único lugar que sabe disso
// — todo relatório de ganhos (Setor de Ganhos, resumo do dashboard, painel
// de detalhamento) deve ler a comissão e o bruto através delas, nunca dos
// campos crus, senão a comissão do Booking some da conta.
export function comissaoPlataformaEfetiva(r: Reserva): number {
  if (r.plataforma === "Booking") return Number(r.desconto) || 0
  return Number(r.comissao_plataforma) || 0
}

// valor_total já sai do banco com essa comissão subtraída na criação
// (valor_total = diárias + limpeza − desconto, ver use-aluguel-data.tsx) —
// pra um "bruto" de verdade, comparável entre plataformas, soma de volta
// só a parte do Booking. Airbnb/Outro não mudam (desconto ali é desconto
// mesmo, já é pra ficar dentro do bruto).
export function valorBrutoEfetivo(r: Reserva): number {
  const base = Number(r.valor_total) || 0
  return r.plataforma === "Booking" ? base + (Number(r.desconto) || 0) : base
}

export function formatBRL(v: number | null | undefined): string {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Sem casas decimais — usado em espaços bem apertados (cards do calendário)
// onde ",00" só ocupa espaço sem agregar informação.
export function formatBRLCompacto(v: number | null | undefined): string {
  return "R$ " + Math.round(v || 0).toLocaleString("pt-BR")
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y.slice(2)}`
}

// "dd/mm", sem ano — usado onde o contexto já deixa o ano óbvio (ex: card
// de reserva dentro do próprio calendário do mês).
export function formatDiaMes(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

// "Adriana Negrini" -> "Adriana N." — primeiro nome + inicial do segundo,
// pra caber em cards estreitos sem cortar o nome no meio.
export function abreviarNome(nome: string | null | undefined): string {
  if (!nome) return ""
  const partes = nome.trim().split(/\s+/)
  if (partes.length <= 1) return partes[0] || ""
  return `${partes[0]} ${partes[1].charAt(0).toUpperCase()}.`
}

export function calcularNoites(checkin: string | null | undefined, checkout: string | null | undefined): number {
  if (!checkin || !checkout) return 0
  const d1 = new Date(checkin)
  const d2 = new Date(checkout)
  const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
  return diff > 0 ? diff : 0
}

export function isoHoje(): string {
  return new Date().toISOString().slice(0, 10)
}

export function primeiroDiaMes(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export function ultimoDiaMes(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}
