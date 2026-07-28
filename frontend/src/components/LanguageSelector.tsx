import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { CellLanguage, LANGUAGES, getLanguagesSorted } from '../lib/languages'

interface LanguageSelectorProps {
  value: CellLanguage
  onChange: (language: CellLanguage) => void
  onlyExecutable?: boolean
}

export default function LanguageSelector({
  value,
  onChange,
  onlyExecutable = false,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const current = LANGUAGES[value]

  const languagesByCategory = getLanguagesSorted().filter(({ languages }) =>
    onlyExecutable
      ? languages.some(([_, config]) => config.features.execution)
      : languages.length > 0
  )

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 transition-all"
        title="Select programming language"
      >
        <span className="text-sm font-medium">{current.name}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-slate-950/95 border border-slate-700 rounded-lg shadow-lg overflow-hidden w-72">
          <div className="max-h-96 overflow-y-auto">
            {languagesByCategory.map(({ category, languages }) => (
              <div key={category}>
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900">
                  {category}
                </div>
                {languages.map(([langId, config]) => (
                  <button
                    key={langId}
                    onClick={() => {
                      onChange(langId)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      value === langId
                        ? 'bg-blue-500/20 text-blue-300 border-l-2 border-blue-500'
                        : 'text-slate-300 hover:bg-slate-800 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {config.description}
                    </div>
                    {config.runtimes.length > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        {config.runtimes.slice(0, 2).join(', ')}
                        {config.runtimes.length > 2 ? '...' : ''}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 px-3 py-2 bg-slate-900 text-xs text-slate-400">
            {current.features.execution ? (
              <span className="text-green-400">Executable</span>
            ) : (
              <span>Non-executable</span>
            )}
            {current.features.visualization && <span className="ml-2 text-amber-400">Visualizable</span>}
          </div>
        </div>
      )}

      <style>{`
        button:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}
