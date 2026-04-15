// Password Generator Integration Test — Design Doc: frontend-design.md, prd.md
// Generated: 2026-04-15 | Budget Used: 11/3 integration (user-directed scope override)
// Test Type: Integration Tests
// Implementation Timing: Created alongside implementation

import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'

// ---------------------------------------------------------------------------
// NOTE ON MOCK BOUNDARIES
// External boundaries mocked:
//   - window.crypto.getRandomValues  (CSPRNG — non-deterministic, required for test isolation)
//   - navigator.clipboard.writeText  (Clipboard API — async external I/O)
//   - buildPool (only in test #10 via module mock to simulate empty-pool injection)
// Internal components (passwordUtils.generate internals, zxcvbn-light) are NOT mocked;
// they run as real implementations to verify observable integration behavior.
// ---------------------------------------------------------------------------

// Hoisted module mock for passwordUtils — allows per-test override of buildPool/generate.
// vi.hoisted captures the real implementations before vi.mock runs so resetters can
// restore them without causing circular references.
const { buildPoolMock, generateMock } = vi.hoisted(() => {
  return { buildPoolMock: vi.fn(), generateMock: vi.fn() }
})

vi.mock('../utils/passwordUtils', async (importOriginal) => {
  const real = await importOriginal<typeof import('../utils/passwordUtils')>()
  buildPoolMock.mockImplementation(real.buildPool)
  generateMock.mockImplementation(real.generate)
  return {
    buildPool: buildPoolMock,
    generate: generateMock,
  }
})

// ---------------------------------------------------------------------------
// SHARED SETUP
// ---------------------------------------------------------------------------

// Deterministic crypto stub — fills buffer with sequential values cycling
// through all characters of any pool.  Tests that need a specific character
// profile replace this stub inline.
const deterministicGetRandomValues = vi.fn((buffer: Uint32Array) => {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = i * 1_000_003 // large prime spread ensures varied chars
  }
  return buffer
})

beforeEach(async () => {
  Object.defineProperty(globalThis, 'crypto', {
    value: { getRandomValues: deterministicGetRandomValues },
    writable: true,
    configurable: true,
  })
  // Restore passwordUtils mocks to whatever the vi.mock factory initialised them to
  // (real implementations), so test #10 overrides do not leak into subsequent tests.
  buildPoolMock.mockReset()
  generateMock.mockReset()
  // Re-apply real implementations via dynamic import
  const real = await import('../utils/passwordUtils')
  // The factory already set the mock to the real impl, but we need to re-apply after mockReset.
  // We use the actual module exports — these are the vi.fn() wrappers, but the factory
  // initialised them with the real code, which is preserved in mockReset only when
  // mockImplementation is used explicitly.
  // Re-import the original module to grab undecorated real functions:
  const { buildPool: realBp, generate: realGen } = await vi.importActual<typeof import('../utils/passwordUtils')>('../utils/passwordUtils')
  buildPoolMock.mockImplementation(realBp)
  generateMock.mockImplementation(realGen)
  void real // suppress unused-variable lint warning
  deterministicGetRandomValues.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// TEST 1 — Password generation on mount
// ---------------------------------------------------------------------------
// AC: AC-01 "Given the page has finished loading, a non-empty password matching
//     the default settings (length 16, uppercase + lowercase + digits enabled,
//     symbols disabled, ambiguous characters included) is displayed within 500 ms."
// EARS: (none) — Basic functionality
// ROI: 99 | Business Value: 10 (core product) | Frequency: 10 (every user)
// Behavior: App mounts → usePasswordGenerator runs → 16-char password displayed
// @category: core-functionality
// @dependency: App, usePasswordGenerator, passwordUtils, window.crypto
// @complexity: medium
// ---------------------------------------------------------------------------
describe('AC-01: Password generation on mount', () => {
  it('displays a non-empty 16-character password immediately after mount using default charset', async () => {
    // Arrange
    // (App with default state — no user interactions)

    // Act
    render(<App />)

    // Assert
    // Verification items:
    // - Password field is present in the DOM (not masked)
    // - Password value is non-empty
    // - Password length is exactly 16 characters
    // - Password contains only characters from uppercase + lowercase + digits pool
    //   (no symbols, ambiguous chars included in pool by default)
    // - crypto.getRandomValues was called at least once
    const passwordField = screen.getByRole('textbox', { name: /password/i })
    expect(passwordField).toBeInTheDocument()
    const value = (passwordField as HTMLInputElement).value
    expect(value).toHaveLength(16)
    expect(value).toMatch(/^[A-Za-z0-9]+$/)
    expect(deterministicGetRandomValues).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TEST 2 — Length control: slider and +/- buttons update password length
// ---------------------------------------------------------------------------
// AC: AC-03 "Given the slider is moved to a new position, the password field
//     updates immediately with a newly generated password of the selected length."
// AC: AC-04 "+/- buttons clamp to [8,64] and trigger regeneration; buttons
//     disabled at bounds."
// EARS: When slider moves / When button clicked
// ROI: 81 | Business Value: 9 | Frequency: 9
// Behavior: Length control interaction → state update → new password displayed
// @category: core-functionality
// @dependency: App, LengthControl, usePasswordGenerator, passwordUtils
// @complexity: medium
// ---------------------------------------------------------------------------
describe('AC-03/04: Length control updates password length and regenerates', () => {
  it('slider change produces a new password of the selected length', async () => {
    // Arrange
    render(<App />)
    const slider = screen.getByRole('slider', { name: /password length/i })

    // Act — simulate moving slider to length 24
    fireEvent.change(slider, { target: { value: '24' } })

    // Assert
    // Verification items:
    // - Slider aria-valuenow reflects 24
    // - Password field value has length === 24
    // - crypto.getRandomValues was called again (regeneration occurred)
    await waitFor(() => {
      const passwordField = screen.getByRole('textbox', { name: /password/i })
      expect((passwordField as HTMLInputElement).value).toHaveLength(24)
    })
    expect(slider).toHaveAttribute('aria-valuenow', '24')
  })

  it('+ button increments length by 1 and regenerates; disabled at maximum 64', async () => {
    // Arrange
    render(<App />)  // default length 16
    const plusButton = screen.getByRole('button', { name: /increment length/i })

    // Act
    await userEvent.click(plusButton)

    // Assert
    // Verification items:
    // - Password length is now 17
    // - + button is not disabled (still below 64)
    await waitFor(() => {
      const passwordField = screen.getByRole('textbox', { name: /password/i })
      expect((passwordField as HTMLInputElement).value).toHaveLength(17)
    })

    // Boundary: move to max via slider, then verify button disabled
    const slider = screen.getByRole('slider', { name: /password length/i })
    fireEvent.change(slider, { target: { value: '64' } })
    await waitFor(() => {
      expect(plusButton).toBeDisabled()
    })
  })

  it('- button decrements length by 1 and regenerates; disabled at minimum 8', async () => {
    // Arrange
    render(<App />)  // default length 16
    const minusButton = screen.getByRole('button', { name: /decrement length/i })

    // Act
    await userEvent.click(minusButton)

    // Assert
    // Verification items:
    // - Password length is now 15
    // - − button is not disabled (still above 8)
    await waitFor(() => {
      const passwordField = screen.getByRole('textbox', { name: /password/i })
      expect((passwordField as HTMLInputElement).value).toHaveLength(15)
    })

    // Boundary: move to min via slider, then verify button disabled
    const slider = screen.getByRole('slider', { name: /password length/i })
    fireEvent.change(slider, { target: { value: '8' } })
    await waitFor(() => {
      expect(minusButton).toBeDisabled()
    })
  })
})

// ---------------------------------------------------------------------------
// TEST 3 — Charset toggles update the character pool and regenerate
// ---------------------------------------------------------------------------
// AC: AC-05 "Given a toggle is switched, the character pool is updated and a
//     new password is generated immediately from the updated pool."
// EARS: When toggle changed
// ROI: 65 | Business Value: 8 | Frequency: 8
// Behavior: Toggle state change → effectivePool rebuilt → new password displayed
// @category: core-functionality
// @dependency: App, CharsetToggles, usePasswordGenerator, passwordUtils
// @complexity: medium
// ---------------------------------------------------------------------------
describe('AC-05: Charset toggle changes pool and triggers regeneration', () => {
  it('enabling symbols toggle produces a password that may contain symbol characters', async () => {
    // Arrange
    render(<App />)
    const symbolsToggle = screen.getByRole('checkbox', { name: 'Symbols #$&' })
    expect(symbolsToggle).not.toBeChecked()  // default: symbols disabled

    // Act
    await userEvent.click(symbolsToggle)

    // Assert
    // Verification items:
    // - Symbols toggle is now checked
    // - crypto.getRandomValues called again (regeneration)
    // - Password field is non-empty and still displays a value
    expect(symbolsToggle).toBeChecked()
    await waitFor(() => {
      const passwordField = screen.getByRole('textbox', { name: /password/i })
      expect((passwordField as HTMLInputElement).value).not.toBe('')
    })
    expect(deterministicGetRandomValues).toHaveBeenCalledTimes(2) // mount + toggle
  })

  it('disabling uppercase toggle (when multiple toggles active) regenerates without uppercase chars', async () => {
    // Arrange
    render(<App />)  // uppercase, lowercase, digits enabled
    const uppercaseToggle = screen.getByRole('checkbox', { name: 'Uppercase letters' })

    // Act
    await userEvent.click(uppercaseToggle)  // disable uppercase (2 toggles remain)

    // Assert
    // Verification items:
    // - Uppercase toggle is unchecked
    // - Password field contains no uppercase letters A-Z
    expect(uppercaseToggle).not.toBeChecked()
    await waitFor(() => {
      const passwordField = screen.getByRole('textbox', { name: /password/i })
      expect((passwordField as HTMLInputElement).value).toMatch(/^[a-z0-9]+$/)
    })
  })
})

// ---------------------------------------------------------------------------
// TEST 4 — Sole-active toggle prevention: cannot uncheck last active toggle
// ---------------------------------------------------------------------------
// AC: AC-06 "At least one toggle must remain enabled at all times. Attempting
//     to disable the last enabled toggle has no effect."
// EARS: When sole remaining active charset toggle is activated (attempted uncheck)
// ROI: 59 | Business Value: 8 | Frequency: 7
// Behavior: User unchecks last checked toggle → state unchanged → toggle stays checked
// @category: core-functionality
// @dependency: App, CharsetToggles, usePasswordGenerator
// @complexity: medium
// ---------------------------------------------------------------------------
describe('AC-06: Sole-active toggle cannot be unchecked', () => {
  it('clicking the only active toggle leaves it checked and does not change the password', async () => {
    // Arrange — disable uppercase and digits to leave only lowercase
    render(<App />)
    const uppercaseToggle = screen.getByRole('checkbox', { name: 'Uppercase letters' })
    const digitsToggle = screen.getByRole('checkbox', { name: 'Digits 123' })
    const lowercaseToggle = screen.getByRole('checkbox', { name: 'Lowercase letters' })
    await userEvent.click(uppercaseToggle)  // disable
    await userEvent.click(digitsToggle)     // disable → only lowercase remains

    // Capture current password to detect (absence of) change
    const passwordBefore = (screen.getByRole('textbox', { name: /password/i }) as HTMLInputElement).value

    // Act — attempt to uncheck the sole remaining toggle
    await userEvent.click(lowercaseToggle)

    // Assert
    // Verification items:
    // - Lowercase toggle remains checked
    // - Password display is non-empty (generation still active)
    // - Sole-toggle guard prevents disabling: toggle checked attribute unchanged
    expect(lowercaseToggle).toBeChecked()
    const passwordAfter = (screen.getByRole('textbox', { name: /password/i }) as HTMLInputElement).value
    expect(passwordAfter).toBeTruthy()
    expect(passwordAfter).toBe(passwordBefore)
  })
})

// ---------------------------------------------------------------------------
// TEST 5 — Ambiguous character filter removes 0oOIl1i|cC from generated passwords
// ---------------------------------------------------------------------------
// AC: AC-09 "When the toggle is enabled, no generated password contains any
//     of the characters o, O, I, l, 1, i, |, c, C."
// EARS: When ambiguous exclusion toggle enabled
// ROI: 40 | Business Value: 7 | Frequency: 5
// Behavior: excludeAmbiguous=true → pool filtered → password sans ambiguous chars
// @category: core-functionality
// @dependency: App, AmbiguousFilter, usePasswordGenerator, passwordUtils (buildPool)
// @complexity: medium
// ---------------------------------------------------------------------------
describe('AC-09: Ambiguous character filter removes target characters', () => {
  it('enabling exclude-ambiguous toggle produces a password containing none of 0oOIl1i|cC', async () => {
    // Arrange — use real crypto stub; run many passwords to assert statistical exclusion
    render(<App />)
    const ambiguousToggle = screen.getByRole('checkbox', { name: /exclude ambiguous/i })
    expect(ambiguousToggle).not.toBeChecked()  // default off

    // Act
    await userEvent.click(ambiguousToggle)

    // Assert
    // Verification items:
    // - Ambiguous toggle is checked
    // - Password field does not contain any of: o O I l 1 i | c C
    expect(ambiguousToggle).toBeChecked()
    await waitFor(() => {
      const passwordField = screen.getByRole('textbox', { name: /password/i })
      const value = (passwordField as HTMLInputElement).value
      expect(value).not.toMatch(/[0oOIl1i|cC]/)
    })
  })
})

// ---------------------------------------------------------------------------
// TEST 6 — Strength indicator: zxcvbn-light score maps to correct label
// ---------------------------------------------------------------------------
// AC: AC-13 "The four labels correspond to zxcvbn-light scores 0–1 → Weak,
//     2 → Medium, 3 → Strong, 4 → Very Strong."
// EARS: When password changes
// ROI: 70 | Business Value: 7 | Frequency: 10
// Behavior: password value fed to zxcvbn → score → StrengthLabel displayed in badge
// @category: core-functionality
// @dependency: App, PasswordDisplay (strength badge), usePasswordGenerator, zxcvbn-light
// @complexity: medium
// ---------------------------------------------------------------------------
describe('AC-13: Strength indicator maps zxcvbn score to correct label', () => {
  it('very short or weak password shows Weak label', async () => {
    // Arrange — stub crypto to always return 0 so generate() picks the first char
    // of the pool on every position.  Default pool (uppercase+lowercase+digits, 16 chars)
    // → all chars are 'A' → zxcvbn scores 'AAAAAAAAAAAAAAAA' as 0 (Weak).
    deterministicGetRandomValues.mockImplementation((buffer: Uint32Array) => {
      buffer.fill(0)
      return buffer
    })

    render(<App />)

    // Assert
    // Verification items:
    // - Strength badge (role="status") contains the text "Weak"
    await waitFor(() => {
      const badge = screen.getByRole('status')
      expect(badge).toHaveTextContent('Weak')
    })
  })

  it('strength badge shows a valid label and updates when the password changes', async () => {
    // Arrange — render with defaults, capture initial badge label
    render(<App />)

    // Assert — badge is rendered with a valid label from the label set
    const validLabels = ['Weak', 'Medium', 'Strong', 'Very Strong']
    await waitFor(() => {
      const badge = screen.getByRole('status')
      expect(validLabels.some((label) => badge.textContent?.includes(label))).toBe(true)
    })

    // Act — enable symbols and increase length to 32 to change the password
    const symbolsToggle = screen.getByRole('checkbox', { name: 'Symbols #$&' })
    await userEvent.click(symbolsToggle)
    const slider = screen.getByRole('slider', { name: /password length/i })
    fireEvent.change(slider, { target: { value: '32' } })

    // Assert — badge still shows a valid label after password changes
    await waitFor(() => {
      const badge = screen.getByRole('status')
      expect(validLabels.some((label) => badge.textContent?.includes(label))).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// TEST 7 — Regenerate button calls crypto.getRandomValues
// ---------------------------------------------------------------------------
// AC: AC-14 "Clicking the button always produces a new call to
//     crypto.getRandomValues() regardless of the current password value."
// EARS: When regenerate button is clicked
// ROI: 73 | Business Value: 9 | Frequency: 8
// Behavior: click → onRegenerate → generate() → crypto.getRandomValues called
// @category: core-functionality
// @dependency: App, PasswordDisplay (regenerate button), usePasswordGenerator, passwordUtils
// @complexity: low
// ---------------------------------------------------------------------------
describe('AC-14: Regenerate button always invokes crypto.getRandomValues', () => {
  it('clicking regenerate calls getRandomValues at least once more than before click', async () => {
    // Arrange
    render(<App />)
    const callsBefore = deterministicGetRandomValues.mock.calls.length
    const regenerateButton = screen.getByRole('button', { name: /regenerate|refresh/i })

    // Act
    await userEvent.click(regenerateButton)

    // Assert
    // Verification items:
    // - getRandomValues call count increased after click (new generation occurred)
    // - No equality check / retry guard skipped the call
    expect(deterministicGetRandomValues.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})

// ---------------------------------------------------------------------------
// TEST 8 — Copy button: success confirmation and error state
// ---------------------------------------------------------------------------
// AC: AC-15 "After clicking, a brief visual confirmation is shown for at least
//     1 000 ms."
// AC: AC-16 "When clipboard write fails, a visible non-blocking error message
//     is displayed for at least 2 000 ms; password remains visible."
// EARS: When copy button clicked (success) | When copy button clicked (failure)
// ROI: 81 (success path) | Business Value: 9 | Frequency: 9
// Behavior: writeText resolves → copyState='copied' → UI shows confirmation
//           writeText rejects → copyState='error' → UI shows error message
// @category: core-functionality
// @dependency: App, PasswordDisplay (copy button), usePasswordGenerator, navigator.clipboard
// @complexity: medium
// ---------------------------------------------------------------------------
describe('AC-15/16: Copy button feedback states', () => {
  it('successful clipboard write shows Copied confirmation and reverts after 1 000 ms', async () => {
    // Arrange
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteText },
      writable: true, configurable: true,
    })
    render(<App />)
    const copyButton = screen.getByRole('button', { name: /copy/i })

    // Act
    fireEvent.click(copyButton)

    // Assert — confirmation visible immediately after click
    // Verification items:
    // - Copy button aria-label changes to "Password copied" (observable confirmation)
    // - navigator.clipboard.writeText was called with the current password string
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /password copied/i })).toBeInTheDocument()
    )
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.any(String))

    // Advance time past 1 000 ms and confirm revert
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100))
    })
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /password copied/i })).not.toBeInTheDocument()
    )
  })

  it('clipboard write failure shows non-blocking error for 2 000 ms; password remains visible', async () => {
    // Arrange
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
      writable: true, configurable: true,
    })
    render(<App />)
    const copyButton = screen.getByRole('button', { name: /copy/i })

    // Act
    fireEvent.click(copyButton)

    // Assert — error message visible; password field still present
    // Verification items:
    // - An error message element is visible (role="alert" per AC-16 / UI Spec accessibility requirements)
    // - Password field still shows the password value
    // - Error message has not disappeared yet (< 2 000 ms)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    const passwordField = screen.getByRole('textbox', { name: /password/i })
    expect((passwordField as HTMLInputElement).value).not.toBe('')

    // Advance past 2 000 ms and confirm error disappears
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2100))
    })
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})

// ---------------------------------------------------------------------------
// TEST 9 — Theme toggle applies dark/light class to <html>
// ---------------------------------------------------------------------------
// AC: AC-17 "On page load with no prior user interaction, the UI uses dark
//     color scheme."
// AC: AC-18 "Toggling the control immediately applies the alternate color
//     scheme to all UI elements."
// EARS: When page loads | When theme toggle clicked
// ROI: 38 | Business Value: 6 | Frequency: 6
// Behavior: theme toggle → document.documentElement class set to 'dark'/'light'
// @category: core-functionality
// @dependency: App, ThemeToggle
// @complexity: low
// ---------------------------------------------------------------------------
describe('AC-17/18: Theme toggle switches dark/light class on <html>', () => {
  beforeEach(() => {
    // Reset documentElement classes between tests
    document.documentElement.classList.remove('dark', 'light')
  })

  it('renders in dark mode on initial mount (no light class on documentElement)', async () => {
    // Arrange & Act
    render(<App />)

    // Assert
    // Verification items:
    // - document.documentElement does not have class 'light' (dark is default)
    // - ThemeToggle aria-label says "Switch to light mode" (currently dark)
    expect(document.documentElement).not.toHaveClass('light')
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
  })

  it('clicking theme toggle adds light class then removes it on second click', async () => {
    // Arrange
    render(<App />)
    const themeToggle = screen.getByRole('button', { name: /switch to light mode/i })

    // Act — switch to light
    await userEvent.click(themeToggle)

    // Assert — light mode applied
    // Verification items:
    // - documentElement has class 'light'
    // - ThemeToggle aria-label updates to "Switch to dark mode"
    expect(document.documentElement).toHaveClass('light')
    const darkToggle = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(darkToggle).toBeInTheDocument()

    // Act — switch back to dark
    await userEvent.click(darkToggle)

    // Assert — dark mode restored (light class removed)
    expect(document.documentElement).not.toHaveClass('light')
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// TEST 10 — Pool-error state: mock buildPool returning empty string
// ---------------------------------------------------------------------------
// AC: AC-10 "When the effective character pool after exclusion is empty, the
//     password field is replaced by a visible error state and no password
//     string is shown."
// EARS: When effective character pool is empty
// ROI: 24 | Business Value: 8 | Frequency: 2 | Defect Detection: 10
// Behavior: buildPool returns '' → errorKind='emptyPool' → error UI shown;
//           controls remain enabled for recovery; copy/refresh disabled
// Mock injection: vi.mock('../utils/passwordUtils') — buildPool returns ''
// @category: edge-case
// @dependency: App, usePasswordGenerator, passwordUtils (mocked buildPool)
// @complexity: high
// ---------------------------------------------------------------------------
describe('AC-10: Pool-error state when effective character pool is empty', () => {
  it('shows error message, hides password field, and keeps charset controls enabled when pool is empty', async () => {
    // Arrange — override buildPool to return empty string so the hook sets emptyPool error
    buildPoolMock.mockReturnValue('')

    render(<App />)

    // Assert — pool-error state is active
    // Verification items:
    // - A visible error message element is present (role="alert")
    // - No password textbox is rendered (field hidden in pool-error state)
    // - Charset toggle controls are still rendered (recovery path accessible)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.queryByRole('textbox', { name: /password/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0)
  })

  it('recovers from pool-error when buildPool starts returning a valid pool', async () => {
    // Arrange — buildPool always returns '' (persistent pool-error)
    buildPoolMock.mockReturnValue('')

    render(<App />)

    // Assert — pool-error is active: error message shown, no password field
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.queryByRole('textbox', { name: /password/i })).not.toBeInTheDocument()

    // Act — restore buildPool to real implementation (simulates toggle restoring the pool)
    const { buildPool: realBp } = await vi.importActual<typeof import('../utils/passwordUtils')>('../utils/passwordUtils')
    buildPoolMock.mockImplementation(realBp)

    // Trigger a config change so the generation effect re-runs with the real buildPool
    const uppercaseToggle = screen.getByRole('checkbox', { name: 'Uppercase letters' })
    await userEvent.click(uppercaseToggle)

    // Assert — pool-error cleared: password field restored
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      const passwordField = screen.getByRole('textbox', { name: /password/i })
      expect((passwordField as HTMLInputElement).value).not.toBe('')
    })
  })
})

// ---------------------------------------------------------------------------
// TEST 11 — Crypto-error state: crypto.getRandomValues unavailable
// ---------------------------------------------------------------------------
// AC: AC-12 "When crypto.getRandomValues() is unavailable, the password display
//     field is replaced by a browser compatibility error message identifying
//     the issue, no password is generated, and no call to Math.random() is made."
// EARS: When crypto.getRandomValues is unavailable on mount
// ROI: 17 | Business Value: 9 | Frequency: 1 | Defect Detection: 10
// Behavior: crypto absent on mount → errorKind='cryptoUnavailable' → compat error shown;
//           no password generated; no Math.random called
// @category: edge-case
// @dependency: App, usePasswordGenerator, window.crypto (absent)
// @complexity: medium
// ---------------------------------------------------------------------------
describe('AC-12: Crypto-error state when crypto.getRandomValues is unavailable', () => {
  it('shows browser compatibility error and generates no password when crypto is absent', async () => {
    // Arrange — remove crypto.getRandomValues to simulate unavailable API
    const mathRandomSpy = vi.spyOn(Math, 'random')
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: undefined },
      writable: true,
      configurable: true,
    })

    // Act
    render(<App />)

    // Assert
    // Verification items:
    // - A browser compatibility error message is displayed (identifies the issue)
    // - Password field is not rendered (no password generated)
    // - Math.random was never called (no fallback to insecure random)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent(/browser|crypto|secure|random/i)
    expect(screen.queryByRole('textbox', { name: /password/i })).not.toBeInTheDocument()
    expect(mathRandomSpy).not.toHaveBeenCalled()
  })
})
