import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { deleteProject, duplicateProject } from '../use-projects'

interface Props {
  id: string
  name: string
}

/**
 * Row "..." menu for the screens list. Wires:
 *   - 编辑 → /editor-v2?id=<id>
 *   - 复制 → duplicateProject(id) (creates an independent copy)
 *   - 删除 → Dialog confirm → deleteProject(id)
 */
export function ScreenRowActions({ id, name }: Props) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const onDuplicate = async () => {
    setPending(true)
    try {
      await duplicateProject(id)
    } finally {
      setPending(false)
    }
  }

  const onDelete = async () => {
    setPending(true)
    try {
      await deleteProject(id)
      setConfirmOpen(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="更多"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem asChild>
            <Link to="/editor-v2" search={{ id }}>
              <Pencil />
              编辑
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void onDuplicate()} disabled={pending}>
            <Copy />
            创建副本
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setConfirmOpen(true)
            }}
          >
            <Trash2 />
            删除…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>删除大屏</DialogTitle>
            <DialogDescription>
              确认删除「{name}」？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void onDelete()} disabled={pending}>
              {pending ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}
