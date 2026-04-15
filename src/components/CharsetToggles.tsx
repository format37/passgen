import type { GeneratorConfig, CharsetField } from '../types'

interface CharsetTogglesProps {
  config: Pick<GeneratorConfig, 'useUppercase' | 'useLowercase' | 'useDigits' | 'useSymbols'>
  onCharsetChange: (field: CharsetField, value: boolean) => void
}

type CharsetOption = {
  field: CharsetField
  label: string
  checked: boolean
}

export function CharsetToggles({ config, onCharsetChange }: CharsetTogglesProps) {
  const options: CharsetOption[] = [
    { field: 'uppercase', label: 'ABC', checked: config.useUppercase },
    { field: 'lowercase', label: 'abc', checked: config.useLowercase },
    { field: 'digits', label: '123', checked: config.useDigits },
    { field: 'symbols', label: '#$&', checked: config.useSymbols },
  ]

  const activeCount = options.filter((o) => o.checked).length

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[--color-text-secondary]">Characters used:</span>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {options.map(({ field, label, checked }) => {
          const isLastActive = checked && activeCount === 1
          return (
            <label
              key={field}
              className={[
                'control-label',
                'flex items-center gap-2 min-h-[44px] cursor-pointer select-none',
                'text-sm text-[--color-text-primary]',
                isLastActive ? 'opacity-50 pointer-events-none' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                type="checkbox"
                checked={checked}
                aria-disabled={isLastActive ? 'true' : undefined}
                onChange={(e) => onCharsetChange(field, e.target.checked)}
                className="w-4 h-4 rounded accent-[--color-accent] cursor-pointer"
              />
              {label}
            </label>
          )
        })}
      </div>
    </div>
  )
}
