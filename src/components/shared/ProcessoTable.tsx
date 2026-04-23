import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { Processo } from '@/hooks/useProcessos'

interface ProcessoTableProps {
  processos: Processo[]
  showTribunal?: boolean
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const s = String(d)
  if (s.length >= 10) {
    const [y, m, day] = s.slice(0, 10).split('-')
    return `${day}/${m}/${y}`
  }
  return s
}

export function ProcessoTable({ processos, showTribunal = false }: ProcessoTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showTribunal && <TableHead className="w-16">Tribunal</TableHead>}
            <TableHead className="w-24">Data</TableHead>
            <TableHead className="w-20">Classe</TableHead>
            <TableHead className="w-40">Relator</TableHead>
            <TableHead>Processo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processos.map((p) => (
            <TableRow key={p.id} className="hover:bg-muted/50">
              {showTribunal && (
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {p.tribunal}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="tabular-nums text-muted-foreground text-sm">
                {fmtDate(p.data_decisao)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {p.classe || '—'}
                </Badge>
              </TableCell>
              <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                {p.relator || '—'}
              </TableCell>
              <TableCell>
                <Link
                  to={`/${(p.tribunal || 'stf').toLowerCase()}/processo/${p.id}`}
                  className="text-sm font-medium text-foreground no-underline hover:text-stf"
                >
                  {p.ementa
                    ? p.ementa.slice(0, 120) + (p.ementa.length > 120 ? '…' : '')
                    : p.classe_processual || `${p.classe} ${p.numero_processo}`}
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {processos.length === 0 && (
            <TableRow>
              <TableCell colSpan={showTribunal ? 5 : 4} className="py-8 text-center text-muted-foreground">
                Nenhum processo encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
