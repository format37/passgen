export type ThemeMode = 'dark' | 'light'

export type CopyState = 'idle' | 'copied' | 'error'

export type ErrorKind = 'emptyPool' | 'cryptoUnavailable' | null

export type StrengthScore = 0 | 1 | 2 | 3 | 4

export type StrengthLabel = 'Weak' | 'Medium' | 'Strong' | 'Very Strong'

export type CharsetField = 'uppercase' | 'lowercase' | 'digits' | 'symbols'

export interface GeneratorConfig {
  length: number
  useUppercase: boolean
  useLowercase: boolean
  useDigits: boolean
  useSymbols: boolean
  excludeAmbiguous: boolean
}

export const INITIAL_CONFIG: GeneratorConfig = {
  length: 16,
  useUppercase: true,
  useLowercase: true,
  useDigits: true,
  useSymbols: false,
  excludeAmbiguous: false,
}

export const AMBIGUOUS_CHARS = new Set(['0', 'o', 'O', 'I', 'l', '1', 'i', '|', 'c', 'C'])

export const CHARSET = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
} as const
