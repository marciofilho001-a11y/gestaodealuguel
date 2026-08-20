import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerFieldProps {
  id: string
  label: string
  value: string // "" | "YYYY-MM-DD"
  onChange: (iso: string) => void
  className?: string
}

// Substitui o <input type="date"> nativo do app original por um date picker
// Popover + Calendar do shadcn — mesmo dado (string ISO "YYYY-MM-DD"), UI
// mais rica.
export function DatePickerField({ id, label, value, onChange, className }: DatePickerFieldProps) {
  const date = value ? new Date(value + "T00:00:00") : undefined

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-mono font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon data-icon="inline-start" />
            {date ? format(date, "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : "Selecionar data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={date}
            onSelect={(d) => d && onChange(d.toISOString().slice(0, 10))}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}
