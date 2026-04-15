import { usePasswordGenerator } from '../hooks/usePasswordGenerator'
import { PasswordDisplay } from './PasswordDisplay'
import { LengthControl } from './LengthControl'
import { CharsetToggles } from './CharsetToggles'
import { AmbiguousFilter } from './AmbiguousFilter'

export function PasswordCard() {
  const generator = usePasswordGenerator()

  return (
    <div className="bg-[--color-bg-card] rounded-2xl p-6 md:p-8 card-shadow flex flex-col gap-5">
      <PasswordDisplay
        password={generator.password}
        strengthScore={generator.strengthScore}
        strengthLabel={generator.strengthLabel}
        copyState={generator.copyState}
        errorKind={generator.errorKind}
        onRegenerate={generator.onRegenerate}
        onCopy={generator.onCopy}
      />
      <LengthControl
        length={generator.config.length}
        onLengthChange={generator.onLengthChange}
      />
      <CharsetToggles
        config={generator.config}
        onCharsetChange={generator.onCharsetChange}
      />
      <AmbiguousFilter
        excludeAmbiguous={generator.config.excludeAmbiguous}
        onAmbiguousChange={generator.onExcludeAmbiguousChange}
      />
    </div>
  )
}
