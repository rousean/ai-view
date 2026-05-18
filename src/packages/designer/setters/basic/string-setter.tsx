import * as React from 'react'
import type { SetterProps } from '../setter.interface'

interface StringSetterProps {
  placeholder?: string
  multiline?: boolean
  maxLength?: number
  rows?: number
}

/**
 * String input. Uses the Figma-style `.prop-input` class (defined in
 * designer/styles/editor.css) so it matches the property-panel chrome.
 */
export const StringSetter: React.FC<SetterProps<string>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as StringSetterProps
  const v = value ?? ''

  if (opts.multiline) {
    return (
      <textarea
        className="prop-input"
        style={{
          height: 'auto',
          padding: '6px 8px',
          resize: 'vertical',
          minHeight: 60,
        }}
        rows={opts.rows ?? 3}
        value={v}
        placeholder={opts.placeholder}
        maxLength={opts.maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <div className="prop-input">
      <input
        value={v}
        placeholder={opts.placeholder}
        maxLength={opts.maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
