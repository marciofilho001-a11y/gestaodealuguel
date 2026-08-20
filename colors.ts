import type { Casa } from "@/types"

// Paleta fixa — cada casa recebe uma cor distinta e consistente, baseada na
// posição dela na lista (não na coluna "cor" do banco, que hoje vem toda
// igual por padrão pra quem já tinha casas cadastradas antes disso).
// Mesma paleta do app original, também usada como --chart-N no tema.
export const PALETA_CASAS = [
  "#1B6B72",
  "#C9992B",
  "#8B5CF6",
  "#EC4899",
  "#059669",
  "#DC2626",
  "#2563EB",
  "#D97706",
  "#7C3AED",
  "#0891B2",
]

export function corDaCasa(casas: Casa[], casaId: number | null | undefined): string {
  const idx = casas.findIndex((c) => c.id === casaId)
  return PALETA_CASAS[idx >= 0 ? idx % PALETA_CASAS.length : 0]
}
