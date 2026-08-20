import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const root = path.resolve(__dirname, ".")

// O conteúdo de src foi enviado pelo GitHub Web como arquivos na raiz.
// Estes aliases removem apenas o prefixo lógico da pasta original, mantendo
// os imports existentes (@/components/..., @/pages/..., etc.) sem alterar a UI.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@\/types$/, replacement: path.join(root, "index.ts") },
      { find: /^@\/(?:components\/ui|components|pages|hooks|lib|assets)\//, replacement: `${root}/` },
      { find: /^@\//, replacement: `${root}/` },
    ],
  },
})
