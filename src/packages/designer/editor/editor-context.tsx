import * as React from 'react'
import { useDocumentStore, type DocumentState } from '../stores/document-store'
import { useEditorStore, type EditorState } from '../stores/editor-store'
import { useRuntimeStore, type RuntimeState } from '../stores/runtime-store'
import type { DashboardEditor } from './dashboard-editor'

const EditorContext = React.createContext<DashboardEditor | null>(null)

export interface EditorProviderProps {
  editor: DashboardEditor
  children: React.ReactNode
}

/** Provider — wrap your designer UI with this. */
export function EditorProvider({ editor, children }: EditorProviderProps) {
  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
}

/** Get the editor instance. Throws if used outside <EditorProvider>. */
export function useDashboardEditor(): DashboardEditor {
  const editor = React.useContext(EditorContext)
  if (!editor) {
    throw new Error('useDashboardEditor must be used inside <EditorProvider>')
  }
  return editor
}

/** Convenience hooks for each store. */
export function useEditorState<T>(selector: (s: EditorState) => T): T {
  return useEditorStore(selector)
}

export function useDocumentState<T>(selector: (s: DocumentState) => T): T {
  return useDocumentStore(selector)
}

export function useRuntimeState<T>(selector: (s: RuntimeState) => T): T {
  return useRuntimeStore(selector)
}
