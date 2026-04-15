interface AmbiguousFilterProps {
  excludeAmbiguous: boolean
  onAmbiguousChange: (value: boolean) => void
}

export function AmbiguousFilter({ excludeAmbiguous, onAmbiguousChange }: AmbiguousFilterProps) {
  return (
    <label className="control-label flex items-center gap-2 min-h-[44px] cursor-pointer select-none text-sm text-[--color-text-primary]">
      <input
        type="checkbox"
        checked={excludeAmbiguous}
        onChange={(e) => onAmbiguousChange(e.target.checked)}
        className="w-4 h-4 rounded accent-[--color-accent] cursor-pointer"
      />
      Exclude ambiguous characters (0oOIl1i|cC)
    </label>
  )
}
