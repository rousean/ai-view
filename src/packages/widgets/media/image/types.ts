/** Image widget props. Validated by zod inside index.ts. */
export interface ImageProps {
  /** Image URL — remote `https://…` or inline `data:image/…`. */
  src: string
  /** How the image fills the box. */
  fit: 'cover' | 'contain' | 'fill'
  /** Corner radius in px. */
  radius: number
}
