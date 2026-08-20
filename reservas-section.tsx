import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { GuestAvatar } from "@/components/guest-avatar"
import { PlatformIcon } from "@/components/platform-icon"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useConfirm } from "@/hooks/use-confirm"
import { formatBRL, formatDate, isoHoje } from "@/lib/format"
import { PLATFORM_BADGE, STATUS_BADGE, STATUS_LABEL } from "@/lib/platform"
import { cn } from "@/lib/utils"
import type { Casa, Reserva, StatusReserva } from "@/types"

interface ReservasSectionProps {
  casas: Casa[]
  reservasCasaTotal: Reserva[]
  modoTodasCasas: boolean
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: StatusReserva) => void
}

const noneValue = "__todos__"

export function ReservasSection({
  casas,
  reservasCasaTotal,
  modoTodasCasas,
  onEdit,
  onDelete,
  onStatusChange,
}: ReservasSectionProps) {
  const confirm = useConfirm()
  const [filtroPlataforma, setFiltroPlataforma] = React.useState(noneValue)
  const [filtroStatus, setFiltroStatus] = React.useState(noneValue)
  const [filtroDataDe, setFiltroDataDe] = React.useState("")
  const [filtroDataAte, setFiltroDataAte] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "checkin", desc: true }])

  const filtrosAtivos = filtroPlataforma !== noneValue || filtroStatus !== noneValue || filtroDataDe || filtroDataAte

  const reservasFiltradas = React.useMemo(() => {
    let lista = reservasCasaTotal
    if (filtroPlataforma !== noneValue) lista = lista.filter((r) => r.plataforma === filtroPlataforma)
    if (filtroStatus !== noneValue) lista = lista.filter((r) => (r.status || "confirmada") === filtroStatus)
    if (filtroDataDe) lista = lista.filter((r) => r.checkout >= filtroDataDe)
    if (filtroDataAte) lista = lista.filter((r) => r.checkin <= filtroDataAte)
    return lista
  }, [reservasCasaTotal, filtroPlataforma, filtroStatus, filtroDataDe, filtroDataAte])

  function limparFiltros() {
    setFiltroPlataforma(noneValue)
    setFiltroStatus(noneValue)
    setFiltroDataDe("")
    setFiltroDataAte("")
  }

  async function handleDelete(reserva: Reserva) {
    const ok = await confirm({
      title: "Excluir esta reserva?",
      description: `${reserva.hospede || "Reserva sem nome"} · ${formatDate(reserva.checkin)} – ${formatDate(reserva.checkout)}`,
      confirmLabel: "Excluir",
      destructive: true,
    })
    if (ok) onDelete(reserva.id)
  }

  const hojeStr = isoHoje()

  const columns = React.useMemo<ColumnDef<Reserva>[]>(() => {
    const base: ColumnDef<Reserva>[] = []

    if (modoTodasCasas) {
      base.push({
        id: "casa",
        header: "Casa",
        accessorFn: (r) => casas.find((c) => c.id === r.casa_id)?.nome || "",
        cell: ({ getValue }) => <span className="text-xs font-medium">{getValue<string>() || "(removida)"}</span>,
      })
    }

    base.push(
      {
        accessorKey: "plataforma",
        header: "Plataf.",
        cell: ({ getValue }) => {
          const p = getValue<string>()
          return (
            <Badge variant="outline" className={cn("gap-1.5 font-normal", PLATFORM_BADGE[p] || PLATFORM_BADGE.Outro)}>
              <PlatformIcon plataforma={p} size="sm" />
              {p}
            </Badge>
          )
        },
      },
      {
        accessorKey: "hospede",
        header: "Hóspede",
        cell: ({ row }) => {
          const r = row.original
          const texto = r.hospede || (r.origem === "ical" ? "⚠ completar dados" : "—")
          return (
            <div className="flex items-center gap-2">
              <GuestAvatar nome={r.hospede || "?"} casas={casas} casaId={r.casa_id} />
              <span className="truncate">{texto}</span>
              {r.origem === "ical" && (
                <Badge variant="outline" className="shrink-0 border-transparent bg-secondary text-[10px] text-secondary-foreground">
                  iCal
                </Badge>
              )}
              {r.checkin === hojeStr && (
                <Badge className="shrink-0 border-transparent bg-primary text-[10px]">Check-in hoje</Badge>
              )}
              {r.checkout === hojeStr && (
                <Badge variant="outline" className="shrink-0 border-transparent bg-gold-soft text-[10px] text-gold-foreground">
                  Check-out hoje
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "checkin",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-mono"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Check-in <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ getValue }) => <span className="font-mono text-xs">{formatDate(getValue<string>())}</span>,
      },
      {
        accessorKey: "checkout",
        header: "Check-out",
        cell: ({ getValue }) => <span className="font-mono text-xs">{formatDate(getValue<string>())}</span>,
      },
      {
        id: "noites",
        header: () => <div className="text-right">Noites</div>,
        accessorFn: (r) => Math.round((new Date(r.checkout).getTime() - new Date(r.checkin).getTime()) / 86400000),
        cell: ({ getValue }) => (
          <div className="text-right font-mono text-xs tabular-nums">{getValue<number>()}</div>
        ),
      },
      {
        accessorKey: "valor_diaria",
        header: () => <div className="text-right">Diária</div>,
        cell: ({ getValue }) => (
          <div className="text-right font-mono text-xs tabular-nums">{formatBRL(getValue<number>())}</div>
        ),
      },
      {
        accessorKey: "valor_total",
        header: () => <div className="text-right">Total</div>,
        cell: ({ getValue }) => (
          <div className="text-right font-mono text-xs font-semibold tabular-nums">{formatBRL(getValue<number>())}</div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const r = row.original
          const atual = (r.status as StatusReserva) || "confirmada"
          return (
            <Select value={atual} onValueChange={(v) => onStatusChange(r.id, v as StatusReserva)}>
              <SelectTrigger
                size="sm"
                className={cn("h-7 border-transparent text-[11px] font-semibold", STATUS_BADGE[atual])}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        },
      },
      {
        id: "acoes",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(row.original.id)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => handleDelete(row.original)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      }
    )

    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoTodasCasas, casas, hojeStr, onEdit, onStatusChange])

  const table = useReactTable({
    data: reservasFiltradas,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <Field className="w-36">
          <FieldLabel className="text-[11px]">Plataforma</FieldLabel>
          <Select value={filtroPlataforma} onValueChange={setFiltroPlataforma}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={noneValue}>Todas</SelectItem>
              <SelectItem value="Airbnb">Airbnb</SelectItem>
              <SelectItem value="Booking">Booking</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-36">
          <FieldLabel className="text-[11px]">De</FieldLabel>
          <input
            type="date"
            value={filtroDataDe}
            onChange={(e) => setFiltroDataDe(e.target.value)}
            className="border-input bg-background flex h-8 w-full rounded-md border px-2.5 font-mono text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </Field>
        <Field className="w-36">
          <FieldLabel className="text-[11px]">Até</FieldLabel>
          <input
            type="date"
            value={filtroDataAte}
            onChange={(e) => setFiltroDataAte(e.target.value)}
            className="border-input bg-background flex h-8 w-full rounded-md border px-2.5 font-mono text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </Field>
        <Field className="w-40">
          <FieldLabel className="text-[11px]">Status</FieldLabel>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={noneValue}>Todos</SelectItem>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button variant="outline" size="sm" onClick={limparFiltros} disabled={!filtrosAtivos}>
          Limpar filtros
        </Button>
        <span className="ml-auto self-center text-xs text-muted-foreground">
          {filtrosAtivos
            ? `${reservasFiltradas.length} de ${reservasCasaTotal.length} reserva(s)`
            : `${reservasCasaTotal.length} reserva(s) no total`}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32">
                  <Empty>
                    <EmptyMedia variant="icon">
                      <Pencil />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm">
                      {reservasCasaTotal.length ? "Nenhuma reserva encontrada" : "Nenhuma reserva cadastrada"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {reservasCasaTotal.length
                        ? "Ajuste ou limpe os filtros acima."
                        : "Adicione a primeira reserva no formulário acima."}
                    </EmptyDescription>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
