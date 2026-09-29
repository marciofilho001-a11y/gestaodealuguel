// Ícones do Relatório Financeiro em PDF — desenhados como VETOR (traço), não como imagem,
// então ficam nítidos em qualquer zoom e não pesam nada no arquivo.
//
// Os formatos vêm do Lucide (https://lucide.dev, licença ISC), a mesma família de
// ícones que o resto do app já usa. Só o "saco" (dinheiro) e a "pilha" (moedas) foram
// desenhados à mão, na mesma grade de 24x24 e com a mesma espessura de traço,
// porque o Lucide não tem esses dois.
//
// Este arquivo é GERADO por um script a partir dos ícones instalados — se precisar
// de mais um ícone, prefira gerar de novo a editar os números na mão.
//
// Formato de cada forma:
//   ["p", "M0 0…"]              caminho SVG
//   ["c", cx, cy, r]             círculo
//   ["e", cx, cy, rx, ry]        elipse
//   ["r", x, y, w, h, rx]        retângulo (rx = raio do canto)
//   ["l", x1, y1, x2, y2]        linha
//   ["pl", "x,y x,y …"]          linha quebrada

export type Forma =
  | readonly ["p", string]
  | readonly ["c", number, number, number]
  | readonly ["e", number, number, number, number]
  | readonly ["r", number, number, number, number, number]
  | readonly ["l", number, number, number, number]
  | readonly ["pl", string]

export const ICONES = {
  calendario: [
    ["p","M8 2v4"],
    ["p","M16 2v4"],
    ["r",3,4,18,18,2],
    ["p","M3 10h18"],
    ["p","M8 14h.01"],
    ["p","M12 14h.01"],
    ["p","M16 14h.01"],
    ["p","M8 18h.01"],
    ["p","M12 18h.01"],
    ["p","M16 18h.01"],
  ],
  calendarioSimples: [
    ["p","M8 2v4"],
    ["p","M16 2v4"],
    ["r",3,4,18,18,2],
    ["p","M3 10h18"],
  ],
  pino: [
    ["p","M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"],
    ["c",12,10,3],
  ],
  brilho: [
    ["p","M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"],
    ["p","M20 2v4"],
    ["p","M22 4h-4"],
    ["c",4,20,2],
  ],
  percentual: [
    ["l",19,5,5,19],
    ["c",6.5,6.5,2.5],
    ["c",17.5,17.5,2.5],
  ],
  recibo: [
    ["p","M12 17V7"],
    ["p","M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"],
    ["p","M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"],
  ],
  moedasMao: [
    ["p","M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"],
    ["p","m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"],
    ["p","m2 16 6 6"],
    ["c",16,9,2.9],
    ["c",6,5,3],
  ],
  casa: [
    ["p","M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"],
    ["p","M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  ],
  seta: [
    ["p","m9 18 6-6-6-6"],
  ],
  etiqueta: [
    ["p","M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"],
    ["c",7.5,7.5,0.5],
  ],
  lua: [
    ["p","M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"],
  ],
  saco: [
    ["p","M9.5 6 8.1 3.4A.9.9 0 0 1 8.9 2h6.2a.9.9 0 0 1 .8 1.4L14.5 6"],
    ["p","M9.5 6h5"],
    ["p","M9.5 6C6 8.4 3.5 11.7 3.5 15.3c0 4 3.5 6.2 8.5 6.2s8.5-2.2 8.5-6.2c0-3.6-2.5-6.9-6-9.3"],
    ["p","M13.9 13.3c-.3-.8-1.1-1.3-2-1.3-1.2 0-2 .6-2 1.6 0 2.1 4.1 1.1 4.1 3.2 0 1-.9 1.6-2.2 1.6-1 0-1.8-.5-2.1-1.3"],
    ["p","M11.9 10.3V12M11.9 17.4v1.6"],
  ],
  pilha: [
    ["e",12,6.5,8,3],
    ["p","M4 6.5v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5"],
    ["p","M4 11.5v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5"],
  ],
} as const satisfies Record<string, readonly Forma[]>

export type NomeIcone = keyof typeof ICONES
