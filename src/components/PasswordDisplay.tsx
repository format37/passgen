import type { CopyState, ErrorKind, StrengthScore, StrengthLabel } from '../types'

type PasswordDisplayProps = {
  password: string
  errorKind: ErrorKind
  copyState: CopyState
  strengthScore: StrengthScore
  strengthLabel: StrengthLabel
  onRegenerate: () => void
  onCopy: () => Promise<void>
}

const STRENGTH_COLOR_CLASS: Record<StrengthLabel, string> = {
  Weak: 'text-[--color-strength-weak]',
  Medium: 'text-[--color-strength-medium]',
  Strong: 'text-[--color-strength-strong]',
  'Very Strong': 'text-[--color-strength-very-strong]',
}

export function PasswordDisplay({
  password,
  errorKind,
  copyState,
  strengthScore,
  strengthLabel,
  onRegenerate,
  onCopy,
}: PasswordDisplayProps) {
  const isCopied = copyState === 'copied'
  const isCopyError = copyState === 'error'

  if (errorKind === 'cryptoUnavailable') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="rounded-lg bg-[--color-error-bg] p-4 text-[--color-error-text] text-sm"
      >
        Your browser does not support secure random number generation. Please upgrade to a modern
        browser.
      </div>
    )
  }

  if (errorKind === 'emptyPool') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="rounded-lg bg-[--color-error-bg] p-4 text-[--color-error-text] text-sm"
      >
        No characters available. Please enable at least one character set.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Password row: [Regenerate] [input] [Copy] */}
      <div className="flex items-center gap-2">
        {/* Regenerate button — left of password */}
        <button
          type="button"
          onClick={onRegenerate}
          aria-label="Regenerate password"
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg bg-[--color-btn-bg] text-[--color-text-primary] cursor-pointer hover:bg-[--color-btn-hover] hover:scale-105 active:scale-95 transition-all duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {/* Arrow-path icon (Heroicons outline) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>

        {/* Password input — read-only display field */}
        <input
          type="text"
          readOnly
          tabIndex={0}
          value={password}
          aria-label="Generated password"
          className="password-display flex-1 min-h-[2.75rem] rounded-lg bg-[--color-bg-input] border border-[--color-border] px-3 py-2 text-[--color-text-primary] font-mono tracking-wider focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2 focus-visible:outline-none"
        />

        {/* Copy button — right of password */}
        <button
          type="button"
          onClick={onCopy}
          aria-label={isCopied ? 'Password copied' : isCopyError ? 'Copy failed' : 'Copy password'}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg bg-[--color-accent] text-white cursor-pointer hover:bg-[--color-accent-hover] hover:scale-105 active:scale-95 transition-all duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {isCopied ? (
            /* Check icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          ) : isCopyError ? (
            /* X-mark icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            /* Clipboard icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Strength badge */}
      <div aria-live="polite" aria-atomic="true" role="status" className="flex items-center gap-2">
        <span
          className={`font-semibold uppercase tracking-wider text-sm ${STRENGTH_COLOR_CLASS[strengthLabel]}`}
        >
          {strengthLabel}
        </span>
        <span className="text-xs text-[--color-text-muted]">(score: {strengthScore}/4)</span>
      </div>

      {/* Copy error notification */}
      {isCopyError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-[--color-error-bg] px-3 py-2 text-xs text-[--color-error-text]"
        >
          Failed to copy to clipboard. Please copy the password manually.
        </div>
      )}
    </div>
  )
}
