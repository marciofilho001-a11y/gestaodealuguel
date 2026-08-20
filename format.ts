// Utilitários de formatação — portados 1:1 da lógica original do index.html

export function formatBRL(v: number | null | undefined): string {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y.slice(2)}`
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
