import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: number | string
  accent?: string
}

export function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div
          className="text-3xl font-extrabold tracking-tight tabular-nums"
          style={accent ? { color: accent } : undefined}
        >
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </CardContent>
    </Card>
  )
}

interface StatCardsRowProps {
  items: StatCardProps[]
}

export function StatCardsRow({ items }: StatCardsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  )
}
