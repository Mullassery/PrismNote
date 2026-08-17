import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeButton?: boolean
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeButton = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal modal-${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {(title || closeButton) && (
          <div className="modal-header">
            {title && <h2 id="modal-title">{title}</h2>}
            {closeButton && (
              <button
                className="modal-close"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 150ms ease-out;
        }

        .modal {
          background: var(--bg-primary);
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modal-sm { width: 90%; max-width: 400px; }
        .modal-md { width: 90%; max-width: 600px; }
        .modal-lg { width: 90%; max-width: 900px; }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border);
          gap: 16px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          flex: 1;
        }

        .modal-close {
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
          flex-shrink: 0;
        }

        .modal-close:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .modal-body {
          padding: 20px;
        }

        @media (max-width: 768px) {
          .modal {
            max-height: calc(100vh - 40px);
          }

          .modal-sm { max-width: none; }
          .modal-md { max-width: none; }
          .modal-lg { max-width: none; }

          .modal-header {
            padding: 16px;
          }

          .modal-body {
            padding: 16px;
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
