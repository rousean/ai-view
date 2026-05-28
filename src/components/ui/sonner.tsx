'use client'

import { Toaster as SonnerToaster, toast } from 'sonner'

/**
 * Single Toaster instance — mount once at the EditorRoot level. shadcn
 * convention re-wraps sonner so the rest of the app imports from
 * `~/components/ui/sonner` rather than the raw package.
 *
 *   - `richColors` styles the success / warning / error variants
 *     against shadcn semantic tokens.
 *   - `position` matches Figma / Linear: bottom-right is least
 *     intrusive when work is happening at the top.
 *   - `duration` of 3500ms hits the sweet spot — long enough to read,
 *     short enough that a chain of saves don't pile up forever.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      duration={3500}
      closeButton
      toastOptions={{
        className: 'text-[12px]',
      }}
    />
  )
}

export { toast }
