import * as React from 'react'
import type { WidgetNode } from '@schema/types'
import type { ResolvedWidgetData, WidgetMeta } from '@widgets/widget-meta'
import { findEnterAnimation } from './animations'
import { WidgetErrorBoundary } from './widget-error-boundary'

export interface WidgetViewProps {
  node: WidgetNode
  /** Resolved meta for `node.type`, or undefined when the type is unknown. */
  meta: WidgetMeta | undefined
  /** Slot-projected, sample-resolved data for the widget. */
  data: ResolvedWidgetData
  /** True in the designer; false in the runtime renderer. */
  designMode: boolean
  /** Forwarded from the error boundary (designer writes it to RuntimeStore). */
  onError?: (err: Error) => void
  /**
   * Bump to remount the widget so its CSS enter-animation replays. The
   * designer passes its "preview animation" token; the runtime can leave it
   * undefined (animation plays once on first mount).
   */
  replayToken?: number | string
  /**
   * Surface a widget interaction (with datum detail) to the host. Passed
   * straight to the widget Component's `onInteract`; the host container
   * uses it to enrich the dispatched event with the clicked value.
   */
  onInteract?: (trigger: string, detail?: Record<string, unknown>) => void
}

/**
 * Pure widget renderer — given a `node` + its `meta` + resolved `data`, it
 * mounts the widget's component inside a per-widget error boundary. No
 * editor / store dependency: the caller (designer canvas now, standalone
 * runtime later) is responsible for subscribing to state and resolving
 * data, then handing the result here. This is the seam that lets the
 * runtime render a project without pulling in the whole designer.
 */
export const WidgetView: React.FC<WidgetViewProps> = ({
  node,
  meta,
  data,
  designMode,
  onError,
  replayToken,
  onInteract,
}) => {
  const enterAnim = node.animation?.enter
  const enterMeta = enterAnim ? findEnterAnimation(enterAnim.type) : undefined
  // The shell carries the enter animation: `ai-view-anim` reads the
  // `--ai-view-enter-*` custom properties to run the chosen keyframe.
  // Keying it on `replayToken` lets the designer force a replay (CSS
  // animations don't retrigger on same-node prop changes).
  return (
    <div
      key={replayToken}
      className={enterMeta ? 'ai-view-anim h-full w-full' : 'h-full w-full'}
      style={
        enterMeta && enterAnim
          ? ({
              ['--ai-view-enter-name']: `ai-view-${enterMeta.type}`,
              ['--ai-view-enter-duration']: `${enterAnim.duration}ms`,
              ['--ai-view-enter-delay']: `${enterAnim.delay}ms`,
              ['--ai-view-enter-easing']: enterAnim.easing,
            } as React.CSSProperties)
          : undefined
      }
    >
      {meta ? (
        <WidgetErrorBoundary widgetId={node.id} widgetName={node.name} onError={onError}>
          <meta.Component
            node={node}
            props={node.props as never}
            data={data}
            layout={node.layout}
            designMode={designMode}
            onInteract={onInteract}
          />
        </WidgetErrorBoundary>
      ) : (
        <UnknownWidget type={node.type} />
      )}
    </div>
  )
}

const UnknownWidget: React.FC<{ type: string }> = ({ type }) => (
  <div className="bg-destructive/10 border-destructive/40 text-destructive grid h-full w-full place-items-center border border-dashed text-xs">
    未注册组件: {type}
  </div>
)
