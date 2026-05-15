import { Hand } from 'lucide-react';
import type { Tool, ToolContext } from './tool.interface';

interface PanState {
  panning: boolean;
  startScreen?: { x: number; y: number };
  startCamera?: { x: number; y: number };
}

function getState(ctx: ToolContext): PanState {
  return ctx.state as unknown as PanState;
}

export const PanTool: Tool = {
  type: 'pan',
  label: '平移',
  shortcut: 'H',
  icon: Hand as Tool['icon'],
  cursor: 'grab',

  onPointerDown(e, ctx) {
    const s = getState(ctx);
    s.panning = true;
    s.startScreen = { x: e.clientX, y: e.clientY };
    const cam = ctx.editor.getCamera();
    s.startCamera = { x: cam.x, y: cam.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  },

  onPointerMove(e, ctx) {
    const s = getState(ctx);
    if (!s.panning || !s.startScreen || !s.startCamera) return;
    const dx = e.clientX - s.startScreen.x;
    const dy = e.clientY - s.startScreen.y;
    ctx.editor.setCamera({
      x: s.startCamera.x + dx,
      y: s.startCamera.y + dy,
    });
  },

  onPointerUp(_e, ctx) {
    const s = getState(ctx);
    s.panning = false;
  },
};
