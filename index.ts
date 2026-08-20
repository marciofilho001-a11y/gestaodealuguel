// Tipos espelhando exatamente o schema das tabelas no Supabase
// (aluguel_casas, aluguel_reservas, aluguel_ical_links)

export type Plataforma = "Airbnb" | "Booking" | "Outro"

export type StatusReserva = "confirmada" | "aguardando_pagamento" | "cancelada"

export type Origem = "manual" | "ical"

export interface Casa {
  id: number
  nome: string
  endereco: string | null
  cor: string | null
  ordem: number | null
  created_at: string
}

export interface Reserva {
  id: number
  casa_id: number | null
  plataforma: Plataforma | string
  hospede: string | null
  checkin: string // ISO date (YYYY-MM-DD)
  checkout: string // ISO date (YYYY-MM-DD)
  valor_diaria: number | null
  taxa_limpeza: number | null
  desconto: number | null
  valor_total: number | null
  ical_uid: string | null
  origem: Origem | string | null
  observacoes: string | null
  created_at: string
  status: StatusReserva | string | null
  comissao_plataforma: number | null
  /** Comissão do Marcio Filho em R$, travada no momento em que a reserva foi
   * salva (calculada a partir de Config.comissao_marcio_percentual) */
  comissao_marcio: number | null
}

/** Configurações gerais do app — uma linha só no banco (id sempre 1) */
export interface Config {
  id: number
  comissao_marcio_percentual: number
}

// Payloads de escrita (sem campos gerados pelo banco)
export type NovaReservaInput = Omit<Reserva, "id" | "created_at">
export type NovaCasaInput = { nome: string; endereco?: string | null }

// Dados extraídos de um print via OCR (parciais por natureza — nem sempre
// o texto reconhecido contém todos os campos)
export interface DadosExtraidosOCR {
  plataforma?: string
  hospede?: string
  checkin?: string
  checkout?: string
  taxa_limpeza?: number
  desconto?: number
  comissao_plataforma?: number
  valor_total?: number
  subtotal?: number
  diariasVariaveis?: boolean
  diariaMin?: number
  diariaMax?: number
}
