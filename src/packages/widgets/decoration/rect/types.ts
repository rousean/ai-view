/** Rectangle / panel shape props. Validated by zod inside index.ts. */
export interface RectProps {
  /** Fill colour. */
  fill: string
  /** Border colour (only drawn when `borderWidth > 0`). */
  borderColor: string
  /** Border thickness in px. */
  borderWidth: number
  /** Corner radius in px. */
  radius: number
}
