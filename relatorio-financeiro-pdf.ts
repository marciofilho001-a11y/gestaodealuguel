// Gerador do PDF do "Relatório Financeiro de Reservas".
//
// Por que o PDF é desenhado por código e não pela impressão do navegador
// (window.print): o navegador decide sozinho a orientação da folha (o
// calendário já pede A4 paisagem e a primeira página do relatório saía
// deitada), acrescenta cabeçalho e rodapé próprios com o endereço do site, e
// o layout muda conforme a largura da janela. Aqui a folha é sempre A4
// retrato, com margens, cabeçalho, rodapé e "Página X de Y" definidos por nós,
// e o arquivo sai idêntico em qualquer computador ou celular.
//
// Toda medida está em milímetros. Este arquivo só é carregado (import
// dinâmico) quando o usuário clica em "Gerar PDF", então a biblioteca jsPDF e
// as fontes não pesam no carregamento normal do app.
//
// Os NÚMEROS não são calculados aqui: vêm prontos de lib/relatorio-financeiro.ts
// (mesma fonte do Setor de Ganhos). Este arquivo só decide onde cada coisa cai
// na folha.

import { jsPDF } from "jspdf"

import { PLATFORM_COLOR } from "@/lib/platform"
import {
  rotularPeriodo,
  type LinhaRelatorio,
  type TotaisRelatorio,
} from "@/lib/relatorio-financeiro"
import { PLEX_BOLD, PLEX_REGULAR, PLEX_SEMIBOLD } from "@/lib/relatorio-financeiro-fontes"

export interface DadosRelatorioPdf {
  linhas: LinhaRelatorio[]
  totais: TotaisRelatorio
  de: string
  ate: string
  nomeCasa: string
  nomePlataforma: string
  mostrarMarcio: boolean
  emitidoEm?: Date
}

// ---------------------------------------------------------------------------
// Geometria (mm)
// ---------------------------------------------------------------------------

const PAGE_W = 210
const PAGE_H = 297
const M = 16 // margem esquerda e direita
const CW = PAGE_W - M * 2 // largura útil: 178
const BOTTOM = PAGE_H - 20 // nada de conteúdo abaixo disto (sobra espaço pro rodapé)
const CONT_TOP = 22 // onde o conteúdo recomeça nas páginas 2, 3...
const PT_POR_MM = 72 / 25.4

const HEAD_H = 7.5 // altura do cabeçalho da tabela
const ROW_H = 13.6 // altura de cada reserva (3 linhas de texto)
const RIGHT_PAD = 2.2 // respiro à direita das colunas numéricas

// ---------------------------------------------------------------------------
// Cores — as do app (index.css), com o teal um tom mais escuro nos textos
// pequenos para passar de 4,5:1 de contraste no papel branco.
// ---------------------------------------------------------------------------

type RGB = [number, number, number]

const COR = {
  tinta: [24, 24, 27] as RGB,
  suave: [113, 113, 122] as RGB, // texto secundário
  regua: [228, 228, 231] as RGB, // linhas finas
  painel: [244, 244, 245] as RGB,
  teal: [15, 118, 110] as RGB,
  tealFundo: [232, 245, 243] as RGB,
  tealTexto: [190, 224, 220] as RGB, // texto secundário sobre o teal
  ouroFundo: [245, 233, 208] as RGB,
  ouroTexto: [92, 68, 19] as RGB,
  branco: [255, 255, 255] as RGB,
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

type Peso = "regular" | "semibold" | "bold"

const FAMILIA: Record<Peso, string> = {
  regular: "PlexSans",
  semibold: "PlexSansSemi",
  bold: "PlexSansBold",
}

interface OpcoesTexto {
  peso?: Peso
  tamanho?: number // pt
  cor?: RGB
  align?: "left" | "right" | "center"
  /** Espaçamento entre letras, em em (0,12 = 12% do tamanho da fonte) */
  tracking?: number
}

function registrarFontes(doc: jsPDF) {
  doc.addFileToVFS("PlexSans-Regular.ttf", PLEX_REGULAR)
  doc.addFont("PlexSans-Regular.ttf", FAMILIA.regular, "normal")
  doc.addFileToVFS("PlexSans-SemiBold.ttf", PLEX_SEMIBOLD)
  doc.addFont("PlexSans-SemiBold.ttf", FAMILIA.semibold, "normal")
  doc.addFileToVFS("PlexSans-Bold.ttf", PLEX_BOLD)
  doc.addFont("PlexSans-Bold.ttf", FAMILIA.bold, "normal")
}

function trackMm(o: OpcoesTexto): number {
  return ((o.tracking ?? 0) * (o.tamanho ?? 8)) / PT_POR_MM
}

function medir(doc: jsPDF, s: string, o: OpcoesTexto = {}): number {
  doc.setFont(FAMILIA[o.peso ?? "regular"], "normal")
  doc.setFontSize(o.tamanho ?? 8)
  doc.setCharSpace(0)
  return doc.getTextWidth(s) + trackMm(o) * Math.max(s.length - 1, 0)
}

/** Escreve o texto (y = linha de base) e devolve a largura ocupada. */
function texto(doc: jsPDF, s: string, x: number, y: number, o: OpcoesTexto = {}): number {
  const w = medir(doc, s, o)
  const xi = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x
  doc.setFont(FAMILIA[o.peso ?? "regular"], "normal")
  doc.setFontSize(o.tamanho ?? 8)
  doc.setTextColor(...(o.cor ?? COR.tinta))
  doc.setCharSpace(trackMm(o))
  doc.text(s, xi, y)
  doc.setCharSpace(0)
  return w
}

/** Reduz o tamanho da fonte até o texto caber na largura dada. */
function tamanhoQueCabe(doc: jsPDF, s: string, o: OpcoesTexto, larguraMax: number): number {
  let tamanho = o.tamanho ?? 8
  while (tamanho > 6 && medir(doc, s, { ...o, tamanho }) > larguraMax) tamanho -= 0.5
  return tamanho
}

function truncar(doc: jsPDF, s: string, larguraMax: number, o: OpcoesTexto = {}): string {
  if (medir(doc, s, o) <= larguraMax) return s
  let t = s
  while (t.length > 1 && medir(doc, t + "…", o) > larguraMax) t = t.slice(0, -1)
  return t.trimEnd() + "…"
}

// A fonte embutida cobre Latin completo (português, espanhol, francês,
// alemão, polonês, turco...). Qualquer outro caractere (cirílico, emoji...)
// viraria um quadradinho vazio — troca por "?" pra o PDF nunca sair quebrado.
function suportado(cp: number): boolean {
  return (
    (cp >= 0x20 && cp <= 0x7e) ||
    (cp >= 0xa0 && cp <= 0x17f) ||
    (cp >= 0x218 && cp <= 0x21b) ||
    [0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x2192, 0x20ac, 0x2212].includes(cp)
  )
}

function limpar(s: string): string {
  let out = ""
  for (const ch of s.replace(/\s+/g, " ").trim().normalize("NFC")) {
    out += suportado(ch.codePointAt(0) ?? 0) ? ch : "?"
  }
  return out
}

const CONECTORES = new Set(["da", "de", "do", "das", "dos", "e", "di", "du"])

// "CASA MORRINHOS" -> "Casa Morrinhos"; "Patrícia ferreira" -> "Patrícia Ferreira".
// Só mexe na aparência do relatório — o cadastro no banco continua intacto.
function capitalizar(s: string): string {
  const base = limpar(s)
  const minuscula = base === base.toUpperCase() ? base.toLowerCase() : base
  return minuscula
    .split(" ")
    .map((p, i) => (i > 0 && CONECTORES.has(p.toLowerCase()) ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ")
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const brl = (v: number) => `R$ ${fmt(v)}`
const menos = (v: number) => `−${fmt(v)}` // sinal de menos de verdade, não hífen
const menosBrl = (v: number) => `−R$ ${fmt(v)}`
const dataBR = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

function hexParaRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ---------------------------------------------------------------------------
// Primitivas de desenho
// ---------------------------------------------------------------------------

function regua(doc: jsPDF, x1: number, x2: number, y: number, cor: RGB = COR.regua, largura = 0.15) {
  doc.setDrawColor(...cor)
  doc.setLineWidth(largura)
  doc.line(x1, y, x2, y)
}

function retangulo(doc: jsPDF, x: number, y: number, w: number, h: number, cor: RGB, raio = 0) {
  doc.setFillColor(...cor)
  if (raio > 0) doc.roundedRect(x, y, w, h, raio, raio, "F")
  else doc.rect(x, y, w, h, "F")
}

/** Título de seção: caixa-alta pequena e espaçada, com nota opcional à direita. */
function secao(doc: jsPDF, titulo: string, y: number, nota?: string) {
  texto(doc, titulo, M, y, { peso: "semibold", tamanho: 6.6, cor: COR.suave, tracking: 0.14 })
  if (nota) texto(doc, nota, M + CW, y, { tamanho: 7, cor: COR.suave, align: "right" })
}

// ---------------------------------------------------------------------------
// Página 1 — capa + resumo
// ---------------------------------------------------------------------------

function marca(doc: jsPDF, x: number, y: number, lado: number) {
  retangulo(doc, x, y, lado, lado, COR.teal, lado * 0.22)
}

function desenharCapa(doc: jsPDF, d: DadosRelatorioPdf, periodo: string, emitido: Date): number {
  // Linha de topo: marca à esquerda, data de emissão à direita
  marca(doc, M, 13.2, 2.6)
  texto(doc, "GESTÃO DE ALUGUEL", M + 4.2, 15.4, { peso: "semibold", tamanho: 6.6, cor: COR.teal, tracking: 0.18 })
  const quando = `${emitido.toLocaleDateString("pt-BR")} às ${emitido.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
  texto(doc, `Emitido em ${quando}`, M + CW, 15.4, { tamanho: 7, cor: COR.suave, align: "right" })

  // Título e recorte do relatório
  texto(doc, "Relatório Financeiro de Reservas", M, 27, { peso: "bold", tamanho: 21, tracking: -0.012 })
  texto(doc, periodo, M, 34.4, { tamanho: 9.5 })
  texto(doc, `${limpar(d.nomeCasa)}  ·  ${limpar(d.nomePlataforma)}`, M, 39.8, { tamanho: 8, cor: COR.suave })
  regua(doc, M, M + CW, 45.5, COR.regua, 0.25)

  return desenharResumo(doc, d.totais, 51)
}

function desenharResumo(doc: jsPDF, t: TotaisRelatorio, y: number): number {
  const h = 22
  const painelW = 116
  const heroX = M + painelW + 4
  const heroW = CW - painelW - 4

  // Painel com os números de apoio — sem grade, só espaço entre eles
  retangulo(doc, M, y, painelW, h, COR.painel, 2.2)
  const stats: { rotulo: string; valor: string; x: number }[] = [
    { rotulo: "RESERVAS", valor: String(t.totalReservas), x: M + 5 },
    { rotulo: "DIÁRIAS", valor: String(t.totalNoites), x: M + 27 },
    { rotulo: "TOTAL BRUTO", valor: brl(t.totalBruto), x: M + 49 },
    { rotulo: "COMISSÕES", valor: menosBrl(t.totalComissaoPlataforma), x: M + 83 },
  ]
  for (const s of stats) {
    texto(doc, s.rotulo, s.x, y + 8, { peso: "semibold", tamanho: 6.2, cor: COR.suave, tracking: 0.12 })
    texto(doc, s.valor, s.x, y + 15.6, { peso: "semibold", tamanho: 11 })
  }

  // O líquido é o número que o documento existe pra entregar: bloco cheio, à direita
  retangulo(doc, heroX, y, heroW, h, COR.teal, 2.2)
  texto(doc, "TOTAL LÍQUIDO", heroX + 5, y + 8, { peso: "semibold", tamanho: 6.2, cor: COR.tealTexto, tracking: 0.14 })
  const valor = brl(t.totalLiquido)
  const opc: OpcoesTexto = { peso: "bold", cor: COR.branco, tracking: -0.01 }
  const tamanho = tamanhoQueCabe(doc, valor, { ...opc, tamanho: 17 }, heroW - 10)
  texto(doc, valor, heroX + 5, y + 16.6, { ...opc, tamanho })

  return y + h + 11
}

// ---------------------------------------------------------------------------
// Páginas seguintes — cabeçalho compacto
// ---------------------------------------------------------------------------

function desenharCabecalhoContinuacao(doc: jsPDF, periodo: string) {
  marca(doc, M, 9.4, 2.2)
  texto(doc, "Relatório Financeiro de Reservas", M + 3.8, 11.3, { peso: "semibold", tamanho: 8 })
  texto(doc, periodo, M + CW, 11.3, { tamanho: 7.2, cor: COR.suave, align: "right" })
  regua(doc, M, M + CW, 15.5, COR.regua, 0.25)
}

// ---------------------------------------------------------------------------
// Tabela de reservas
// ---------------------------------------------------------------------------

type ChaveColuna = "reserva" | "diarias" | "limpeza" | "desconto" | "bruto" | "comissao" | "liquido"

interface Coluna {
  chave: ChaveColuna
  rotulo: string
  w: number
  x: number
}

// A coluna "Desconto" só existe quando alguma reserva do relatório teve
// desconto ao hóspede — coluna cheia de traços é ruído.
function montarColunas(comDesconto: boolean): Coluna[] {
  const base: [ChaveColuna, string, number][] = comDesconto
    ? [
        ["reserva", "RESERVA", 58],
        ["diarias", "DIÁRIAS", 22],
        ["limpeza", "LIMPEZA", 17],
        ["desconto", "DESCONTO", 17],
        ["bruto", "BRUTO", 21],
        ["comissao", "COMISSÃO", 20],
        ["liquido", "LÍQUIDO", 23],
      ]
    : [
        ["reserva", "RESERVA", 66],
        ["diarias", "DIÁRIAS", 24],
        ["limpeza", "LIMPEZA", 18],
        ["bruto", "BRUTO", 22],
        ["comissao", "COMISSÃO", 22],
        ["liquido", "LÍQUIDO", 26],
      ]
  let x = M
  return base.map(([chave, rotulo, w]) => {
    const c: Coluna = { chave, rotulo, w, x }
    x += w
    return c
  })
}

function desenharCabecalhoTabela(doc: jsPDF, cols: Coluna[], y: number) {
  const liq = cols.find((c) => c.chave === "liquido")
  if (liq) retangulo(doc, liq.x, y, liq.w, HEAD_H, COR.tealFundo)

  for (const c of cols) {
    const o: OpcoesTexto = {
      peso: "semibold",
      tamanho: 6.2,
      tracking: 0.12,
      cor: c.chave === "liquido" ? COR.teal : COR.suave,
    }
    if (c.chave === "reserva") texto(doc, c.rotulo, c.x + 3.4, y + 5, o)
    else texto(doc, c.rotulo, c.x + c.w - RIGHT_PAD, y + 5, { ...o, align: "right" })
  }
  regua(doc, M, M + CW, y + HEAD_H, COR.tinta, 0.3)
}

function desenharLinha(doc: jsPDF, cols: Coluna[], l: LinhaRelatorio, y: number) {
  const base = y + 4.9 // linha de base do texto principal — igual em todas as colunas
  const sub = y + 8.5 // segunda linha (detalhe)
  const terceira = y + 11.7

  const liq = cols.find((c) => c.chave === "liquido")
  if (liq) retangulo(doc, liq.x, y, liq.w, ROW_H, COR.tealFundo)

  // Filete na cor da plataforma — mesma linguagem visual do calendário
  const plataforma = capitalizar(l.reserva.plataforma || "Outro")
  const corPlat = hexParaRgb(PLATFORM_COLOR[l.reserva.plataforma || "Outro"] ?? PLATFORM_COLOR.Outro)
  retangulo(doc, M, y + 2.3, 0.9, ROW_H - 4.6, corPlat, 0.45)

  for (const c of cols) {
    const dir = c.x + c.w - RIGHT_PAD
    const num = (s: string, o: OpcoesTexto = {}) =>
      texto(doc, s, dir, base, {
        tamanho: 8,
        align: "right",
        ...o,
        cor: s === "—" ? COR.suave : (o.cor ?? COR.tinta),
      })
    const zeroOu = (v: number, f: (n: number) => string) => (v > 0 ? f(v) : "—")

    switch (c.chave) {
      case "reserva": {
        const x0 = c.x + 3.4
        const larg = c.w - 3.4 - 2
        const nome = truncar(doc, capitalizar(l.reserva.hospede || "Hóspede não informado"), larg, {
          peso: "semibold",
          tamanho: 8.6,
        })
        texto(doc, nome, x0, base, { peso: "semibold", tamanho: 8.6 })
        const casa = l.casa ? capitalizar(l.casa.nome) : "Casa removida"
        texto(doc, truncar(doc, `${casa}  ·  ${plataforma}`, larg, { tamanho: 7 }), x0, sub, {
          tamanho: 7,
          cor: COR.suave,
        })
        const periodo = `${dataBR(l.reserva.checkin)} → ${dataBR(l.reserva.checkout)}  ·  ${plural(l.noites, "diária", "diárias")}`
        texto(doc, truncar(doc, periodo, larg, { tamanho: 7 }), x0, terceira, { tamanho: 7, cor: COR.suave })
        break
      }
      case "diarias":
        num(zeroOu(l.subtotalDiarias, fmt))
        texto(doc, `${l.noites} × ${fmt(l.diariaMedia)}`, dir, sub, { tamanho: 6.8, cor: COR.suave, align: "right" })
        break
      case "limpeza":
        num(zeroOu(l.limpeza, fmt))
        break
      case "desconto":
        num(zeroOu(l.descontoHospede, menos))
        break
      case "bruto":
        num(fmt(l.bruto), { peso: "semibold" })
        break
      case "comissao": {
        num(zeroOu(l.comissaoPlataforma, menos))
        if (l.comissaoPlataforma > 0 && l.bruto > 0) {
          const pct = (l.comissaoPlataforma / l.bruto) * 100
          const s = `${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
          texto(doc, s, dir, sub, { tamanho: 6.8, cor: COR.suave, align: "right" })
        }
        break
      }
      case "liquido":
        num(fmt(l.liquido), { peso: "bold", tamanho: 8.8, cor: COR.teal })
        break
    }
  }

  regua(doc, M, M + CW, y + ROW_H)
}

// ---------------------------------------------------------------------------
// Totais consolidados
// ---------------------------------------------------------------------------

interface LinhaTotal {
  rotulo: string
  valor: string
  forte?: boolean
}

function linhasDeTotais(t: TotaisRelatorio): LinhaTotal[] {
  const l: LinhaTotal[] = [
    { rotulo: "Reservas", valor: String(t.totalReservas) },
    { rotulo: "Diárias", valor: String(t.totalNoites) },
    { rotulo: "Soma das diárias", valor: brl(t.totalSubtotalDiarias) },
  ]
  if (t.totalLimpeza > 0) l.push({ rotulo: "Taxas de limpeza", valor: brl(t.totalLimpeza) })
  if (t.totalDescontoHospede > 0) l.push({ rotulo: "Descontos ao hóspede", valor: menosBrl(t.totalDescontoHospede) })
  l.push({ rotulo: "Total bruto", valor: brl(t.totalBruto), forte: true })
  l.push({ rotulo: "Comissões da plataforma", valor: menosBrl(t.totalComissaoPlataforma) })
  return l
}

const TOTAL_ROW_H = 6.4
const HERO_H = 15

function alturaTotais(t: TotaisRelatorio): number {
  return linhasDeTotais(t).length * TOTAL_ROW_H + 4 + HERO_H
}

const NOTAS = [
  "Diárias = data de saída − data de entrada.",
  "Valor bruto = diárias + taxa de limpeza − desconto ao hóspede.",
  "Valor líquido = valor bruto − comissão da plataforma.",
  "Entram as reservas cuja estadia cruza o período escolhido. Reservas canceladas não são contabilizadas.",
]

function desenharTotais(doc: jsPDF, y: number, t: TotaisRelatorio): number {
  const w = 84
  const x0 = M + CW - w

  // À esquerda: as regras do cálculo, pra quem for conferir
  texto(doc, "COMO LER", M, y + 3.6, { peso: "semibold", tamanho: 6.4, cor: COR.suave, tracking: 0.14 })
  let ny = y + 8.4
  for (const nota of NOTAS) {
    doc.setFont(FAMILIA.regular, "normal")
    doc.setFontSize(7.2)
    const partes = doc.splitTextToSize(nota, 78) as string[]
    for (const p of partes) {
      texto(doc, p, M, ny, { tamanho: 7.2, cor: COR.suave })
      ny += 3.6
    }
    ny += 1.4
  }

  // À direita: a "escada" consolidada até o líquido
  let ry = y
  linhasDeTotais(t).forEach((r, i) => {
    if (r.forte) regua(doc, x0, x0 + w, ry, COR.tinta, 0.3)
    else if (i > 0) regua(doc, x0, x0 + w, ry)
    const base = ry + 4.4
    texto(doc, r.rotulo, x0, base, {
      peso: r.forte ? "semibold" : "regular",
      tamanho: 8,
      cor: r.forte ? COR.tinta : COR.suave,
    })
    texto(doc, r.valor, x0 + w, base, { peso: r.forte ? "semibold" : "regular", tamanho: 8, align: "right" })
    ry += TOTAL_ROW_H
  })

  ry += 4
  retangulo(doc, x0, ry, w, HERO_H, COR.teal, 2.2)
  texto(doc, "TOTAL LÍQUIDO", x0 + 5, ry + 6.2, { peso: "semibold", tamanho: 6.6, cor: COR.branco, tracking: 0.14 })
  texto(doc, "bruto menos comissões", x0 + 5, ry + 10.6, { tamanho: 6.4, cor: COR.tealTexto })
  const valor = brl(t.totalLiquido)
  const opc: OpcoesTexto = { peso: "bold", cor: COR.branco, tracking: -0.01 }
  const tamanho = tamanhoQueCabe(doc, valor, { ...opc, tamanho: 15 }, w - 46)
  texto(doc, valor, x0 + w - 5, ry + 9.8, { ...opc, tamanho, align: "right" })

  return ry + HERO_H
}

// ---------------------------------------------------------------------------
// Bloco separado: Comissão Marcio Filho (fora do "Total líquido" do escopo)
// ---------------------------------------------------------------------------

const MARCIO_ROW_H = 6.4
const MARCIO_HEAD_H = 7
const MARCIO_COLS: { rotulo: string; w: number }[] = [
  { rotulo: "RESERVA", w: 70 },
  { rotulo: "LÍQUIDO", w: 34 },
  { rotulo: "COMISSÃO", w: 34 },
  { rotulo: "LÍQUIDO FINAL", w: 40 },
]

function desenharCabecalhoMarcio(doc: jsPDF, y: number) {
  let x = M
  MARCIO_COLS.forEach((c, i) => {
    const o: OpcoesTexto = { peso: "semibold", tamanho: 6.2, tracking: 0.12, cor: COR.suave }
    if (i === 0) texto(doc, c.rotulo, x, y + 4.6, o)
    else texto(doc, c.rotulo, x + c.w - RIGHT_PAD, y + 4.6, { ...o, align: "right" })
    x += c.w
  })
  regua(doc, M, M + CW, y + MARCIO_HEAD_H, COR.tinta, 0.3)
}

function desenharLinhaMarcio(doc: jsPDF, l: LinhaRelatorio, y: number) {
  const base = y + 4.3
  const larg = MARCIO_COLS[0].w - 3
  const nome = truncar(doc, capitalizar(l.reserva.hospede || "Hóspede não informado"), larg - 12, { tamanho: 8 })
  const wNome = texto(doc, nome, M, base, { tamanho: 8 })
  const [, mes, dia] = l.reserva.checkin.split("-") // AAAA-MM-DD
  if (mes && dia) texto(doc, `  ${dia}/${mes}`, M + wNome, base, { tamanho: 7, cor: COR.suave })

  const x1 = M + MARCIO_COLS[0].w
  const x2 = x1 + MARCIO_COLS[1].w
  const x3 = x2 + MARCIO_COLS[2].w
  texto(doc, fmt(l.liquido), x2 - RIGHT_PAD, base, { tamanho: 8, align: "right" })
  texto(doc, l.comissaoMarcio > 0 ? menos(l.comissaoMarcio) : "—", x3 - RIGHT_PAD, base, {
    tamanho: 8,
    align: "right",
    cor: l.comissaoMarcio > 0 ? COR.tinta : COR.suave,
  })
  texto(doc, fmt(l.liquidoFinal), M + CW - RIGHT_PAD, base, { peso: "semibold", tamanho: 8, align: "right" })
  regua(doc, M, M + CW, y + MARCIO_ROW_H)
}

function desenharFechamentoMarcio(doc: jsPDF, y: number, t: TotaisRelatorio): number {
  // Linha de total do bloco
  const base = y + 4.6
  const x2 = M + MARCIO_COLS[0].w + MARCIO_COLS[1].w
  const x3 = x2 + MARCIO_COLS[2].w
  regua(doc, M, M + CW, y, COR.tinta, 0.3)
  texto(doc, "Total", M, base, { peso: "semibold", tamanho: 8 })
  texto(doc, fmt(t.totalLiquido), x2 - RIGHT_PAD, base, { peso: "semibold", tamanho: 8, align: "right" })
  texto(doc, menos(t.totalComissaoMarcio), x3 - RIGHT_PAD, base, { peso: "semibold", tamanho: 8, align: "right" })
  texto(doc, fmt(t.totalLiquidoFinal), M + CW - RIGHT_PAD, base, { peso: "semibold", tamanho: 8, align: "right" })

  // Faixa de destaque
  const fy = y + 10
  const h = 13
  retangulo(doc, M, fy, CW, h, COR.ouroFundo, 2.2)
  texto(doc, "LÍQUIDO FINAL APÓS COMISSÃO", M + 5, fy + 8, {
    peso: "semibold",
    tamanho: 6.8,
    cor: COR.ouroTexto,
    tracking: 0.14,
  })
  texto(doc, brl(t.totalLiquidoFinal), M + CW - 5, fy + 8.4, {
    peso: "bold",
    tamanho: 12,
    cor: COR.ouroTexto,
    align: "right",
  })
  return fy + h
}

// ---------------------------------------------------------------------------
// Rodapé (todas as páginas, desenhado no fim, quando já se sabe o total)
// ---------------------------------------------------------------------------

function desenharRodapes(doc: jsPDF) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    regua(doc, M, M + CW, PAGE_H - 15.5, COR.regua, 0.25)
    texto(doc, "Gestão de Aluguel  ·  Relatório Financeiro de Reservas", M, PAGE_H - 10.8, {
      tamanho: 6.8,
      cor: COR.suave,
    })
    texto(doc, `Página ${i} de ${total}`, M + CW, PAGE_H - 10.8, { tamanho: 6.8, cor: COR.suave, align: "right" })
  }
}

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

export function montarRelatorioPdf(d: DadosRelatorioPdf): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true })
  registrarFontes(doc)

  const periodo = rotularPeriodo(d.de, d.ate)
  doc.setProperties({
    title: "Relatório Financeiro de Reservas",
    subject: periodo,
    author: "Gestão de Aluguel",
    creator: "Gestão de Aluguel",
  })

  const cols = montarColunas(d.totais.totalDescontoHospede > 0)
  const novaPagina = (): number => {
    doc.addPage()
    desenharCabecalhoContinuacao(doc, periodo)
    return CONT_TOP
  }

  // Página 1: capa + resumo, depois a tabela
  let y = desenharCapa(doc, d, periodo, d.emitidoEm ?? new Date())
  secao(doc, "DETALHAMENTO POR RESERVA", y, `${plural(d.linhas.length, "reserva", "reservas")}  ·  valores em R$`)
  y += 3.4
  desenharCabecalhoTabela(doc, cols, y)
  y += HEAD_H

  for (const l of d.linhas) {
    if (y + ROW_H > BOTTOM) {
      y = novaPagina()
      desenharCabecalhoTabela(doc, cols, y)
      y += HEAD_H
    }
    desenharLinha(doc, cols, l, y)
    y += ROW_H
  }

  // Totais consolidados (nunca partidos entre duas páginas)
  y += 10
  if (y + alturaTotais(d.totais) > BOTTOM) y = novaPagina()
  y = desenharTotais(doc, y, d.totais)

  // Comissão Marcio Filho, em bloco à parte
  if (d.mostrarMarcio && d.totais.totalComissaoMarcio > 0) {
    y += 12
    if (y + 46 > BOTTOM) y = novaPagina()
    secao(doc, "REPASSE  ·  COMISSÃO MARCIO FILHO", y, "não entra no Total líquido")
    y += 3.4
    desenharCabecalhoMarcio(doc, y)
    y += MARCIO_HEAD_H
    for (const l of d.linhas) {
      if (y + MARCIO_ROW_H > BOTTOM) {
        y = novaPagina()
        desenharCabecalhoMarcio(doc, y)
        y += MARCIO_HEAD_H
      }
      desenharLinhaMarcio(doc, l, y)
      y += MARCIO_ROW_H
    }
    if (y + 24 > BOTTOM) y = novaPagina()
    desenharFechamentoMarcio(doc, y, d.totais)
  }

  desenharRodapes(doc)
  return doc
}

export function nomeArquivoRelatorio(d: Pick<DadosRelatorioPdf, "de" | "ate">): string {
  return `Relatorio-Financeiro_${d.de || "inicio"}_a_${d.ate || "hoje"}.pdf`
}

/** Monta o PDF e dispara o download no navegador. */
export function gerarRelatorioFinanceiroPdf(d: DadosRelatorioPdf): void {
  montarRelatorioPdf(d).save(nomeArquivoRelatorio(d))
}
