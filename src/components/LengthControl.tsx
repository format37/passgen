interface LengthControlProps {
  length: number
  onLengthChange: (length: number) => void
  onIncrement: () => void
  onDecrement: () => void
}

export function LengthControl({ length, onLengthChange, onIncrement, onDecrement }: LengthControlProps) {
  const isAtMin = length <= 8
  const isAtMax = length >= 64

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[--color-text-secondary]">
        Password length: <strong className="text-[--color-text-primary]">{length}</strong>
      </label>
      <div className="flex items-center gap-2">
        {/* Minus button */}
        <button
          type="button"
          onClick={onDecrement}
          disabled={isAtMin}
          aria-label="Decrement length"
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-[--color-btn-bg] hover:bg-[--color-btn-hover] transition-all duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span aria-hidden="true" className="text-lg font-semibold leading-none">−</span>
        </button>

        {/* Slider — wrapped in py-[10px] for 44px touch area */}
        <div className="flex-1 py-[10px]">
          <input
            type="range"
            role="slider"
            min={8}
            max={64}
            step={1}
            value={length}
            aria-valuemin={8}
            aria-valuemax={64}
            aria-valuenow={length}
            aria-label="Password length"
            onChange={(e) => onLengthChange(Number(e.target.value))}
            className="w-full cursor-pointer accent-[--color-accent]"
          />
        </div>

        {/* Plus button */}
        <button
          type="button"
          onClick={onIncrement}
          disabled={isAtMax}
          aria-label="Increment length"
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-[--color-btn-bg] hover:bg-[--color-btn-hover] transition-all duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span aria-hidden="true" className="text-lg font-semibold leading-none">+</span>
        </button>
      </div>
    </div>
  )
}
