import * as React from 'react'
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import type { Dataset, FieldType } from '@schema/types'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Switch } from '~/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { cn } from '~/lib/utils'
import { useDashboardEditor } from '../../editor/editor-context'

interface DatasetTableEditorProps {
  widgetId: string
  dataset: Dataset
}

/**
 * Compact in-place editor for `WidgetNode.data.dataset`, built on
 * shadcn `Table` + `Button` + `Switch`. Density is tightened via
 * className overrides (text-[11px], h-7 headers, p-0 cells) but the
 * primitives stay in the same theme as the rest of the editor.
 *
 * Header per column: name (inline rename) + a "···" menu for type
 * change / delete. Each data row has typed cell inputs and a trash
 * button on hover. Bottom strip: "+ 列" / "+ 行".
 *
 * All mutations go through DashboardEditor facade methods. Cell edits
 * merge consecutive keystrokes on the same cell into one undo entry
 * via `widget.inlineCell.mergeKey`.
 */
export function DatasetTableEditor({ widgetId, dataset }: DatasetTableEditorProps) {
  const editor = useDashboardEditor()
  const { fields, rows } = dataset
  const isEmpty = fields.length === 0

  return (
    <div className="border-border bg-background overflow-hidden rounded-md border">
      <Table className="text-[11px] tabular-nums">
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground/60 h-7 w-7 px-1.5 py-1 text-center font-normal">
              #
            </TableHead>
            {fields.map((f) => (
              <ColumnHeader
                key={f.name}
                widgetId={widgetId}
                fieldName={f.name}
                fieldType={f.type}
                existingNames={fields.map((x) => x.name)}
              />
            ))}
            <TableHead className="h-7 w-7 p-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={2}
                className="text-muted-foreground/60 px-3 py-6 text-center text-[11px]"
              >
                没有列。点击下方「+ 列」开始
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={fields.length + 2}
                className="text-muted-foreground/60 px-3 py-4 text-center text-[11px]"
              >
                没有行。点击下方「+ 行」开始
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIdx) => (
              <DataRow
                key={rowIdx}
                widgetId={widgetId}
                rowIndex={rowIdx}
                row={row}
                fields={fields}
              />
            ))
          )}
        </TableBody>
      </Table>

      {/* Footer toolbar */}
      <div className="border-border bg-muted/20 flex items-center gap-1 border-t px-1.5 py-1">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => editor.addInlineColumn(widgetId)}
        >
          <Plus />列
        </Button>
        <Button
          variant="ghost"
          size="xs"
          disabled={isEmpty}
          onClick={() => editor.addInlineRow(widgetId)}
        >
          <Plus />行
        </Button>
        <div className="flex-1" />
        <span className="text-muted-foreground/50 px-1 text-[11px]">
          {rows.length} 行 · {fields.length} 列
        </span>
      </div>
    </div>
  )
}

// ─── Column header ─────────────────────────────────────────────────

const TYPE_LABEL: Record<FieldType, string> = {
  string: '文本',
  number: '数值',
  date: '日期',
  boolean: '布尔',
}

function ColumnHeader({
  widgetId,
  fieldName,
  fieldType,
  existingNames,
}: {
  widgetId: string
  fieldName: string
  fieldType: FieldType
  existingNames: string[]
}) {
  const editor = useDashboardEditor()
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(fieldName)
  React.useEffect(() => setDraft(fieldName), [fieldName])

  // Local collision check — caller's data is the source of truth; we
  // just block the rename instead of letting the command throw.
  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (!trimmed || trimmed === fieldName) {
      setDraft(fieldName)
      return
    }
    if (existingNames.includes(trimmed)) {
      setDraft(fieldName)
      return
    }
    editor.renameInlineColumn(widgetId, fieldName, trimmed)
  }

  return (
    <TableHead className="border-border/60 group/col h-7 border-l px-1.5 py-1 font-normal">
      <div className="flex min-w-[80px] items-center gap-1">
        {editing ? (
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              else if (e.key === 'Escape') {
                setDraft(fieldName)
                setEditing(false)
              }
            }}
            onFocus={(e) => e.target.select()}
            className="border-primary text-foreground bg-card min-w-0 flex-1 rounded-sm border px-1 py-0 text-[11px] outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-foreground min-w-0 flex-1 truncate text-left text-[11px] font-medium"
            title="点击重命名"
          >
            {fieldName}
          </button>
        )}
        <span className="text-muted-foreground/60 shrink-0 text-[10px]">
          {TYPE_LABEL[fieldType]}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="列操作"
              className="text-muted-foreground/50 opacity-0 group-hover/col:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            {(['string', 'number', 'date', 'boolean'] as FieldType[]).map((t) => (
              <DropdownMenuItem
                key={t}
                disabled={t === fieldType}
                onSelect={() => editor.setInlineColumnType(widgetId, fieldName, t)}
              >
                <span className="flex-1">{TYPE_LABEL[t]}</span>
                {t === fieldType && (
                  <span className="text-muted-foreground/60 text-[10px]">当前</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => editor.removeInlineColumn(widgetId, fieldName)}
            >
              <Trash2 />
              删除列
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  )
}

// ─── Data row ──────────────────────────────────────────────────────

function DataRow({
  widgetId,
  rowIndex,
  row,
  fields,
}: {
  widgetId: string
  rowIndex: number
  row: Record<string, unknown>
  fields: Dataset['fields']
}) {
  const editor = useDashboardEditor()
  return (
    <TableRow className="group/row">
      <TableCell className="text-muted-foreground/40 w-7 px-1.5 py-0.5 text-center text-[10px] tabular-nums">
        {rowIndex + 1}
      </TableCell>
      {fields.map((f, colIndex) => (
        <TableCell key={f.name} className="border-border/40 border-l p-0">
          <CellInput
            widgetId={widgetId}
            rowIndex={rowIndex}
            colIndex={colIndex}
            columnName={f.name}
            type={f.type}
            value={row[f.name]}
          />
        </TableCell>
      ))}
      <TableCell className="w-7 p-0">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="删除行"
          onClick={() => editor.removeInlineRow(widgetId, rowIndex)}
          className="text-muted-foreground/50 hover:text-destructive opacity-0 group-hover/row:opacity-100"
        >
          <Trash2 />
        </Button>
      </TableCell>
    </TableRow>
  )
}

// ─── Cell input — type-aware ───────────────────────────────────────

interface CellInputProps {
  widgetId: string
  rowIndex: number
  colIndex: number
  columnName: string
  type: FieldType
  value: unknown
}

/**
 * Type-aware cell:
 *   - boolean → shadcn `Switch` (size="sm"), commits on toggle
 *   - other   → borderless inline `<input>`, commits on blur / Enter
 *
 * Local draft state for text inputs so partial values like "12." don't
 * round-trip through `coerceCell` mid-typing and lose the trailing dot.
 */
function CellInput({ widgetId, rowIndex, colIndex, columnName, type, value }: CellInputProps) {
  const editor = useDashboardEditor()

  const [text, setText] = React.useState(() => formatCell(value, type))
  React.useEffect(() => setText(formatCell(value, type)), [value, type])

  if (type === 'boolean') {
    const on = Boolean(value)
    return (
      <div className="flex h-6 items-center justify-center">
        <Switch
          size="sm"
          checked={on}
          onCheckedChange={(next) =>
            editor.updateInlineCell(widgetId, rowIndex, columnName, next)
          }
          aria-label={`${columnName} 第 ${rowIndex + 1} 行`}
        />
      </div>
    )
  }

  const inputMode: React.HTMLAttributes<HTMLInputElement>['inputMode'] =
    type === 'number' ? 'decimal' : type === 'date' ? 'numeric' : 'text'
  const placeholder = type === 'number' ? '0' : type === 'date' ? 'YYYY-MM-DD' : ''

  return (
    <input
      type="text"
      inputMode={inputMode}
      data-cell={`${rowIndex}:${colIndex}`}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => editor.updateInlineCell(widgetId, rowIndex, columnName, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          // Commit (via the next focus's blur) and move down a row, same column.
          e.preventDefault()
          const next = document.querySelector<HTMLInputElement>(
            `input[data-cell="${rowIndex + 1}:${colIndex}"]`,
          )
          if (next) {
            next.focus()
            next.select()
          } else {
            ;(e.target as HTMLInputElement).blur()
          }
        } else if (e.key === 'Escape') {
          setText(formatCell(value, type))
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      onFocus={(e) => e.target.select()}
      placeholder={placeholder}
      className={cn(
        'focus:bg-card focus:ring-primary block h-6 w-full min-w-[80px] border-0 bg-transparent px-1.5 text-[11px] tabular-nums outline-none focus:ring-1 focus:ring-inset',
        type === 'number' && 'text-right',
      )}
    />
  )
}

function formatCell(value: unknown, type: FieldType): string {
  if (value == null) return ''
  if (type === 'date') {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    const s = String(value)
    return s.includes('T') ? s.slice(0, 10) : s
  }
  return String(value)
}
