import { usePasswordGenerator } from '../hooks/usePasswordGenerator'
import { PasswordDisplay } from './PasswordDisplay'

export function PasswordCard() {
  const generator = usePasswordGenerator()

  return (
    <div className="bg-[--color-bg-card] rounded-2xl p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <PasswordDisplay
        password={generator.password}
        strengthScore={generator.strengthScore}
        strengthLabel={generator.strengthLabel}
        copyState={generator.copyState}
        errorKind={generator.errorKind}
        onRegenerate={generator.onRegenerate}
        onCopy={generator.onCopy}
      />
    </div>
  )
}
