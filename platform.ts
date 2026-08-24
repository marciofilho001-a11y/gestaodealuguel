// Estilos compartilhados por plataforma — usados no calendário, na tabela de
// reservas e nos popovers, pra manter a mesma linguagem visual em todo o app.

export const PLATFORM_BAR: Record<string, string> = {
  Airbnb: "bg-airbnb",
  Booking: "bg-booking",
  Outro: "bg-emerald-500",
}

export const PLATFORM_BADGE: Record<string, string> = {
  Airbnb: "bg-airbnb-soft text-airbnb border-transparent",
  Booking: "bg-booking-soft text-booking border-transparent",
  // "Outro" cobre reservas fechadas direto com o hóspede (sem Airbnb/Booking
  // no meio) — verde esmeralda #10B981 pra diferenciar das duas plataformas
  // (antes era cinza neutro, mesma cor de "sem plataforma nenhuma").
  Outro: "bg-emerald-50 text-emerald-700 border-transparent dark:bg-emerald-950/40 dark:text-emerald-400",
}

export const STATUS_LABEL: Record<string, string> = {
  confirmada: "Confirmada",
  aguardando_pagamento: "Aguard. Pagto",
  cancelada: "Cancelada",
}

export const STATUS_BADGE: Record<string, string> = {
  confirmada: "bg-accent text-accent-foreground border-transparent",
  aguardando_pagamento: "bg-gold-soft text-gold-foreground border-transparent",
  cancelada: "bg-destructive/10 text-destructive border-transparent",
}

// Mesmas cores de --airbnb/--booking do index.css, em hex — usadas onde é
// preciso um valor de cor de verdade (ex: background inline de um Avatar),
// não uma classe Tailwind.
export const PLATFORM_COLOR: Record<string, string> = {
  Airbnb: "#FF385C",
  Booking: "#003580",
  Outro: "#10B981",
}
