# Gestão de Aluguel

Dashboard de gestão de aluguel por temporada (casas, reservas, calendário,
ganhos). Reescrito de um `index.html` único (HTML/JS puro) para React +
Vite + Tailwind v4 + shadcn/ui.

## Stack

- React 19 + Vite + TypeScript
- Tailwind v4 (CSS-first, tokens em `src/index.css` via `@theme`)
- shadcn/ui (style "nova", base radix) — componentes em `src/components/ui/`
- Supabase (`@supabase/supabase-js`) — banco de dados
- Tesseract.js — OCR de prints de reserva
- Recharts (via shadcn Chart) — gráficos
- @tanstack/react-table — tabela de reservas

## Banco de dados

Supabase, projeto `xozrxppvroqiverzonmy` (mesmo projeto de outros apps do
dono, tem tabelas não relacionadas — `aluguel_*` é o namespace deste app).
Credenciais (URL + anon key) em `src/lib/supabase.ts`. RLS habilitado em
todas as tabelas `aluguel_*`: `aluguel_casas`, `aluguel_reservas`,
`aluguel_ical_links` (legado, feature removida), `aluguel_config` (nova —
guarda a % da Comissão Marcio Filho, linha única com id=1).

`aluguel_reservas.comissao_marcio` guarda o valor em R$ — mas hoje é um campo
**editável com sugestão**, não mais 100% automático. Ver seção abaixo.

## Formulário de reserva — pontos que já mudaram, não reverter sem confirmar

- **Não existe mais input de "Valor diária".** O usuário digita **"Valor do
  aluguel" (total da estadia)**; `valor_diaria` continua existindo na coluna
  do banco, mas agora é a MÉDIA calculada (`valor_aluguel / noites`), nunca
  um input direto.
- **"Comissão plataforma" não aparece mais no formulário** (nem em criar nem
  em editar) — some da UI, mas a coluna do banco continua existindo. Novas
  reservas salvam `comissao_plataforma: 0`; ao editar uma reserva antiga que
  já tinha valor ali, esse valor é preservado (só não fica editável).
- **"Comissão Marcio Filho" agora é editável**, não mais somente-leitura. O
  valor calculado a partir de `comissao_marcio_percentual` aparece como
  sugestão inicial (recalcula sozinho enquanto o campo não for tocado); assim
  que o usuário digita por cima, para de recalcular. Tem um botão de reset
  (ícone ↺) pra voltar a seguir a sugestão.
- **"Nova Reserva" virou um Dialog** (`nova-reserva-dialog.tsx`), acionado por
  um botão no cabeçalho do dashboard — antes ficava sempre expandido na
  página, o que o dono achava poluído.
- **Alertas** agora também mostram reservas mais distantes (até 90 dias),
  como legenda narrativa ("Em dezembro, Casa X: reserva de Fulano..."), além
  dos alertas de check-in/checkout próximos. Todo item do painel é clicável e
  abre a edição da reserva.

## Estrutura

- `src/lib/` — lógica pura: `format.ts` (BRL/datas), `ocr.ts` (extração de
  dados de print via regex, tolerante a erro de OCR), `colors.ts` (paleta por
  casa), `platform.ts` (estilos e cores por plataforma)
- `src/hooks/use-aluguel-data.tsx` — hook central com todo o CRUD (casas,
  reservas) + config (comissão Marcio Filho) e toasts
- `src/hooks/use-confirm.tsx` — substitui `confirm()` nativo por AlertDialog
- `src/components/config-dialog.tsx` — configura a % da Comissão Marcio Filho
- `src/pages/dashboard-page.tsx` — rota `/` (calendário, resumo, reservas)
- `src/pages/ganhos-page.tsx` — rota `/ganhos` (página inteira, não é mais dialog)
- `src/components/` — um componente por feature (calendar-view, reserva-form,
  ganhos-dialog era dialog, hoje é `pages/ganhos-page.tsx`; casas-dialog,
  editar-reserva-dialog, reservas-section, command-menu, app-sidebar)
- Roteamento via `react-router-dom` (`BrowserRouter`), ver `App.tsx`

## ⚠️ Pontos de atenção

- **iCal foi removido** (não é mais usado) — sem dialog, sem sincronização,
  sem `api/ical.js`. Reservas antigas que ainatingiram vieram de lá ainda têm
  `origem: 'ical'` no banco e mostram um badge "iCal" na tabela — isso é só
  histórico, não reative a feature sem confirmar com o dono antes.
- `vercel.json` tem um rewrite pra SPA — necessário pra `/ganhos` funcionar
  em acesso direto/refresh na Vercel. Não remover.
- Paleta de cores é fixa em hex (não OKLCH) — foi escolhida a dedo pra bater
  com a identidade visual do site original. Não converter sem necessidade.
- `npm run lint` mostra avisos em arquivos `src/components/ui/*.tsx` — são do
  próprio template shadcn, não editar/preocupar.

## Comandos

- `npm run dev` — servidor local
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — eslint
- `npm run build` — build de produção (`tsc -b && vite build`)

## Deploy

```
npx vercel deploy --token SEU_TOKEN          # preview
npx vercel deploy --token SEU_TOKEN --prod   # produção (gestao-aluguel-sigma.vercel.app)
```

O dono do projeto é iniciante em programação — ao propor mudanças, explique
em termos simples e evite jargão sem explicação.
