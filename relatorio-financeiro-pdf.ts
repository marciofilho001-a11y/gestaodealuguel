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
// dinâmico) quando o usuário clica em "Gerar PDF", então a biblioteca jsPDF, as
// fontes e as fotos não pesam no carregamento normal do app.
//
// Peças que compõem o documento (todas carregadas junto com este arquivo):
//  - relatorio-financeiro-fontes.ts   fonte IBM Plex Sans embutida
//  - relatorio-financeiro-imagens.ts  fotos das casas (miniaturas JPEG)
//  - relatorio-financeiro-icones.ts   ícones (dados; gerado a partir do Lucide)
//  - relatorio-financeiro-vetor.ts    desenha os ícones como vetor no PDF
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
import type { NomeIcone } from "@/lib/relatorio-financeiro-icones"
import { FOTO_CASA_CINZA, FOTO_CASA_LARANJA } from "@/lib/relatorio-financeiro-imagens"
import { desenharIcone } from "@/lib/relatorio-financeiro-vetor"

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

const HEAD_H = 8.4 // altura da faixa de títulos das colunas
const CARD_H = 17.6 // altura de cada cartão de reserva
const CARD_GAP = 2.2 // espaço entre cartões
const CARD_R = 2.8 // raio dos cantos do cartão
const PITCH = CARD_H + CARD_GAP // de um cartão ao seguinte
const THUMB_W = 17.7 // foto da casa (mesma proporção do recorte: 288 x 212 px)
const THUMB_H = 13
const THUMB_X = 4.4 // distância da foto até a borda esquerda do cartão
const PILL_H = 10.6 // altura do selo verde do líquido
const RIGHT_PAD = 1.8 // respiro à direita das colunas numéricas

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
  vermelho: [204, 34, 44] as RGB, // deduções (comissão, desconto): 5,7:1 no branco
  sombra: [238, 239, 242] as RGB, // "sombra" do cartão
  bordaCartao: [226, 228, 233] as RGB,
  bordaFoto: [214, 217, 222] as RGB,
  faixaCabecalho: [246, 247, 249] as RGB,
  filete: [234, 236, 240] as RGB, // divisores verticais dentro do cartão
  iconeSuave: [161, 161, 170] as RGB, // ícones decorativos (setinha, foto vazia)
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
// Detalhamento por reserva: cabeçalho da seção + cartões (um por reserva)
// ---------------------------------------------------------------------------

/**
 * Cada casa tem uma foto no cartão. As fotos foram enviadas pelo dono do app e
 * são ligadas às casas pelo NOME (sem acento e sem diferenciar maiúscula):
 *  - "Morrinhos"  → casa laranja
 *  - "Vila"       → sobrado cinza (Residencial da Vila 2, 3, ...)
 * Casa nova, com outro nome, ganha um quadradinho neutro com o ícone de casa.
 */
function fotoDaCasa(nome: string | undefined): { alias: string; dados: string } | null {
  if (!nome) return null
  const n = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  if (n.includes("morrinhos")) return { alias: "foto-casa-laranja", dados: FOTO_CASA_LARANJA }
  if (n.includes("vila")) return { alias: "foto-casa-cinza", dados: FOTO_CASA_CINZA }
  return null
}

type ChaveNumerica = "diarias" | "limpeza" | "desconto" | "bruto" | "comissao"

interface ColunaNumerica {
  chave: ChaveNumerica
  rotulo: string
  icone: NomeIcone
  /** largura da coluna */
  w: number
  /** borda direita (coordenada absoluta) — os números se alinham por ela */
  dir: number
}

interface Layout {
  colunas: ColunaNumerica[]
  comDesconto: boolean
  pillX: number
  pillW: number
  pillFonte: number
  textoX: number
  textoW: number
  /** x dos filetes verticais que separam os grupos dentro do cartão */
  divisores: number[]
}

// A coluna "Desconto" só existe quando alguma reserva do relatório teve
// desconto ao hóspede — coluna cheia de traços é ruído. Quando existe, tudo
// fica um pouco mais apertado pra ela caber sem espremer o nome da casa.
function montarLayout(comDesconto: boolean): Layout {
  const pillW = comDesconto ? 24 : 26.5
  const pillX = M + CW - 7.6 - pillW
  const defs: [ChaveNumerica, string, NomeIcone, number][] = comDesconto
    ? [
        ["diarias", "DIÁRIAS", "calendario", 15.4],
        ["limpeza", "LIMPEZA", "brilho", 14.6],
        ["desconto", "DESCONTO", "etiqueta", 16.2],
        ["bruto", "BRUTO", "recibo", 14.4],
        ["comissao", "COMISSÃO", "percentual", 17],
      ]
    : [
        ["diarias", "DIÁRIAS", "calendario", 16],
        ["limpeza", "LIMPEZA", "brilho", 15.2],
        ["bruto", "BRUTO", "recibo", 15],
        ["comissao", "COMISSÃO", "percentual", 17.2],
      ]

  // Monta da direita para a esquerda, a partir do selo do líquido
  const colunas: ColunaNumerica[] = []
  let dir = pillX - 2.6
  for (let i = defs.length - 1; i >= 0; i--) {
    const [chave, rotulo, icone, w] = defs[i]
    colunas.unshift({ chave, rotulo, icone, w, dir })
    dir -= w
  }
  const numerosX = dir // borda esquerda da primeira coluna numérica
  const textoX = M + THUMB_X + THUMB_W + 3
  const comissao = colunas[colunas.length - 1]

  return {
    colunas,
    comDesconto,
    pillX,
    pillW,
    pillFonte: comDesconto ? 7.6 : 8,
    textoX,
    textoW: numerosX - 2.6 - textoX,
    divisores: [numerosX - 1.3, comissao.dir - comissao.w],
  }
}

/** Metade da altura de uma letra maiúscula: serve pra centralizar texto na vertical. */
const meiaCaixaAlta = (tamanhoPt: number) => (0.35 * tamanhoPt) / PT_POR_MM

function desenharSecaoDetalhe(doc: jsPDF, y: number, qtd: number, totalLiquido: number): number {
  // Quadrinho com o ícone de calendário + título e legenda
  const tile = 10.5
  const iconeTile = 5.6
  retangulo(doc, M, y + 0.5, tile, tile, COR.tealFundo, 2.8)
  desenharIcone(doc, "calendario", M + (tile - iconeTile) / 2, y + 0.5 + (tile - iconeTile) / 2, iconeTile, COR.teal, 1.7)
  const tx = M + tile + 3.4
  texto(doc, "Detalhamento por Reserva", tx, y + 4.6, { peso: "bold", tamanho: 12.5, tracking: -0.005 })
  texto(doc, `${plural(qtd, "reserva", "reservas")}  ·  Valores em R$`, tx, y + 9.2, {
    tamanho: 7.6,
    cor: COR.suave,
  })

  // Selo do total líquido, à direita
  const h = 11.5
  const w = 58
  const x = M + CW - w
  retangulo(doc, x, y, w, h, COR.tealFundo, 3)
  const icone = 6.2
  desenharIcone(doc, "saco", x + 3.4, y + (h - icone) / 2, icone, COR.teal, 1.6)
  const vx = x + 3.4 + icone + 2.6
  texto(doc, "Total Líquido", vx, y + 4.5, { tamanho: 6.8, cor: COR.suave })
  const valor = brl(totalLiquido)
  const opc: OpcoesTexto = { peso: "bold", cor: COR.teal, tracking: -0.005 }
  const tam = tamanhoQueCabe(doc, valor, { ...opc, tamanho: 11.5 }, x + w - 3 - vx)
  texto(doc, valor, vx, y + 9.6, { ...opc, tamanho: tam })

  return y + h
}

function desenharCabecalhoTabela(doc: jsPDF, lay: Layout, y: number) {
  doc.setFillColor(...COR.faixaCabecalho)
  doc.setDrawColor(...COR.bordaCartao)
  doc.setLineWidth(0.2)
  doc.roundedRect(M, y, CW, HEAD_H, 2.4, 2.4, "FD")

  const o: OpcoesTexto = { peso: "semibold", tamanho: 5.6, tracking: 0.07, cor: COR.suave }
  const isz = 2.8
  const iy = y + (HEAD_H - isz) / 2
  const base = y + HEAD_H / 2 + meiaCaixaAlta(5.6)
  const gap = 0.9

  // RESERVA: alinhado com a foto do cartão
  desenharIcone(doc, "casa", M + THUMB_X, iy, isz, COR.teal, 1.9)
  texto(doc, "RESERVA", M + THUMB_X + isz + gap, base, o)

  // Colunas numéricas: [ícone][rótulo], terminando na borda direita dos números
  for (const c of lay.colunas) {
    const xDir = c.dir - RIGHT_PAD
    const w = texto(doc, c.rotulo, xDir, base, { ...o, align: "right" })
    desenharIcone(doc, c.icone, xDir - w - gap - isz, iy, isz, COR.teal, 1.9)
  }

  // LÍQUIDO: centralizado sobre o selo verde dos cartões
  const wl = medir(doc, "LÍQUIDO", o)
  const xl = lay.pillX + (lay.pillW - (isz + gap + wl)) / 2
  desenharIcone(doc, "pilha", xl, iy, isz, COR.teal, 1.9)
  texto(doc, "LÍQUIDO", xl + isz + gap, base, { ...o, cor: COR.teal })
}

function desenharFoto(doc: jsPDF, nomeCasa: string | undefined, x: number, y: number) {
  const foto = fotoDaCasa(nomeCasa)
  doc.saveGraphicsState()
  doc.roundedRect(x, y, THUMB_W, THUMB_H, 2, 2, null)
  doc.clip()
  doc.discardPath()
  if (foto) {
    doc.addImage(foto.dados, "JPEG", x, y, THUMB_W, THUMB_H, foto.alias)
  } else {
    retangulo(doc, x, y, THUMB_W, THUMB_H, COR.painel)
    const s = 7
    desenharIcone(doc, "casa", x + (THUMB_W - s) / 2, y + (THUMB_H - s) / 2, s, COR.iconeSuave, 1.5)
  }
  doc.restoreGraphicsState()

  // Filete fino por cima, pra a foto não "vazar" no fundo branco
  doc.setDrawColor(...COR.bordaFoto)
  doc.setLineWidth(0.2)
  doc.roundedRect(x, y, THUMB_W, THUMB_H, 2, 2, "S")
}

function desenharCartao(doc: jsPDF, lay: Layout, l: LinhaRelatorio, y: number) {
  const chavePlat = l.reserva.plataforma || "Outro"
  const corPlat = hexParaRgb(PLATFORM_COLOR[chavePlat] ?? PLATFORM_COLOR.Outro)

  // Sombra suave + corpo branco com borda fina
  retangulo(doc, M + 0.3, y + 0.6, CW - 0.6, CARD_H, COR.sombra, CARD_R)
  doc.setFillColor(...COR.branco)
  doc.setDrawColor(...COR.bordaCartao)
  doc.setLineWidth(0.2)
  doc.roundedRect(M, y, CW, CARD_H, CARD_R, CARD_R, "FD")

  // Faixa lateral na cor da plataforma (recortada pelo contorno arredondado)
  doc.saveGraphicsState()
  doc.roundedRect(M, y, CW, CARD_H, CARD_R, CARD_R, null)
  doc.clip()
  doc.discardPath()
  retangulo(doc, M, y, 1.9, CARD_H, corPlat)
  doc.restoreGraphicsState()

  // Filetes verticais entre os grupos (identidade | valores | comissão)
  for (const dx of lay.divisores) {
    doc.setDrawColor(...COR.filete)
    doc.setLineWidth(0.2)
    doc.line(dx, y + 3.2, dx, y + CARD_H - 3.2)
  }

  // Foto da casa
  desenharFoto(doc, l.casa?.nome, M + THUMB_X, y + (CARD_H - THUMB_H) / 2)

  // Identidade: nome, casa · plataforma, período
  const x0 = lay.textoX
  const isz = 3
  const larg = lay.textoW
  const l1 = y + 6.1
  const l2 = y + 10.3
  const l3 = y + 14.3
  const nome = truncar(doc, capitalizar(l.reserva.hospede || "Hóspede não informado"), larg, {
    peso: "semibold",
    tamanho: 8.8,
  })
  texto(doc, nome, x0, l1, { peso: "semibold", tamanho: 8.8 })

  const casa = l.casa ? capitalizar(l.casa.nome) : "Casa removida"
  const plataforma = capitalizar(chavePlat)
  desenharIcone(doc, "pino", x0, l2 - 2.35, isz, COR.teal, 1.9)
  const linhaCasa = `${casa}  ·  ${plataforma}`
  const tamCasa = tamanhoQueCabe(doc, linhaCasa, { tamanho: 6.8 }, larg - isz - 1.2)
  texto(doc, truncar(doc, linhaCasa, larg - isz - 1.2, { tamanho: tamCasa }), x0 + isz + 1.2, l2, {
    tamanho: tamCasa,
    cor: COR.suave,
  })

  // Com a coluna "Desconto" o espaço é curto: a contagem de diárias já aparece
  // na coluna Diárias ("5 × 600,00"), então sai daqui.
  const datas = `${dataBR(l.reserva.checkin)} → ${dataBR(l.reserva.checkout)}`
  const periodo = lay.comDesconto ? datas : `${datas}  ·  ${plural(l.noites, "diária", "diárias")}`
  desenharIcone(doc, "calendarioSimples", x0, l3 - 2.35, isz, COR.teal, 1.9)
  const tamPeriodo = tamanhoQueCabe(doc, periodo, { tamanho: 6.8 }, larg - isz - 1.2)
  texto(doc, truncar(doc, periodo, larg - isz - 1.2, { tamanho: tamPeriodo }), x0 + isz + 1.2, l3, {
    tamanho: tamPeriodo,
    cor: COR.suave,
  })

  // Valores
  const base = y + 8.2
  const sub = y + 12
  for (const c of lay.colunas) {
    const dir = c.dir - RIGHT_PAD
    const larguraMax = c.w - RIGHT_PAD - 0.4
    const num = (s: string, o: OpcoesTexto = {}) => {
      const opc: OpcoesTexto = { peso: "semibold", tamanho: 8, ...o }
      const tam = tamanhoQueCabe(doc, s, opc, larguraMax)
      texto(doc, s, dir, base, { ...opc, tamanho: tam, align: "right" })
    }
    const traco = () => texto(doc, "–", dir, base, { tamanho: 8, cor: COR.suave, align: "right" })
    const legenda = (s: string) =>
      texto(doc, s, dir, sub, {
        tamanho: tamanhoQueCabe(doc, s, { tamanho: 6.4 }, larguraMax),
        cor: COR.suave,
        align: "right",
      })

    switch (c.chave) {
      case "diarias":
        if (l.subtotalDiarias > 0) num(fmt(l.subtotalDiarias))
        else traco()
        legenda(`${l.noites} × ${fmt(l.diariaMedia)}`)
        break
      case "limpeza":
        if (l.limpeza > 0) num(fmt(l.limpeza))
        else traco()
        break
      case "desconto":
        if (l.descontoHospede > 0) num(menos(l.descontoHospede), { cor: COR.vermelho })
        else traco()
        break
      case "bruto":
        num(fmt(l.bruto))
        break
      case "comissao":
        if (l.comissaoPlataforma > 0) {
          num(menos(l.comissaoPlataforma), { cor: COR.vermelho })
          if (l.bruto > 0) {
            const pct = (l.comissaoPlataforma / l.bruto) * 100
            legenda(`${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`)
          }
        } else traco()
        break
    }
  }

  // Selo verde com o líquido — o número que o relatório existe pra entregar
  const py = y + (CARD_H - PILL_H) / 2
  retangulo(doc, lay.pillX, py, lay.pillW, PILL_H, COR.tealFundo, 2.8)
  const iconePill = 3.4
  desenharIcone(doc, "pilha", lay.pillX + 2.4, y + (CARD_H - iconePill) / 2, iconePill, COR.teal, 1.9)
  const valor = brl(l.liquido)
  const opc: OpcoesTexto = { peso: "bold", cor: COR.teal }
  const disponivel = lay.pillW - 2.4 - iconePill - 1.6 - 2.2
  const tam = tamanhoQueCabe(doc, valor, { ...opc, tamanho: lay.pillFonte }, disponivel)
  texto(doc, valor, lay.pillX + lay.pillW - 2.2, y + CARD_H / 2 + meiaCaixaAlta(tam), {
    ...opc,
    tamanho: tam,
    align: "right",
  })

  // Setinha à direita
  desenharIcone(doc, "seta", M + CW - 5.6, y + (CARD_H - 3.2) / 2, 3.2, COR.iconeSuave, 2)
}

// ---------------------------------------------------------------------------
// Totais consolidados
// ---------------------------------------------------------------------------

interface LinhaTotal {
  rotulo: string
  valor: string
  icone: NomeIcone
  forte?: boolean
}

// Mesmos ícones das colunas dos cartões: quem viu "Limpeza" com a faísca lá em
// cima reconhece a mesma categoria aqui embaixo.
function linhasDeTotais(t: TotaisRelatorio): LinhaTotal[] {
  const l: LinhaTotal[] = [
    { rotulo: "Reservas", valor: String(t.totalReservas), icone: "casa" },
    { rotulo: "Diárias", valor: String(t.totalNoites), icone: "lua" },
    { rotulo: "Soma das diárias", valor: brl(t.totalSubtotalDiarias), icone: "calendario" },
  ]
  if (t.totalLimpeza > 0) l.push({ rotulo: "Taxas de limpeza", valor: brl(t.totalLimpeza), icone: "brilho" })
  if (t.totalDescontoHospede > 0)
    l.push({ rotulo: "Descontos ao hóspede", valor: menosBrl(t.totalDescontoHospede), icone: "etiqueta" })
  l.push({ rotulo: "Total bruto", valor: brl(t.totalBruto), icone: "recibo", forte: true })
  l.push({ rotulo: "Comissões da plataforma", valor: menosBrl(t.totalComissaoPlataforma), icone: "percentual" })
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
    desenharIcone(doc, r.icone, x0, ry + (TOTAL_ROW_H - 3.2) / 2, 3.2, COR.teal, 1.9)
    texto(doc, r.rotulo, x0 + 5.2, base, {
      peso: r.forte ? "semibold" : "regular",
      tamanho: 8,
      cor: r.forte ? COR.tinta : COR.suave,
    })
    texto(doc, r.valor, x0 + w, base, { peso: r.forte ? "semibold" : "regular", tamanho: 8, align: "right" })
    ry += TOTAL_ROW_H
  })

  ry += 4
  retangulo(doc, x0, ry, w, HERO_H, COR.teal, 2.2)
  desenharIcone(doc, "saco", x0 + 4.6, ry + (HERO_H - 6.4) / 2, 6.4, COR.branco, 1.6)
  texto(doc, "TOTAL LÍQUIDO", x0 + 13.4, ry + 6.2, { peso: "semibold", tamanho: 6.6, cor: COR.branco, tracking: 0.14 })
  texto(doc, "bruto menos comissões", x0 + 13.4, ry + 10.6, { tamanho: 6.4, cor: COR.tealTexto })
  const valor = brl(t.totalLiquido)
  const opc: OpcoesTexto = { peso: "bold", cor: COR.branco, tracking: -0.01 }
  const tamanho = tamanhoQueCabe(doc, valor, { ...opc, tamanho: 15 }, w - 54)
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
  desenharIcone(doc, "moedasMao", M + 4.6, fy + (h - 5.4) / 2, 5.4, COR.ouroTexto, 1.7)
  texto(doc, "LÍQUIDO FINAL APÓS COMISSÃO", M + 12.4, fy + 8, {
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

  const lay = montarLayout(d.totais.totalDescontoHospede > 0)
  const novaPagina = (): number => {
    doc.addPage()
    desenharCabecalhoContinuacao(doc, periodo)
    return CONT_TOP
  }

  // Página 1: capa + resumo, depois o detalhamento em cartões
  let y = desenharCapa(doc, d, periodo, d.emitidoEm ?? new Date())
  y = desenharSecaoDetalhe(doc, y, d.linhas.length, d.totais.totalLiquido) + 4.6
  desenharCabecalhoTabela(doc, lay, y)
  y += HEAD_H + 2.4

  for (const l of d.linhas) {
    // +0,6 = a "sombra" do cartão também não pode passar da margem
    if (y + CARD_H + 0.6 > BOTTOM) {
      y = novaPagina()
      desenharCabecalhoTabela(doc, lay, y)
      y += HEAD_H + 2.4
    }
    desenharCartao(doc, lay, l, y)
    y += PITCH
  }

  // Totais consolidados (nunca partidos entre duas páginas). O `y` já vem com o
  // espaço entre cartões somado depois do último.
  y += 8
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
