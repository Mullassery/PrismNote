import { useEffect, useState } from 'react'
import { Bookmark, Star, Trash2, Search, Loader2, Copy } from 'lucide-react'

interface SavedQuery {
  query_id: string
  title: string
  query_text: string
  query_type: string
  is_favorite: boolean
  run_count: number
  last_used?: string
  tags?: string[]
}

export default function QueryBookmarksPanel() {
  const [queries, setQueries] = useState<SavedQuery[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  useEffect(() => {
    fetchQueries()
  }, [])

  const fetchQueries = async () => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = showFavoritesOnly ? '/api/queries/favorites' : '/api/queries'
      const response = await fetch(endpoint)
      if (!response.ok) throw new Error('Failed to fetch queries')

      const data = await response.json()
      setQueries(Array.isArray(data) ? data : data.queries || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching queries')
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (queryId: string) => {
    try {
      const response = await fetch(`/api/queries/${queryId}/favorite`, { method: 'POST' })
      if (response.ok) {
        setQueries(queries.map(q =>
          q.query_id === queryId ? { ...q, is_favorite: !q.is_favorite } : q
        ))
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const deleteQuery = async (queryId: string) => {
    try {
      const response = await fetch(`/api/queries/${queryId}`, { method: 'DELETE' })
      if (response.ok) {
        setQueries(queries.filter(q => q.query_id !== queryId))
      }
    } catch (err) {
      console.error('Failed to delete query:', err)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const filtered = queries.filter(q =>
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.query_text.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-700">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center gap-2">
        <Bookmark size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold pn-text">Query Bookmarks</h3>
      </div>

      {/* Search and Filter */}
      <div className="p-3 border-b border-slate-700 space-y-2">
        <div className="flex items-center gap-2 bg-slate-900 rounded px-2 py-1.5">
          <Search size={14} className="pn-faint" />
          <input
            type="text"
            placeholder="Search queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm pn-text outline-none placeholder-slate-600"
          />
        </div>
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`w-full text-xs px-2 py-1.5 rounded transition-colors ${
            showFavoritesOnly
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-slate-800 text-pn-faint hover:bg-slate-700'
          }`}
        >
          <Star size={12} className="inline mr-1" />
          Favorites Only
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 flex items-center gap-2 text-sm pn-faint">
            <Loader2 size={14} className="animate-spin" />
            Loading queries...
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-rose-400 bg-rose-500/10">
            {error}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-4 text-center text-sm pn-faint">
            {queries.length === 0 ? 'No bookmarked queries' : 'No matching queries'}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-slate-700">
            {filtered.map((query) => (
              <div key={query.query_id} className="p-3 hover:bg-slate-800/50 transition-colors">
                {/* Title and Favorite */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold pn-text line-clamp-1">{query.title}</h4>
                    <p className="text-xs pn-faint mt-0.5">{query.query_type}</p>
                  </div>
                  <button
                    onClick={() => toggleFavorite(query.query_id)}
                    className="p-1 rounded hover:bg-slate-700 transition-colors"
                  >
                    <Star
                      size={14}
                      className={query.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}
                    />
                  </button>
                </div>

                {/* Query Preview */}
                <div className="mt-2 bg-slate-900/50 rounded p-2 text-xs font-mono pn-faint line-clamp-2 hover:line-clamp-none">
                  {query.query_text}
                </div>

                {/* Stats */}
                <div className="mt-2 flex items-center justify-between text-xs pn-faint">
                  <div>
                    {query.run_count} runs
                    {query.last_used && <span> • {new Date(query.last_used).toLocaleDateString()}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => copyToClipboard(query.query_text)}
                      className="p-1 rounded hover:bg-slate-700 transition-colors"
                      title="Copy query"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => deleteQuery(query.query_id)}
                      className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Delete query"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
