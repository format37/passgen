import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildPool, generate } from '../utils/passwordUtils'
import { CHARSET, AMBIGUOUS_CHARS } from '../types'
import type { GeneratorConfig } from '../types'

const defaultConfig: GeneratorConfig = {
  length: 16,
  useUppercase: true,
  useLowercase: true,
  useDigits: true,
  useSymbols: false,
  excludeAmbiguous: false,
}

// Helper to build a config with only one charset active
function onlyConfig(overrides: Partial<GeneratorConfig>): GeneratorConfig {
  return {
    length: 16,
    useUppercase: false,
    useLowercase: false,
    useDigits: false,
    useSymbols: false,
    excludeAmbiguous: false,
    ...overrides,
  }
}

describe('buildPool', () => {
  it('returns only uppercase chars when useUppercase is the sole active charset', () => {
    const pool = buildPool(onlyConfig({ useUppercase: true }))
    expect(pool).toBe(CHARSET.uppercase)
  })

  it('returns only lowercase chars when useLowercase is the sole active charset', () => {
    const pool = buildPool(onlyConfig({ useLowercase: true }))
    expect(pool).toBe(CHARSET.lowercase)
  })

  it('returns only digit chars when useDigits is the sole active charset', () => {
    const pool = buildPool(onlyConfig({ useDigits: true }))
    expect(pool).toBe(CHARSET.digits)
  })

  it('returns only symbol chars when useSymbols is the sole active charset', () => {
    const pool = buildPool(onlyConfig({ useSymbols: true }))
    expect(pool).toBe(CHARSET.symbols)
  })

  it('combines multiple charsets in order: uppercase + lowercase + digits', () => {
    const pool = buildPool(defaultConfig)
    expect(pool).toBe(CHARSET.uppercase + CHARSET.lowercase + CHARSET.digits)
  })

  it('includes all four charsets when all are enabled', () => {
    const pool = buildPool({ ...defaultConfig, useSymbols: true })
    expect(pool).toBe(
      CHARSET.uppercase + CHARSET.lowercase + CHARSET.digits + CHARSET.symbols,
    )
  })

  it('returns an empty string when all charsets are disabled', () => {
    const pool = buildPool(onlyConfig({}))
    expect(pool).toBe('')
  })

  it('excludes every AMBIGUOUS_CHARS character when excludeAmbiguous is true', () => {
    const pool = buildPool({ ...defaultConfig, excludeAmbiguous: true })
    for (const ch of AMBIGUOUS_CHARS) {
      expect(pool).not.toContain(ch)
    }
  })

  it('applies ambiguous exclusion across all active charsets', () => {
    const pool = buildPool({ ...defaultConfig, useSymbols: true, excludeAmbiguous: true })
    for (const ch of AMBIGUOUS_CHARS) {
      expect(pool).not.toContain(ch)
    }
    // Pool must still contain non-ambiguous characters
    expect(pool.length).toBeGreaterThan(0)
  })

  it('retains all characters when excludeAmbiguous is false', () => {
    const pool = buildPool(defaultConfig)
    // At least one ambiguous char should be present (e.g. 'O' from uppercase)
    expect(pool).toContain('O')
    expect(pool).toContain('l')
    expect(pool).toContain('1')
  })
})

describe('generate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a string of the exact requested length', () => {
    expect(generate({ ...defaultConfig, length: 1 })).toHaveLength(1)
    expect(generate({ ...defaultConfig, length: 16 })).toHaveLength(16)
    expect(generate({ ...defaultConfig, length: 64 })).toHaveLength(64)
  })

  it('returns only characters drawn from the active pool', () => {
    const config = onlyConfig({ useUppercase: true })
    const pool = buildPool(config)
    const result = generate({ ...config, length: 100 })
    for (const ch of result) {
      expect(pool).toContain(ch)
    }
  })

  it('uses crypto.getRandomValues (not Math.random)', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues')
    generate(defaultConfig)
    expect(spy).toHaveBeenCalled()
  })

  it('does not call Math.random during generation', () => {
    const mathRandomSpy = vi.spyOn(Math, 'random')
    generate(defaultConfig)
    expect(mathRandomSpy).not.toHaveBeenCalled()
  })

  it('throws Error("Character pool is empty") when all charsets are disabled', () => {
    expect(() => generate(onlyConfig({}))).toThrow('Character pool is empty')
  })

  it('produces a deterministic result when crypto.getRandomValues is stubbed', () => {
    // Stub getRandomValues to fill with zeros: every value maps to pool[0]
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((buffer) => {
      const arr = buffer as Uint32Array
      arr.fill(0)
      return arr
    })
    const pool = buildPool(onlyConfig({ useUppercase: true })) // 'ABCDE...'
    const result = generate({ ...onlyConfig({ useUppercase: true }), length: 5 })
    expect(result).toBe(pool[0].repeat(5))
  })

  it('contains no ambiguous characters when excludeAmbiguous is true', () => {
    const config: GeneratorConfig = {
      ...defaultConfig,
      useSymbols: true,
      excludeAmbiguous: true,
      length: 200,
    }
    const result = generate(config)
    for (const ch of AMBIGUOUS_CHARS) {
      expect(result).not.toContain(ch)
    }
  })

  it('can include ambiguous characters when excludeAmbiguous is false (statistical)', () => {
    // With a pool of only the ambiguous chars themselves this is trivially true,
    // but here we verify the gate is open: pool must contain the ambiguous chars
    const pool = buildPool(defaultConfig)
    expect(pool).toContain('O') // sanity that excludeAmbiguous:false keeps them
  })

  it('statistical uniformity: each character appears within ±30% of expected frequency over 10000 chars', () => {
    const pool = buildPool(onlyConfig({ useUppercase: true })) // 26 chars
    const totalChars = 10_000
    const result = generate({ ...onlyConfig({ useUppercase: true }), length: totalChars })

    const expected = totalChars / pool.length
    const tolerance = expected * 0.3

    const counts: Record<string, number> = {}
    for (const ch of result) {
      counts[ch] = (counts[ch] ?? 0) + 1
    }

    for (const ch of pool) {
      const count = counts[ch] ?? 0
      expect(count).toBeGreaterThanOrEqual(expected - tolerance)
      expect(count).toBeLessThanOrEqual(expected + tolerance)
    }
  })
})
