import * as React from "react"
import { toast } from "sonner"

import { db } from "@/lib/supabase"
import { calcularNoites } from "@/lib/format"
import type { Casa, Config, Reserva, StatusReserva } from "@/types"

export type CasaSelecionada = number | "todas" | null

export interface ReservaPayload {
  casa_id: number
  plataforma: string
  hospede: string
  checkin: string
  checkout: string
  valor_diaria: number
  taxa_limpeza: number
  desconto: number
  comissao_plataforma: number
  comissao_marcio: number
  status: string
}

// Hook central de dados do app — porta 1:1 a lógica que no index.html
// original vivia solta no escopo global (casas, reservas, loadAll(),
// salvarCasa(), salvarReserva() etc). Mantém as mesmas regras de negócio
// (checagem de sobreposição, código de erro 23P01 da constraint EXCLUDE do
// Postgres). Sincronização iCal foi removida — não é mais utilizada.
export function useAluguelData() {
  const [casas, setCasas] = React.useState<Casa[]>([])
  const [reservas, setReservas] = React.useState<Reserva[]>([])
  const [config, setConfig] = React.useState<Config>({ id: 1, comissao_marcio_percentual: 0 })
  const [loading, setLoading] = React.useState(true)
  const [casaAtualId, setCasaAtualId] = React.useState<CasaSelecionada>(null)

  const loadAll = React.useCallback(async () => {
    setLoading(true)
    const [casasRes, reservasRes, configRes] = await Promise.all([
      db.from("aluguel_casas").select("*").order("ordem", { ascending: true }),
      db.from("aluguel_reservas").select("*").order("checkin", { ascending: true }),
      db.from("aluguel_config").select("*").eq("id", 1).maybeSingle(),
    ])
    const novasCasas = (casasRes.data as Casa[]) || []
    setCasas(novasCasas)
    setReservas((reservasRes.data as Reserva[]) || [])
    if (configRes.data) setConfig(configRes.data as Config)
    setCasaAtualId((atual) => atual ?? (novasCasas.length ? novasCasas[0].id : null))
    setLoading(false)
  }, [])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial de dados externos (Supabase) ao montar
    loadAll()
  }, [loadAll])

  // ============ CASAS ============
  const criarCasa = React.useCallback(
    async (nome: string, endereco: string) => {
      const { data, error } = await db
        .from("aluguel_casas")
        .insert({ nome, endereco, ordem: casas.length })
        .select()
        .single()
      if (error) {
        toast.error("Erro ao criar casa", { description: error.message })
        return null
      }
      setCasas((prev) => [...prev, data as Casa])
      setCasaAtualId((atual) => atual ?? (data as Casa).id)
      toast.success("Casa criada!")
      return data as Casa
    },
    [casas.length]
  )

  const atualizarCasa = React.useCallback(async (id: number, nome: string, endereco: string) => {
    const { error } = await db.from("aluguel_casas").update({ nome, endereco }).eq("id", id)
    if (error) {
      toast.error("Erro ao atualizar casa", { description: error.message })
      return false
    }
    setCasas((prev) => prev.map((c) => (c.id === id ? { ...c, nome, endereco } : c)))
    toast.success("Casa atualizada!")
    return true
  }, [])

  const deletarCasa = React.useCallback(
    async (id: number) => {
      const { error } = await db.from("aluguel_casas").delete().eq("id", id)
      if (error) {
        toast.error("Erro ao excluir casa", { description: error.message })
        return false
      }
      setCasas((prev) => prev.filter((c) => c.id !== id))
      setReservas((prev) => prev.filter((r) => r.casa_id !== id)) // já apagadas em cascata no banco
      setCasaAtualId((atual) => {
        if (atual !== id) return atual
        const restantes = casas.filter((c) => c.id !== id)
        return restantes.length ? restantes[0].id : null
      })
      toast("Casa excluída")
      return true
    },
    [casas]
  )

  // ============ RESERVAS ============
  const encontrarSobreposicao = React.useCallback(
    (casaId: number, checkin: string, checkout: string, ignorarId?: number) => {
      const ci = new Date(checkin)
      const co = new Date(checkout)
      return reservas.find((r) => {
        if (r.casa_id !== casaId) return false
        if (r.status === "cancelada") return false
        if (ignorarId && r.id === ignorarId) return false
        const rci = new Date(r.checkin)
        const rco = new Date(r.checkout)
        return ci < rco && co > rci
      })
    },
    [reservas]
  )

  const criarReserva = React.useCallback(
    async (payload: ReservaPayload) => {
      const noites = calcularNoites(payload.checkin, payload.checkout)
      if (noites <= 0) {
        toast.warning("Check-out precisa ser depois do check-in")
        return { ok: false as const }
      }
      const conflito = encontrarSobreposicao(payload.casa_id, payload.checkin, payload.checkout)
      if (conflito) {
        toast.error("Datas já ocupadas", {
          description: `${conflito.hospede || "Outra reserva"} (${conflito.checkin} – ${conflito.checkout})`,
        })
        return { ok: false as const, conflito }
      }
      const valor_total = noites * payload.valor_diaria + payload.taxa_limpeza - payload.desconto
      const { data, error } = await db
        .from("aluguel_reservas")
        .insert({ ...payload, valor_total, origem: "manual" })
        .select()
        .single()
      if (error) {
        if (error.code === "23P01") {
          toast.error("Essas datas já estão ocupadas para esta casa")
        } else {
          toast.error("Erro ao salvar reserva", { description: error.message })
        }
        return { ok: false as const }
      }
      setReservas((prev) => [...prev, data as Reserva])
      toast.success("Reserva adicionada!")
      return { ok: true as const, reserva: data as Reserva }
    },
    [encontrarSobreposicao]
  )

  const atualizarReserva = React.useCallback(
    async (id: number, payload: ReservaPayload) => {
      const noites = calcularNoites(payload.checkin, payload.checkout)
      if (noites <= 0) {
        toast.warning("Check-out precisa ser depois do check-in")
        return { ok: false as const }
      }
      const conflito = encontrarSobreposicao(payload.casa_id, payload.checkin, payload.checkout, id)
      if (conflito) {
        toast.error("Datas já ocupadas", { description: conflito.hospede || "Outra reserva" })
        return { ok: false as const, conflito }
      }
      const valor_total = noites * payload.valor_diaria + payload.taxa_limpeza - payload.desconto
      const updatePayload = { ...payload, valor_total }
      const { error } = await db.from("aluguel_reservas").update(updatePayload).eq("id", id)
      if (error) {
        if (error.code === "23P01") {
          toast.error("Essas datas já estão ocupadas para esta casa")
        } else {
          toast.error("Erro ao atualizar reserva", { description: error.message })
        }
        return { ok: false as const }
      }
      setReservas((prev) => prev.map((r) => (r.id === id ? { ...r, ...updatePayload } : r)))
      toast.success("Reserva atualizada!")
      return { ok: true as const }
    },
    [encontrarSobreposicao]
  )

  const deletarReserva = React.useCallback(async (id: number) => {
    const { error } = await db.from("aluguel_reservas").delete().eq("id", id)
    if (error) {
      toast.error("Erro ao excluir reserva", { description: error.message })
      return false
    }
    setReservas((prev) => prev.filter((r) => r.id !== id))
    toast("Reserva excluída")
    return true
  }, [])

  const atualizarStatusReserva = React.useCallback(async (id: number, novoStatus: StatusReserva) => {
    setReservas((prev) => prev.map((r) => (r.id === id ? { ...r, status: novoStatus } : r)))
    const { error } = await db.from("aluguel_reservas").update({ status: novoStatus }).eq("id", id)
    if (error) toast.error("Erro ao atualizar status", { description: error.message })
  }, [])

  // ============ CONFIGURAÇÕES ============
  const atualizarConfig = React.useCallback(async (comissaoMarcioPercentual: number) => {
    const { error } = await db
      .from("aluguel_config")
      .update({ comissao_marcio_percentual: comissaoMarcioPercentual })
      .eq("id", 1)
    if (error) {
      toast.error("Erro ao salvar configuração", { description: error.message })
      return false
    }
    setConfig((prev) => ({ ...prev, comissao_marcio_percentual: comissaoMarcioPercentual }))
    toast.success("Configuração salva!")
    return true
  }, [])

  return {
    casas,
    reservas,
    config,
    loading,
    casaAtualId,
    setCasaAtualId,
    refetch: loadAll,
    criarCasa,
    atualizarCasa,
    deletarCasa,
    criarReserva,
    atualizarReserva,
    deletarReserva,
    atualizarStatusReserva,
    atualizarConfig,
    encontrarSobreposicao,
  }
}

export type UseAluguelData = ReturnType<typeof useAluguelData>
