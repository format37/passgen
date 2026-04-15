import { useState, useEffect, useCallback } from 'react'
import { zxcvbn } from '@zxcvbn-ts/core'
import { buildPool, generate } from '../utils/passwordUtils'
import {
  INITIAL_CONFIG,
  type GeneratorConfig,
  type CopyState,
  type ErrorKind,
  type StrengthScore,
  type StrengthLabel,
  type CharsetField,
} from '../types'

const CHARSET_FIELD_MAP: Record<CharsetField, keyof GeneratorConfig> = {
  uppercase: 'useUppercase',
  lowercase: 'useLowercase',
  digits: 'useDigits',
  symbols: 'useSymbols',
}

const STRENGTH_LABELS: Record<StrengthScore, StrengthLabel> = {
  0: 'Weak',
  1: 'Weak',
  2: 'Medium',
  3: 'Strong',
  4: 'Very Strong',
}

export interface UsePasswordGeneratorReturn {
  config: GeneratorConfig
  password: string
  copyState: CopyState
  errorKind: ErrorKind
  strengthScore: StrengthScore
  strengthLabel: StrengthLabel
  isPoolEmpty: boolean
  isPlusDisabled: boolean
  isMinusDisabled: boolean
  onLengthChange: (length: number) => void
  onCharsetChange: (field: CharsetField, value: boolean) => void
  onExcludeAmbiguousChange: (value: boolean) => void
  onRegenerate: () => void
  onCopy: () => Promise<void>
}

export function usePasswordGenerator(): UsePasswordGeneratorReturn {
  const [config, setConfig] = useState<GeneratorConfig>(INITIAL_CONFIG)
  const [password, setPassword] = useState('')
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [errorKind, setErrorKind] = useState<ErrorKind>(null)

  // Detect crypto unavailability on mount
  useEffect(() => {
    if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
      setErrorKind('cryptoUnavailable')
    }
  }, [])

  // Generate password whenever config changes; bail out if crypto is unavailable
  useEffect(() => {
    if (errorKind === 'cryptoUnavailable') return

    try {
      const pool = buildPool(config)
      if (pool.length === 0) {
        setErrorKind('emptyPool')
        setPassword('')
        return
      }
      setErrorKind(null)
      setPassword(generate(config))
    } catch {
      setErrorKind('emptyPool')
      setPassword('')
    }
  }, [config, errorKind])

  // Derived values — computed on each render, not stored in state
  const isPoolEmpty = errorKind === 'emptyPool'
  const zxcvbnResult = zxcvbn(password)
  const strengthScore = (zxcvbnResult.score ?? 0) as StrengthScore
  const strengthLabel = STRENGTH_LABELS[strengthScore]
  const isPlusDisabled = config.length >= 64
  const isMinusDisabled = config.length <= 8

  const onLengthChange = useCallback((length: number) => {
    const clamped = Math.max(8, Math.min(64, length))
    setConfig((prev) => ({ ...prev, length: clamped }))
  }, [])

  const onCharsetChange = useCallback((field: CharsetField, value: boolean) => {
    setConfig((prev) => {
      const configKey = CHARSET_FIELD_MAP[field]
      // Guard: prevent disabling the last active charset
      if (!value) {
        const activeCount = (Object.keys(CHARSET_FIELD_MAP) as CharsetField[]).filter(
          (f) => prev[CHARSET_FIELD_MAP[f]] as boolean,
        ).length
        if (activeCount <= 1) return prev
      }
      return { ...prev, [configKey]: value }
    })
  }, [])

  const onExcludeAmbiguousChange = useCallback((value: boolean) => {
    setConfig((prev) => ({ ...prev, excludeAmbiguous: value }))
  }, [])

  const onRegenerate = useCallback(() => {
    // Spread creates a new object reference, triggering the config useEffect
    setConfig((prev) => ({ ...prev }))
  }, [])

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1000)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }, [password])

  return {
    config,
    password,
    copyState,
    errorKind,
    strengthScore,
    strengthLabel,
    isPoolEmpty,
    isPlusDisabled,
    isMinusDisabled,
    onLengthChange,
    onCharsetChange,
    onExcludeAmbiguousChange,
    onRegenerate,
    onCopy,
  }
}
