import type { GeneratorConfig } from '../types'
import { CHARSET, AMBIGUOUS_CHARS } from '../types'

export function buildPool(config: GeneratorConfig): string {
  let pool = ''
  if (config.useUppercase) pool += CHARSET.uppercase
  if (config.useLowercase) pool += CHARSET.lowercase
  if (config.useDigits) pool += CHARSET.digits
  if (config.useSymbols) pool += CHARSET.symbols

  if (config.excludeAmbiguous) {
    pool = [...pool].filter((ch) => !AMBIGUOUS_CHARS.has(ch)).join('')
  }

  return pool
}

export function generate(config: GeneratorConfig): string {
  const pool = buildPool(config)

  if (pool.length === 0) {
    throw new Error('Character pool is empty')
  }

  const poolSize = pool.length
  const maxUnbiased = Math.floor(0x100000000 / poolSize) * poolSize

  const result: string[] = []
  const length = config.length

  // Max quota for crypto.getRandomValues is 65536 bytes = 16384 Uint32 elements
  const MAX_BATCH = 16384
  while (result.length < length) {
    const batchSize = Math.min(length * 2, MAX_BATCH)
    const buffer = new Uint32Array(batchSize)
    crypto.getRandomValues(buffer)
    for (let i = 0; i < buffer.length && result.length < length; i++) {
      const value = buffer[i]
      if (value < maxUnbiased) {
        result.push(pool[value % poolSize])
      }
    }
  }

  return result.join('')
}
