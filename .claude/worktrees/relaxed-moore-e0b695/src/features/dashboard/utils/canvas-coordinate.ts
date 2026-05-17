// 屏幕坐标转画布坐标
export function screenToCanvas(
  screenPoint: { x: number; y: number },
  containerRect: DOMRect,
  camera: { x: number; y: number; scale: number }
) {
  const { x: screenX, y: screenY } = screenPoint
  const { left, top } = containerRect
  const { x: camX, y: camY, scale } = camera

  return {
    x: (screenX - left - camX) / scale,
    y: (screenY - top - camY) / scale,
  }
}

// 画布坐标转屏幕坐标
export function canvasToScreen(
  canvasPoint: { x: number; y: number },
  containerRect: DOMRect,
  camera: { x: number; y: number; scale: number }
) {
  const { x: canvasX, y: canvasY } = canvasPoint
  const { left, top } = containerRect
  const { x: camX, y: camY, scale } = camera

  return {
    x: (canvasX * scale + camX) + left,
    y: (canvasY * scale + camY) + top,
  }
}