/** Decorative tech frame (border + corner brackets) props. */
export interface FrameProps {
  color: string
  /** Full thin border rectangle. */
  showBorder: boolean
  borderWidth: number
  /** Inner fill ('transparent' for none). */
  fill: string
  radius: number
  /** Corner bracket arm length (px). */
  cornerLength: number
  cornerWidth: number
  glow: boolean
}
