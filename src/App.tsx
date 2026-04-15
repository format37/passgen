import { useState } from 'react'
import type { ThemeMode } from './types'
import { ThemeToggle } from './components/ThemeToggle'
import { PasswordCard } from './components/PasswordCard'

export function App() {
  const [theme, setTheme] = useState<ThemeMode>('dark')

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('light', next === 'light')
  }

  return (
    <div className="min-h-screen bg-[--color-bg-base] flex flex-col items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-[28rem] sm:max-w-[30rem] md:max-w-[32.5rem]">
        <div className="flex justify-end mb-4">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <PasswordCard />
      </div>
    </div>
  )
}

export default App
