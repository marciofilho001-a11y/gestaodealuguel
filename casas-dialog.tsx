import * as React from "react"
import { Home, Pencil, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { useConfirm } from "@/hooks/use-confirm"
import { corDaCasa } from "@/lib/colors"
import type { Casa, Reserva } from "@/types"

interface CasasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  casas: Casa[]
  reservas: Reserva[]
  onCriar: (nome: string, endereco: string) => Promise<Casa | null>
  onAtualizar: (id: number, nome: string, endereco: string) => Promise<boolean>
  onDeletar: (id: number) => Promise<boolean>
}

export function CasasDialog({ open, onOpenChange, casas, reservas, onCriar, onAtualizar, onDeletar }: CasasDialogProps) {
  const confirm = useConfirm()
  const [editId, setEditId] = React.useState<number | null>(null)
  const [nome, setNome] = React.useState("")
  const [endereco, setEndereco] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  function cancelarEdicao() {
    setEditId(null)
    setNome("")
    setEndereco("")
  }

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só limpa o formulário local ao fechar
    if (!open) cancelarEdicao()
  }, [open])

  function iniciarEdicao(casa: Casa) {
    setEditId(casa.id)
    setNome(casa.nome)
    setEndereco(casa.endereco || "")
  }

  async function handleSalvar() {
    if (!nome.trim()) return
    setSaving(true)
    if (editId) {
      await onAtualizar(editId, nome.trim(), endereco.trim())
    } else {
      await onCriar(nome.trim(), endereco.trim())
    }
    setSaving(false)
    cancelarEdicao()
  }

  async function handleExcluir(casa: Casa) {
    const qtd = reservas.filter((r) => r.casa_id === casa.id).length
    const ok = await confirm({
      title: `Excluir "${casa.nome}"?`,
      description: qtd
        ? `Isso vai apagar TAMBÉM as ${qtd} reserva(s) cadastradas nela. Essa ação não pode ser desfeita.`
        : "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      destructive: true,
    })
    if (ok) onDeletar(casa.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="size-4.5 text-primary" /> Gerenciar Casas
          </DialogTitle>
          <DialogDescription className="sr-only">Adicione, edite ou remova casas do seu portfólio.</DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {casas.length === 0 ? (
            <Empty className="py-6">
              <EmptyMedia variant="icon">
                <Home />
              </EmptyMedia>
              <EmptyTitle className="text-sm">Nenhuma casa cadastrada</EmptyTitle>
              <EmptyDescription>Adicione a primeira casa no formulário abaixo.</EmptyDescription>
            </Empty>
          ) : (
            <ItemGroup className="gap-2!">
              {casas.map((c) => {
                const qtd = reservas.filter((r) => r.casa_id === c.id).length
                const cor = corDaCasa(casas, c.id)
                return (
                  <Item key={c.id} variant="outline" size="sm">
                    <ItemMedia variant="icon">
                      <span
                        className="flex size-8 items-center justify-center rounded-md text-white"
                        style={{ backgroundColor: cor }}
                      >
                        <Home className="size-4" />
                      </span>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{c.nome}</ItemTitle>
                      <ItemDescription>
                        {c.endereco ? `${c.endereco} · ` : ""}
                        {qtd} reserva(s) cadastrada(s)
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => iniciarEdicao(c)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleExcluir(c)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </ItemActions>
                  </Item>
                )
              })}
            </ItemGroup>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-[13px] font-semibold">{editId ? `✎ Editando: ${nome}` : "+ Nova Casa"}</h4>
            {editId && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={cancelarEdicao}>
                <X className="size-3" /> Cancelar edição
              </Button>
            )}
          </div>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="casa-nome-input">Nome da casa</FieldLabel>
              <Input
                id="casa-nome-input"
                placeholder="Ex: Casa da Praia"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="casa-endereco-input">Endereço (opcional)</FieldLabel>
              <Input
                id="casa-endereco-input"
                placeholder="Ex: Rua das Gaivotas, 123"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSalvar} disabled={!nome.trim() || saving}>
            {editId ? "Salvar Alterações" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
