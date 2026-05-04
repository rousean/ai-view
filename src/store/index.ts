// stores/canvasStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable'; // 注意：这里用的是旧包的 arrayMove 工具函数（最稳定）

type CanvasItem = {
  id: string;
  type: string;        // 对应 child.key
  props?: Record<string, any>;
}

interface CanvasState {
  items: CanvasItem[];

  addItem: (type: string, props?: any) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, newProps: any) => void;
  reorderItems: (activeId: string, overId: string) => void;
  clearAll: () => void;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (type, props = {}) => {
        const newItem: CanvasItem = {
          id: `canvas-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type,
          props,
        };
        set((state) => ({ items: [...state.items, newItem] }));
      },

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

      updateItem: (id, newProps) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, props: { ...item.props, ...newProps } } : item
          ),
        })),

      reorderItems: (activeId, overId) => {
        const { items } = get();
        const oldIndex = items.findIndex((i) => i.id === activeId);
        const newIndex = items.findIndex((i) => i.id === overId);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        set({ items: arrayMove(items, oldIndex, newIndex) });
      },

      clearAll: () => set({ items: [] }),
    }),
    { name: 'canvas-storage' }
  )
);