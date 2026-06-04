import * as React from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * React error boundary scoped to a single widget. A throw inside any
 * widget component lands here, gets rendered as a compact red card, and is
 * forwarded via `onError` (the designer wires this to RuntimeStore so the
 * layers panel / dev tools can surface the same error elsewhere).
 *
 * Kept as a class component (the only one in the codebase) because
 * `componentDidCatch` has no functional equivalent. Lives in @renderer so
 * both the designer canvas and the standalone runtime share it.
 */
interface Props {
  widgetId: string
  widgetName: string
  onError?: (err: Error) => void
  children: React.ReactNode
}

interface State {
  error: Error | null
}

export class WidgetErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(err: Error): State {
    return { error: err }
  }

  componentDidCatch(err: Error, info: React.ErrorInfo): void {
    // Surface to telemetry; keep a console line in dev so the stack
    // isn't completely hidden.
    if (import.meta.env.DEV) {
      console.error('[widget-error]', this.props.widgetId, err, info.componentStack)
    }
    this.props.onError?.(err)
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset on widget-id change so a different widget mounting under
    // this slot starts fresh.
    if (prevProps.widgetId !== this.props.widgetId && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        className="bg-destructive/5 border-destructive/40 text-destructive flex h-full w-full flex-col items-center justify-center gap-1.5 border border-dashed p-3 text-center"
        role="alert"
      >
        <AlertTriangle size={20} />
        <div className="text-[12px] font-medium">{this.props.widgetName} 渲染失败</div>
        <div
          className="text-[10px] opacity-80"
          title={this.state.error.stack ?? this.state.error.message}
        >
          {truncate(this.state.error.message, 60)}
        </div>
      </div>
    )
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}
