import { useState } from 'react'
import { X, Search } from 'lucide-react'

interface ShortcutGroup {
  category: string
  shortcuts: Array<{ keys: string; action: string }>
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    category: 'File',
    shortcuts: [
      { keys: '⌘N', action: 'New Notebook' },
      { keys: '⌘O', action: 'Open File' },
      { keys: '⌘S', action: 'Save Notebook' },
    ]
  },
  {
    category: 'Explore',
    shortcuts: [
      { keys: '⌘E', action: 'Open Data Explorer' },
      { keys: '⌘K', action: 'Search (Cmd+K in cell for AI)' },
      { keys: '⇧⌘P', action: 'Command Palette' },
    ]
  },
  {
    category: 'Edit',
    shortcuts: [
      { keys: '⌘Z', action: 'Undo (⌘Y Redo)' },
      { keys: '⌘X', action: 'Cut Cell' },
      { keys: '⌘C', action: 'Copy Cell' },
      { keys: '⌘V', action: 'Paste Cell' },
      { keys: 'Delete', action: 'Delete Cell' },
      { keys: 'Arrow Up/Down', action: 'Navigate Between Cells' },
    ]
  },
  {
    category: 'Run',
    shortcuts: [
      { keys: '⇧⏎', action: 'Run Current Cell' },
      { keys: '⌘⇧⏎', action: 'Run All Cells' },
      { keys: 'Ctrl+C', action: 'Interrupt Kernel' },
    ]
  },
  {
    category: 'View',
    shortcuts: [
      { keys: 'Cmd+,', action: 'Open Settings' },
      { keys: '—', action: 'Toggle Files Panel' },
      { keys: '—', action: 'Toggle Terminal & Console' },
      { keys: '—', action: 'Toggle AI Assistant' },
    ]
  },
  {
    category: 'Preferences',
    shortcuts: [
      { keys: 'Cmd+,', action: 'Settings' },
      { keys: '—', action: 'Theme: Dark/Light' },
      { keys: '—', action: 'Code Font Size' },
    ]
  },
]

interface KeyboardShortcutsModalProps {
  onClose: () => void
}

export default function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  const [filter, setFilter] = useState('')

  const filtered = SHORTCUTS.map(group => ({
    ...group,
    shortcuts: group.shortcuts.filter(s =>
      s.action.toLowerCase().includes(filter.toLowerCase()) ||
      s.keys.toLowerCase().includes(filter.toLowerCase())
    )
  })).filter(g => g.shortcuts.length > 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold pn-text">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 pn-faint" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search shortcuts…"
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="pn-faint">No shortcuts found matching "{filter}"</p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {filtered.map((group) => (
                <div key={group.category}>
                  <h3 className="text-xs font-semibold uppercase pn-faint mb-2">
                    {group.category}
                  </h3>
                  <div className="space-y-1">
                    {group.shortcuts.map((shortcut, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 rounded hover:bg-slate-700 transition"
                      >
                        <span className="pn-text text-sm">{shortcut.action}</span>
                        <kbd className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs font-mono text-blue-300">
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 text-xs pn-faint">
          Tip: Press <kbd className="px-1 bg-slate-700 rounded">⇧⌘P</kbd> for command palette (searchable)
        </div>
      </div>
    </div>
  )
}
