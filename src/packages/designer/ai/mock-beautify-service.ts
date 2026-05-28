import { BUILTIN_PALETTE_TEMPLATES, type PaletteTemplate } from '../palette/palette-templates'
import type { BeautifyService, BeautifySuggestion } from './beautify-types'

/**
 * Mock beautify service — generates suggestions by recombining the
 * built-in theme palette with a few preset "vibe" templates. The shape
 * of the response mirrors what we'd want from a real LLM endpoint, so
 * swapping in `openAIBeautifyService(apiKey)` later changes one line.
 *
 * The templates here purposely cover the spectrum:
 *   - 深色科技     — dark canvas + accent primary + sharp corners
 *   - 商务清爽     — light canvas + muted primary + soft corners
 *   - 高对比聚焦   — same colours as the picked theme but bolder weight
 *                    and bigger fonts; for screens read from far away
 *
 * They patch any prop key the widget exposes whose name matches the
 * templates — meaning a brand-new widget type with familiar prop names
 * (e.g. `barColor`, `*Font`) participates without further code.
 */

interface Template {
  id: string
  title: string
  summary: string
  pickTemplate: (templates: PaletteTemplate[]) => PaletteTemplate
  /** Returns a patch given the chosen template + the widget's current props. */
  patch: (
    template: PaletteTemplate,
    props: Record<string, unknown>,
  ) => Record<string, unknown>
}

const TEMPLATES: Template[] = [
  {
    id: 'tech-dark',
    title: '深色科技',
    summary: '霓虹强调色 · 加粗标题 · 紧凑圆角',
    pickTemplate: (ts) => ts.find((t) => t.id === 'deep-space') ?? ts[0]!,
    patch: (tpl, props) =>
      buildPatch(props, {
        primary: tpl.palette.primary,
        textColor: tpl.palette.text,
        mutedColor: tpl.palette.muted,
        titleSize: 18,
        titleWeight: 'bold',
        axisSize: 12,
        labelSize: 11,
        radius: 4,
      }),
  },
  {
    id: 'crisp-business',
    title: '商务清爽',
    summary: '中性配色 · 大圆角 · 默认字重',
    pickTemplate: (ts) => ts.find((t) => t.id === 'business-light') ?? ts[0]!,
    patch: (tpl, props) =>
      buildPatch(props, {
        primary: tpl.palette.primary,
        textColor: tpl.palette.text,
        mutedColor: tpl.palette.muted,
        titleSize: 15,
        titleWeight: 'normal',
        axisSize: 11,
        labelSize: 11,
        radius: 10,
      }),
  },
  {
    id: 'focus-bold',
    title: '高对比聚焦',
    summary: '大屏远距阅读 · 加粗标题 · 大字号',
    pickTemplate: (ts) => ts.find((t) => t.id === 'cyber-neon') ?? ts[0]!,
    patch: (tpl, props) =>
      buildPatch(props, {
        primary: tpl.palette.primary,
        textColor: tpl.palette.text,
        mutedColor: tpl.palette.muted,
        titleSize: 22,
        titleWeight: 'bold',
        axisSize: 13,
        labelSize: 13,
        radius: 2,
      }),
  },
]

/**
 * Translate a curated style intent ({ primary, titleSize, … }) into a
 * concrete prop patch tailored to whichever keys actually exist on the
 * given widget. Keeps the templates ignorant of widget-specific names.
 */
interface StyleIntent {
  primary: string
  textColor: string
  mutedColor: string
  titleSize: number
  titleWeight: 'normal' | 'bold'
  axisSize: number
  labelSize: number
  radius: number
}

function buildPatch(
  props: Record<string, unknown>,
  intent: StyleIntent,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    // Colour-named flat props
    if (key === 'barColor' || key === 'fillColor') patch[key] = intent.primary
    // Compound FontStyle bags — title vs body recoloured separately
    else if (key.endsWith('Font') && typeof props[key] === 'object' && props[key] !== null) {
      const isTitle = key.toLowerCase().includes('title')
      patch[key] = {
        ...(props[key] as object),
        color: isTitle ? intent.textColor : intent.mutedColor,
        size: isTitle ? intent.titleSize : key.toLowerCase().includes('label') ? intent.labelSize : intent.axisSize,
        weight: isTitle ? intent.titleWeight : 'normal',
      }
    }
    // Generic radius / cornerRadius props
    else if (key === 'barRadius' || key === 'cornerRadius') {
      patch[key] = intent.radius
    }
  }
  return patch
}

export const mockBeautifyService: BeautifyService = {
  async suggest({ widget }, signal) {
    // Fake a tiny latency so the UI shows its loading state and feels
    // like a real network call. Cancel cleanly if the dialog closes.
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, 350)
      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(t)
            reject(new DOMException('aborted', 'AbortError'))
          },
          { once: true },
        )
      }
    })

    return TEMPLATES.map<BeautifySuggestion>((tpl) => {
      const chosen = tpl.pickTemplate(BUILTIN_PALETTE_TEMPLATES)
      return {
        id: tpl.id,
        title: tpl.title,
        summary: tpl.summary,
        swatch: chosen.swatch,
        propsPatch: tpl.patch(chosen, widget.props),
      }
    })
  },
}
