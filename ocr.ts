import type { DadosExtraidosOCR } from "@/types"

// Extrai automaticamente dados de reserva a partir do texto reconhecido por
// OCR num print do Airbnb/Booking. Como OCR pode errar uma letra ou número
// ocasionalmente, o resultado sempre fica para o usuário conferir/ajustar
// antes de salvar — não salva nada sozinho sem essa revisão.
// Portado 1:1 do index.html original (mesmos regexes e tolerâncias a erro).

const MESES_PT: Record<string, string> = {
  jan: "01",
  fev: "02",
  mar: "03",
  abr: "04",
  mai: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  set: "09",
  out: "10",
  nov: "11",
  dez: "12",
}

export function parseValorBR(str: string | null | undefined): number {
  str = (str || "").replace(/[^\d.,]/g, "")
  if (!str) return 0
  const lastComma = str.lastIndexOf(",")
  const lastDot = str.lastIndexOf(".")
  const lastSep = Math.max(lastComma, lastDot)
  if (lastSep === -1) return parseFloat(str) || 0
  const digitsAfter = str.length - lastSep - 1
  if (digitsAfter === 2) {
    // separador decimal (ex: 250,00 ou 250.00)
    return parseFloat(str.slice(0, lastSep).replace(/[.,]/g, "") + "." + str.slice(lastSep + 1)) || 0
  }
  // separador de milhar, sem casas decimais (ex: 2.602 = dois mil seiscentos e dois)
  return parseFloat(str.replace(/[.,]/g, "")) || 0
}

export function parseDataPT(dia: string, mes: string, ano: string): string | null {
  const mm = MESES_PT[mes.toLowerCase().slice(0, 3)]
  if (!mm) return null
  return `${ano}-${mm}-${dia.padStart(2, "0")}`
}

// Extrai os campos do texto bruto do OCR — tolerante a erros comuns do
// Tesseract: "R$" virando "RS", "ç" virando "g", "ó" virando "é", etc.
export function extrairDadosPrint(texto: string): DadosExtraidosOCR {
  const resultado: DadosExtraidosOCR = {}
  // Janela entre mês e ano ampliada (25→45): nomes longos de 3-4 palavras
  // (ex: "Figueredo da Silva Fernando") podem ficar embaralhados bem no meio
  // da data pelo OCR, e uma janela curta demais perde a data inteira
  const dataPattern = "(\\d{1,2})\\s*de\\s*(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\\w*\\.?[\\s\\S]{0,45}?(\\d{4})"

  // Localiza a REGIÃO da data "Recebida" (pagamento, não é estadia) primeiro,
  // pra poder excluir essa região inteira depois — mais confiável que só
  // olhar alguns caracteres pra trás de cada data candidata, porque o OCR às
  // vezes intercala outro rótulo ("Comissão:", "Preço total"...) bem no meio,
  // empurrando a distância real além de qualquer janela fixa pequena
  let regiaoRecebida: { inicio: number; fim: number } | null = null
  const recebidaMatch = texto.match(new RegExp("Recebid[ao][\\s\\S]{0,80}?" + dataPattern, "i"))
  if (recebidaMatch && recebidaMatch.index !== undefined) {
    regiaoRecebida = { inicio: recebidaMatch.index, fim: recebidaMatch.index + recebidaMatch[0].length }
  }

  // Tenta achar Check-in/Check-out pelos rótulos explícitos primeiro — mais
  // confiável que só pegar "a primeira e a última data do texto", porque
  // alguns prints têm OUTRAS datas (ex: "Recebida em...", data de pagamento)
  // que não são check-in/check-out e bagunçariam esse método simples
  const checkinLabel = texto.match(new RegExp("Check-?in[\\s\\S]{0,70}?" + dataPattern, "i"))
  const checkoutLabel = texto.match(new RegExp("Check-?out[\\s\\S]{0,70}?" + dataPattern, "i"))
  if (checkinLabel) resultado.checkin = parseDataPT(checkinLabel[1], checkinLabel[2], checkinLabel[3]) ?? undefined
  if (checkoutLabel) resultado.checkout = parseDataPT(checkoutLabel[1], checkoutLabel[2], checkoutLabel[3]) ?? undefined

  // Se não achou pelos rótulos (print sem essas palavras, ex: só mostra o
  // intervalo de datas no topo), cai pro método antigo — pega todas as datas
  // do texto, mas pula qualquer uma que caia dentro da região "Recebida"
  // encontrada acima (por posição, não por distância estimada)
  if (!resultado.checkin || !resultado.checkout) {
    const dataRegex = new RegExp(dataPattern, "gi")
    const datas: string[] = []
    let m: RegExpExecArray | null
    while ((m = dataRegex.exec(texto)) !== null) {
      if (regiaoRecebida && m.index >= regiaoRecebida.inicio && m.index <= regiaoRecebida.fim) continue
      const iso = parseDataPT(m[1], m[2], m[3])
      if (iso) datas.push(iso)
    }
    const datasUnicas = [...new Set(datas)].sort()
    if (datasUnicas.length >= 2) {
      resultado.checkin = resultado.checkin || datasUnicas[0]
      resultado.checkout = resultado.checkout || datasUnicas[datasUnicas.length - 1]
    } else if (datasUnicas.length === 1) {
      resultado.checkin = resultado.checkin || datasUnicas[0]
    }
  }

  // Nome do hóspede: acha o rótulo, depois varre linha por linha procurando a
  // primeira que pareça um nome de verdade (2+ palavras capitalizadas,
  // nenhuma delas um termo genérico de tabela/rótulo) — em vez de pegar
  // cegamente o próximo texto, que o OCR às vezes embaralha com cabeçalho de
  // tabela
  const nomeLabelMatch = texto.match(/Nome do h[oóeé]spede/i)
  if (nomeLabelMatch && nomeLabelMatch.index !== undefined) {
    const depois = texto.slice(
      nomeLabelMatch.index + nomeLabelMatch[0].length,
      nomeLabelMatch.index + nomeLabelMatch[0].length + 250
    )
    const termosProibidos =
      /^(data|pre[çcg]o|subtotal|total|taxa|nome|do|h[oóeé]spede|check|in|out|qua|seg|ter|qui|sex|s[aá]b|dom|canal|idioma|c[oó]digo|di[aá]ria|estadia|ocupa[cç][aã]o|padr[aã]o|padrdo|domestic|reservada|maxima|m[aá]xima|h[oó]spedes|adultos|crian[cç]as|criangas|janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|por|de|da|do|das|dos|na|no|nas|nos|em|um|uma|para|com|e|duragio|dura[cç][aã]o|didria|di[aá]ria)$/i
    const linhas = depois
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    for (const linha of linhas) {
      const tokensBrutos = linha.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]{2,}$/.test(w))
      const tokens = tokensBrutos.filter((w) => !termosProibidos.test(w))
      if (tokens.length >= 2 && /^[A-ZÀ-Ý]/.test(tokens[0])) {
        resultado.hospede = tokens.slice(0, 3).join(" ")
        break
      }
    }
  }

  if (/booking\.com/i.test(texto)) resultado.plataforma = "Booking"
  else if (/airbnb/i.test(texto)) resultado.plataforma = "Airbnb"

  // Taxa de limpeza: mesmo problema de colunas pode separar "Taxa de" de
  // "limpeza" — procura os dois pedaços com folga generosa entre eles. Não
  // exige ordem estrita: o OCR às vezes coloca o valor NO MEIO do rótulo
  // quebrado ("Taxa de [valor aqui] limpeza"), então só confere se as duas
  // partes do rótulo aparecem por perto e pega o primeiro valor em R$ da
  // janela
  const taxaIdx = texto.search(/Taxa\s*de/i)
  if (taxaIdx !== -1) {
    const janela = texto.slice(taxaIdx, taxaIdx + 150)
    if (/limpeza/i.test(janela)) {
      const valorMatch = janela.match(/R[S$]\s*([\d.,]+)/)
      if (valorMatch) resultado.taxa_limpeza = parseValorBR(valorMatch[1])
    }
  }

  // Preço total: também sofre com o layout em colunas (às vezes vem "Preço
  // total [outro rótulo no meio] R$ X" em vez do valor logo em seguida) —
  // pega a ÚLTIMA ocorrência do rótulo (o total final geralmente aparece por
  // último no documento) e procura o valor numa janela generosa depois dele
  const totalOcorrencias = [...texto.matchAll(/pre[çcg]o total(?:\s+do\s+quarto)?/gi)]
  if (totalOcorrencias.length) {
    const ultima = totalOcorrencias[totalOcorrencias.length - 1]
    if (ultima.index !== undefined) {
      const janela = texto.slice(ultima.index, ultima.index + 100)
      const valorMatch = janela.match(/R[S$]\s*([\d.,]+)/)
      if (valorMatch) resultado.valor_total = parseValorBR(valorMatch[1])
    }
  }

  // Subtotal (soma das diárias ANTES da taxa de limpeza, já com qualquer
  // desconto por diária embutido) — é a fonte mais confiável pro valor da
  // diária, melhor que back-calcular (total - limpeza) / noites, porque essa
  // conta some se existir um desconto adicional separado somado por fora
  const subtotalMatch = texto.match(/Subtotal[\s\S]{0,60}?R[S$]\s*([\d.,]+)/i)
  if (subtotalMatch) resultado.subtotal = parseValorBR(subtotalMatch[1])

  // Detecta se as diárias variam noite a noite (ex: promoção com desconto
  // progressivo, feriado com preço mais alto etc.) — pega o valor em R$ de
  // cada linha de dia-a-dia da tabela ("03-04 ... R$ 672", "04-05 ... R$
  // 656"...)
  const linhasDiarias = [...texto.matchAll(/\d{1,2}\s*-\s*\d{1,2}[\s\S]{0,80}?R[S$]\s*([\d.,]+)/g)]
  if (linhasDiarias.length >= 2) {
    const valores = linhasDiarias.map((m) => parseValorBR(m[1]))
    const todasIguais = valores.every((v) => v === valores[0])
    if (!todasIguais) {
      resultado.diariasVariaveis = true
      resultado.diariaMin = Math.min(...valores)
      resultado.diariaMax = Math.max(...valores)
    }
  }

  // Desconto explícito (linha separada "Desconto", diferente do "-20%" que já
  // vem embutido no preço por diária) — se existir, é subtraído à parte
  const descontoMatch = texto.match(/Desconto[\s\S]{0,60}?R[S$]\s*([\d.,]+)/i)
  if (descontoMatch) resultado.desconto = parseValorBR(descontoMatch[1])

  // Comissão da plataforma — quanto o Booking/Airbnb retém pra si (diferente
  // de desconto, que é pro hóspede). É um parâmetro valioso pra saber a
  // receita líquida real, então rastreamos separado.
  const comissaoMatch = texto.match(/Comiss[aã]o[\s\S]{0,60}?R[S$]\s*([\d.,]+)/i)
  if (comissaoMatch) resultado.comissao_plataforma = parseValorBR(comissaoMatch[1])

  return resultado
}
