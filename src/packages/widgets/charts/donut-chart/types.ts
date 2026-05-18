/** Donut-chart-specific props. Validated by zod inside meta.ts. */
export interface DonutChartProps {
  /** Optional title rendered above the ring. Empty = hidden. */
  title: string
  /**
   * Inner radius as a percentage of the outer radius (0–100).
   * 0 = full pie (no hole). 100 = razor-thin ring.
   */
  innerRadiusPercent: number
  /** Corner radius of each slice in pixels. */
  cornerRadius: number
  /** Gap between slices, in radians. ~0.005–0.05 is typical. */
  padAngle: number
  /** Uniform padding around the ring, in pixels. */
  padding: number
  /** Slightly lift slices on hover. */
  enableHover: boolean
  /** Show category labels on top of slices that are wide enough. */
  showLabels: boolean
}
