import { useState } from 'react'
import { X, Search } from 'lucide-react'

interface Shortcut {
  key: string
  action: string
  category: string
  description?: string
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { category: 'Navigation', key: 'Cmd/Ctrl + K', action: 'Search', description: 'Global search across notebooks' },
  { category: 'Navigation', key: 'Cmd/Ctrl + Shift + P', action: 'Command Palette', description: 'Execute commands' },
  { category: 'Navigation', key: 'Cmd/Ctrl + E', action: 'Data Explorer', description: 'Explore and visualize data' },
  { category: 'Navigation', key: '?', action: 'Keyboard Shortcuts', description: 'Show this help' },

  // File Operations
  { category: 'File', key: 'Cmd/Ctrl + N', action: 'New Notebook', description: 'Create a new notebook' },
  { category: 'File', key: 'Cmd/Ctrl + O', action: 'Open Notebook', description: 'Open an existing notebook' },
  { category: 'File', key: 'Cmd/Ctrl + S', action: 'Save', description: 'Save current notebook' },

  // Cell Operations
  { category: 'Cell', key: 'Shift + Enter', action: 'Execute Cell', description: 'Run current cell' },
  { category: 'Cell', key: 'Cmd/Ctrl + Shift + Enter', action: 'Run All Cells', description: 'Execute all cells in notebook' },
  { category: 'Cell', key: 'Enter', action: 'New Cell', description: 'Create new cell below' },
  { category: 'Cell', key: 'Backspace', action: 'Delete Cell', description: 'Delete current cell (when empty)' },

  // Editor
  { category: 'Editor', key: 'Cmd/Ctrl + Z', action: 'Undo', description: 'Undo last change' },
  { category: 'Editor', key: 'Cmd/Ctrl + Shift + Z', action: 'Redo', description: 'Redo last undone change' },
  { category: 'Editor', key: 'Cmd/Ctrl + /', action: 'Toggle Comment', description: 'Comment/uncomment lines' },

  // UI
  { category: 'UI', key: 'Cmd/Ctrl + ,', action: 'Settings', description: 'Open settings' },
  { category: 'UI', key: 'Esc', action: 'Close Modal', description: 'Close any open dialog' },
]

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [searchTerm, setSearchTerm] = useState('')

  if (!isOpen) return null

  const categories = Array.from(new Set(SHORTCUTS.map((s) => s.category)))
  const filteredShortcuts = searchTerm.trim()
    ? SHORTCUTS.filter(
        (s) =>
          s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : SHORTCUTS

  return (
    <div className="shortcuts-modal-backdrop" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            className="shortcuts-close"
            onClick={onClose}
            aria-label="Close shortcuts"
          >
            <X size={20} />
          </button>
        </div>

        <div className="shortcuts-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="shortcuts-search-input"
          />
        </div>

        <div className="shortcuts-content">
          {filteredShortcuts.length === 0 ? (
            <div className="shortcuts-empty">
              <p>No shortcuts found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div className="shortcuts-list">
              {categories.map((category) => {
                const items = filteredShortcuts.filter((s) => s.category === category)
                if (items.length === 0) return null

                return (
                  <div key={category} className="shortcuts-category">
                    <h3>{category}</h3>
                    <div className="shortcuts-items">
                      {items.map((shortcut) => (
                        <div key={`${category}-${shortcut.key}`} className="shortcut-item">
                          <div className="shortcut-key">
                            {shortcut.key.split('/').map((k, i) => (
                              <span key={i}>
                                {i > 0 && <span className="key-or">/</span>}
                                <kbd>{k.trim()}</kbd>
                              </span>
                            ))}
                          </div>
                          <div className="shortcut-info">
                            <div className="shortcut-action">{shortcut.action}</div>
                            {shortcut.description && (
                              <div className="shortcut-description">{shortcut.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="shortcuts-footer">
          <p>Press <kbd>?</kbd> anytime to show this help</p>
        </div>
      </div>

      <style>{`
        .shortcuts-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 150ms ease-out;
        }

        .shortcuts-modal {
          background: var(--bg-primary);
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
          max-width: 700px;
          width: 90%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .shortcuts-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }

        .shortcuts-modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .shortcuts-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 150ms ease-out;
        }

        .shortcuts-close:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .shortcuts-search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          color: var(--text-secondary);
        }

        .shortcuts-search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
        }

        .shortcuts-search-input::placeholder {
          color: var(--text-secondary);
        }

        .shortcuts-content {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        .shortcuts-list {
          padding: 20px;
        }

        .shortcuts-category {
          margin-bottom: 24px;
        }

        .shortcuts-category:last-child {
          margin-bottom: 0;
        }

        .shortcuts-category h3 {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin: 0 0 12px 0;
          letter-spacing: 0.5px;
        }

        .shortcuts-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shortcut-item {
          display: flex;
          gap: 16px;
          padding: 10px;
          border-radius: 8px;
          transition: background-color 150ms ease-out;
        }

        .shortcut-item:hover {
          background: var(--bg-secondary);
        }

        .shortcut-key {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 140px;
        }

        .key-or {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0 4px;
        }

        kbd {
          display: inline-block;
          padding: 4px 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 12px;
          font-family: monospace;
          color: var(--text-primary);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          white-space: nowrap;
        }

        .shortcut-info {
          flex: 1;
        }

        .shortcut-action {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .shortcut-description {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .shortcuts-empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-secondary);
        }

        .shortcuts-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          font-size: 13px;
          color: var(--text-secondary);
          text-align: center;
        }

        .shortcuts-footer kbd {
          padding: 2px 6px;
        }

        @media (max-width: 768px) {
          .shortcuts-modal {
            width: 95%;
            max-height: 90vh;
          }

          .shortcut-item {
            flex-direction: column;
            gap: 8px;
          }

          .shortcut-key {
            min-width: auto;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
