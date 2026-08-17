import { useState, useMemo } from 'react'
import { ChevronDown, Search, Zap, Eye, Share2, Info } from 'lucide-react'
import { LANGUAGES, getLanguagesSorted, getInteropLanguages } from '../lib/languages'
import type { CellLanguage } from '../lib/languages'

interface LanguageSelectorProps {
  value: CellLanguage
  onChange: (language: CellLanguage) => void
  onlyExecutable?: boolean
  showDetails?: boolean
}

export default function LanguageSelector({
  value,
  onChange,
  onlyExecutable = false,
  showDetails = false,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInterop, setShowInterop] = useState(false)
  const current = LANGUAGES[value]
  const interopLangs = getInteropLanguages(value)

  const languagesByCategory = useMemo(() => {
    let categories = getLanguagesSorted().filter(({ languages }) =>
      onlyExecutable
        ? languages.some(([_, config]) => config.features.execution)
        : languages.length > 0
    )

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      categories = categories
        .map(({ category, languages }) => ({
          category,
          languages: languages.filter(
            ([_, config]) =>
              config.name.toLowerCase().includes(query) ||
              config.description?.toLowerCase().includes(query) ||
              config.runtimes.some(r => r.toLowerCase().includes(query))
          ),
        }))
        .filter(({ languages }) => languages.length > 0)
    }

    return categories
  }, [searchQuery, onlyExecutable])

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
        <div className="absolute top-full left-0 mt-2 z-50 bg-slate-950/95 border border-slate-700 rounded-lg shadow-xl overflow-hidden w-80 max-h-[600px] flex flex-col">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-700 bg-slate-900/50">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search languages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Language List */}
          <div className="flex-1 overflow-y-auto">
            {languagesByCategory.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                No languages found matching "{searchQuery}"
              </div>
            ) : (
              languagesByCategory.map(({ category, languages }) => (
                <div key={category}>
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900 sticky top-0">
                    {category}
                  </div>
                  {languages.map(([langId, config]) => (
                    <button
                      key={langId}
                      onClick={() => {
                        onChange(langId)
                        setIsOpen(false)
                        setSearchQuery('')
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-l-2 ${
                        value === langId
                          ? 'bg-blue-500/20 text-blue-300 border-l-blue-500'
                          : 'text-slate-300 hover:bg-slate-800/50 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{config.name}</div>
                          {showDetails && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {config.description}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          {/* lucide-react icons in this version don't accept a `title`
                              prop directly — wrap in a span so the tooltip still works. */}
                          {config.features.execution && (
                            <span title="Executable">
                              <Zap size={12} className="text-green-400" />
                            </span>
                          )}
                          {config.features.visualization && (
                            <span title="Visualizable">
                              <Eye size={12} className="text-amber-400" />
                            </span>
                          )}
                          {config.features.interop.length > 0 && (
                            <span title="Has interop">
                              <Share2 size={12} className="text-blue-400" />
                            </span>
                          )}
                        </div>
                      </div>
                      {showDetails && config.runtimes.length > 0 && (
                        <div className="text-xs text-slate-500 mt-1.5">
                          {config.runtimes.slice(0, 2).join(', ')}
                          {config.runtimes.length > 2 ? `... +${config.runtimes.length - 2} more` : ''}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer with Current Language Info */}
          <div className="border-t border-slate-700 p-3 bg-slate-900 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              {current.features.execution && (
                <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400">
                  Executable
                </span>
              )}
              {current.features.visualization && (
                <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">
                  Visualizable
                </span>
              )}
            </div>

            {/* Interop Info */}
            {interopLangs.length > 0 && (
              <div>
                <button
                  onClick={() => setShowInterop(!showInterop)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Info size={12} />
                  Interops with {interopLangs.length} language(s)
                </button>
                {showInterop && (
                  <div className="text-xs text-slate-400 mt-1 pl-4 space-y-1">
                    {interopLangs.map((lang) => (
                      <div key={lang}>• {LANGUAGES[lang].name}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
