// Utilitários de formatação — portados 1:1 da lógica original do index.html

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
