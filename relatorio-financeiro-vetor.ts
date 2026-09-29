// Desenha os ícones de `relatorio-financeiro-icones.ts` dentro do PDF, como
// vetor (linhas e curvas), usando só o que o jsPDF já oferece.
//
// O jsPDF não entende "caminhos SVG" (aquelas strings tipo "M8 2v4a2 2 0 0 1…")
// sozinho. Então aqui há um leitor pequeno que converte cada comando do
// caminho em retas e curvas de Bézier, que o jsPDF sabe traçar. Os arcos do
// SVG (comando "A") viram até 4 curvas cada.
//
// Tudo em milímetros. Cada ícone nasce numa grade de 24 x 24 e é escalado
// para o `tamanho` pedido.

import type { jsPDF } from "jspdf"

import { ICONES, type Forma, type NomeIcone } from "@/lib/relatorio-financeiro-icones"

type RGB = [number, number, number]
type Ponto = [number, number]
type Curva = [number, number, number, number, number, number] // c1x c1y c2x c2y x y

/** Segmentos já prontos e em coordenadas absolutas da grade 24 x 24. */
type Segmento =
  | { t: "M"; p: Ponto }
  | { t: "L"; p: Ponto }
  | { t: "C"; c: Curva }
  | { t: "Z" }

const KAPPA = 0.5522847498 // constante clássica: círculo com 4 curvas de Bézier

// ---------------------------------------------------------------------------
// Arco SVG -> curvas de Bézier (algoritmo padrão do apêndice do SVG)
// ---------------------------------------------------------------------------

function arcoParaCurvas(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  rotacaoGraus: number,
  arcoGrande: number,
  sentidoHorario: number,
  x2: number,
  y2: number,
): Curva[] {
  let rx = Math.abs(rxIn)
  let ry = Math.abs(ryIn)
  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) return [[x1, y1, x2, y2, x2, y2]]

  const phi = (rotacaoGraus * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const x1p = cos * dx + sin * dy
  const y1p = -sin * dx + cos * dy

  // Se o raio pedido é pequeno demais pra ligar os dois pontos, o SVG manda aumentar
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    rx *= s
    ry *= s
  }

  const numerador = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
  const denominador = rx * rx * y1p * y1p + ry * ry * x1p * x1p
  let coef = Math.sqrt(Math.max(0, numerador / denominador))
  if (arcoGrande === sentidoHorario) coef = -coef
  const cxp = (coef * rx * y1p) / ry
  const cyp = (-coef * ry * x1p) / rx
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2

  const ux = (x1p - cxp) / rx
  const uy = (y1p - cyp) / ry
  const vx = (-x1p - cxp) / rx
  const vy = (-y1p - cyp) / ry
  const inicio = Math.atan2(uy, ux)
  let varredura = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  if (!sentidoHorario && varredura > 0) varredura -= 2 * Math.PI
  else if (sentidoHorario && varredura < 0) varredura += 2 * Math.PI

  const n = Math.max(1, Math.ceil(Math.abs(varredura) / (Math.PI / 2) - 1e-9))
  const passo = varredura / n
  const t = (4 / 3) * Math.tan(passo / 4)
  const mapa = (px: number, py: number): Ponto => [
    cos * rx * px - sin * ry * py + cx,
    sin * rx * px + cos * ry * py + cy,
  ]

  const curvas: Curva[] = []
  let a = inicio
  for (let i = 0; i < n; i++) {
    const b = a + passo
    const c1 = mapa(Math.cos(a) - t * Math.sin(a), Math.sin(a) + t * Math.cos(a))
    const c2 = mapa(Math.cos(b) + t * Math.sin(b), Math.sin(b) - t * Math.cos(b))
    const fim = mapa(Math.cos(b), Math.sin(b))
    curvas.push([c1[0], c1[1], c2[0], c2[1], fim[0], fim[1]])
    a = b
  }
  return curvas
}

// ---------------------------------------------------------------------------
// Leitor de caminho SVG ("M8 2v4a2 2 0 0 1…")
// ---------------------------------------------------------------------------

const NUMERO = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/

function lerCaminho(d: string): Segmento[] {
  const segs: Segmento[] = []
  let i = 0
  let x = 0
  let y = 0
  let inicioX = 0
  let inicioY = 0
  let ctrlX = 0 // último ponto de controle (pros comandos S e T)
  let ctrlY = 0
  let comandoAnterior = ""

  const pula = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++
  }
  const numero = (): number => {
    pula()
    const m = NUMERO.exec(d.slice(i))
    if (!m) throw new Error(`Caminho SVG inválido perto de "${d.slice(i, i + 12)}"`)
    i += m[0].length
    return parseFloat(m[0])
  }
  // Nos arcos, os dois "flags" são um único caractere 0 ou 1 e podem vir
  // grudados no número seguinte ("a1 1 0 011-1") — por isso leitura à parte.
  const flag = (): number => {
    pula()
    return d[i++] === "1" ? 1 : 0
  }

  while (true) {
    pula()
    if (i >= d.length) break
    let cmd = d[i]
    if (/[A-Za-z]/.test(cmd)) i++
    else if (comandoAnterior && !/[Zz]/.test(comandoAnterior))
      cmd = comandoAnterior === "M" ? "L" : comandoAnterior === "m" ? "l" : comandoAnterior
    else throw new Error(`Caminho SVG inválido perto de "${d.slice(i, i + 12)}"`)

    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    const ox = rel ? x : 0
    const oy = rel ? y : 0

    switch (C) {
      case "M": {
        x = ox + numero()
        y = oy + numero()
        inicioX = x
        inicioY = y
        segs.push({ t: "M", p: [x, y] })
        ctrlX = x
        ctrlY = y
        break
      }
      case "L": {
        x = ox + numero()
        y = oy + numero()
        segs.push({ t: "L", p: [x, y] })
        ctrlX = x
        ctrlY = y
        break
      }
      case "H": {
        x = ox + numero()
        segs.push({ t: "L", p: [x, y] })
        ctrlX = x
        ctrlY = y
        break
      }
      case "V": {
        y = oy + numero()
        segs.push({ t: "L", p: [x, y] })
        ctrlX = x
        ctrlY = y
        break
      }
      case "C": {
        const c1x = ox + numero()
        const c1y = oy + numero()
        const c2x = ox + numero()
        const c2y = oy + numero()
        x = ox + numero()
        y = oy + numero()
        segs.push({ t: "C", c: [c1x, c1y, c2x, c2y, x, y] })
        ctrlX = c2x
        ctrlY = c2y
        break
      }
      case "S": {
        // Primeiro controle = reflexo do último controle (se o comando anterior foi curva)
        const anteriorEhCurva = /[CcSs]/.test(comandoAnterior)
        const c1x = anteriorEhCurva ? 2 * x - ctrlX : x
        const c1y = anteriorEhCurva ? 2 * y - ctrlY : y
        const c2x = ox + numero()
        const c2y = oy + numero()
        x = ox + numero()
        y = oy + numero()
        segs.push({ t: "C", c: [c1x, c1y, c2x, c2y, x, y] })
        ctrlX = c2x
        ctrlY = c2y
        break
      }
      case "Q": {
        const qx = ox + numero()
        const qy = oy + numero()
        const nx = ox + numero()
        const ny = oy + numero()
        // Curva quadrática -> cúbica equivalente
        segs.push({
          t: "C",
          c: [x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), nx + (2 / 3) * (qx - nx), ny + (2 / 3) * (qy - ny), nx, ny],
        })
        x = nx
        y = ny
        ctrlX = qx
        ctrlY = qy
        break
      }
      case "T": {
        const anteriorEhQuad = /[QqTt]/.test(comandoAnterior)
        const qx = anteriorEhQuad ? 2 * x - ctrlX : x
        const qy = anteriorEhQuad ? 2 * y - ctrlY : y
        const nx = ox + numero()
        const ny = oy + numero()
        segs.push({
          t: "C",
          c: [x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), nx + (2 / 3) * (qx - nx), ny + (2 / 3) * (qy - ny), nx, ny],
        })
        x = nx
        y = ny
        ctrlX = qx
        ctrlY = qy
        break
      }
      case "A": {
        const rx = numero()
        const ry = numero()
        const rot = numero()
        const grande = flag()
        const horario = flag()
        const nx = ox + numero()
        const ny = oy + numero()
        for (const c of arcoParaCurvas(x, y, rx, ry, rot, grande, horario, nx, ny)) segs.push({ t: "C", c })
        x = nx
        y = ny
        ctrlX = x
        ctrlY = y
        break
      }
      case "Z": {
        segs.push({ t: "Z" })
        x = inicioX
        y = inicioY
        ctrlX = x
        ctrlY = y
        break
      }
      default:
        throw new Error(`Comando SVG não suportado: ${cmd}`)
    }
    // Lembra o comando: se vierem mais números sem letra, o laço repete este mesmo comando.
    comandoAnterior = cmd
  }
  return segs
}

// ---------------------------------------------------------------------------
// Formas simples -> segmentos
// ---------------------------------------------------------------------------

function elipse(cx: number, cy: number, rx: number, ry: number): Segmento[] {
  const kx = rx * KAPPA
  const ky = ry * KAPPA
  return [
    { t: "M", p: [cx + rx, cy] },
    { t: "C", c: [cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry] },
    { t: "C", c: [cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy] },
    { t: "C", c: [cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry] },
    { t: "C", c: [cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy] },
    { t: "Z" },
  ]
}

function retangulo(x: number, y: number, w: number, h: number, raio: number): Segmento[] {
  const r = Math.min(raio, w / 2, h / 2)
  if (r <= 0) {
    return [
      { t: "M", p: [x, y] },
      { t: "L", p: [x + w, y] },
      { t: "L", p: [x + w, y + h] },
      { t: "L", p: [x, y + h] },
      { t: "Z" },
    ]
  }
  const k = r * KAPPA
  return [
    { t: "M", p: [x + r, y] },
    { t: "L", p: [x + w - r, y] },
    { t: "C", c: [x + w - r + k, y, x + w, y + r - k, x + w, y + r] },
    { t: "L", p: [x + w, y + h - r] },
    { t: "C", c: [x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h] },
    { t: "L", p: [x + r, y + h] },
    { t: "C", c: [x + r - k, y + h, x, y + h - r + k, x, y + h - r] },
    { t: "L", p: [x, y + r] },
    { t: "C", c: [x, y + r - k, x + r - k, y, x + r, y] },
    { t: "Z" },
  ]
}

function pontos(s: string): Ponto[] {
  const n = s.trim().split(/[\s,]+/).map(Number)
  const out: Ponto[] = []
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]])
  return out
}

function segmentosDaForma(f: Forma): Segmento[] {
  switch (f[0]) {
    case "p":
      return lerCaminho(f[1])
    case "c":
      return elipse(f[1], f[2], f[3], f[3])
    case "e":
      return elipse(f[1], f[2], f[3], f[4])
    case "r":
      return retangulo(f[1], f[2], f[3], f[4], f[5])
    case "l":
      return [
        { t: "M", p: [f[1], f[2]] },
        { t: "L", p: [f[3], f[4]] },
      ]
    case "pl": {
      const [primeiro, ...resto] = pontos(f[1])
      return primeiro
        ? [{ t: "M", p: primeiro }, ...resto.map((p): Segmento => ({ t: "L", p }))]
        : []
    }
  }
}

// Ícones são poucos e usados dezenas de vezes: lê cada um só uma vez.
const cache = new Map<NomeIcone, Segmento[][]>()

function segmentosDoIcone(nome: NomeIcone): Segmento[][] {
  let s = cache.get(nome)
  if (!s) {
    s = (ICONES[nome] as readonly Forma[]).map(segmentosDaForma)
    cache.set(nome, s)
  }
  return s
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Desenha o ícone com o canto superior esquerdo em (x, y), ocupando
 * `tamanho` x `tamanho` mm. `espessura` está nas unidades da grade 24 x 24
 * (2 = traço padrão do Lucide; 1,6–1,8 fica mais leve e elegante no papel).
 */
export function desenharIcone(
  doc: jsPDF,
  nome: NomeIcone,
  x: number,
  y: number,
  tamanho: number,
  cor: RGB,
  espessura = 1.7,
) {
  const k = tamanho / 24
  const X = (v: number) => x + v * k
  const Y = (v: number) => y + v * k

  doc.setDrawColor(...cor)
  doc.setLineWidth(espessura * k)
  doc.setLineCap("round")
  doc.setLineJoin("round")

  for (const forma of segmentosDoIcone(nome)) {
    for (const s of forma) {
      if (s.t === "M") doc.moveTo(X(s.p[0]), Y(s.p[1]))
      else if (s.t === "L") doc.lineTo(X(s.p[0]), Y(s.p[1]))
      else if (s.t === "C") doc.curveTo(X(s.c[0]), Y(s.c[1]), X(s.c[2]), Y(s.c[3]), X(s.c[4]), Y(s.c[5]))
      else doc.close()
    }
    doc.stroke()
  }

  // Devolve o padrão: as réguas do resto do documento usam ponta reta.
  doc.setLineCap("butt")
  doc.setLineJoin("miter")
}
