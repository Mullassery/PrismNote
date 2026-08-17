import type { ReactNode } from 'react'
import { AlertCircle, ChevronDown, X } from 'lucide-react'

interface ErrorCardProps {
  title?: string
  message: string
  details?: string
  suggestion?: string
  onRetry?: () => void
  onDismiss?: () => void
  icon?: ReactNode
}

export default function ErrorCard({
  title = 'Error',
  message,
  details,
  suggestion,
  onRetry,
  onDismiss,
  icon,
}: ErrorCardProps) {
  return (
    <div className="error-card">
      <div className="error-card-header">
        <div className="error-card-title-section">
          {icon ? (
            <div className="error-card-icon">{icon}</div>
          ) : (
            <AlertCircle className="error-card-icon" size={20} />
          )}
          <h3 className="error-card-title">{title}</h3>
        </div>
        {onDismiss && (
          <button
            className="error-card-close"
            onClick={onDismiss}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="error-card-message">{message}</div>

      {suggestion && (
        <div className="error-card-suggestion">
          <strong>Try:</strong> {suggestion}
        </div>
      )}

      {details && (
        <details className="error-card-details">
          <summary>
            <ChevronDown size={16} />
            Technical Details
          </summary>
          <pre>{details}</pre>
        </details>
      )}

      <div className="error-card-actions">
        {onRetry && (
          <button className="btn btn-secondary btn-sm" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>

      <style>{`
        .error-card {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-left: 4px solid var(--error);
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
          font-size: 14px;
        }

        .error-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .error-card-title-section {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .error-card-icon {
          color: var(--error);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .error-card-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .error-card-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 150ms ease-out;
        }

        .error-card-close:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }

        .error-card-message {
          color: var(--text-primary);
          margin-bottom: 12px;
          line-height: 1.5;
        }

        .error-card-suggestion {
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 6px;
          padding: 10px 12px;
          margin-bottom: 12px;
          font-size: 13px;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .error-card-details {
          margin-bottom: 12px;
        }

        .error-card-details summary {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-weight: 500;
          color: var(--text-secondary);
          padding: 8px;
          margin: -8px;
          border-radius: 4px;
          transition: background-color 150ms ease-out;
          user-select: none;
        }

        .error-card-details summary:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-primary);
        }

        .error-card-details[open] summary {
          color: var(--text-primary);
        }

        .error-card-details pre {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px;
          margin: 12px 0 0 0;
          font-size: 12px;
          overflow-x: auto;
          max-height: 200px;
          overflow-y: auto;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .error-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        @media (max-width: 768px) {
          .error-card {
            padding: 12px;
          }

          .error-card-title-section {
            gap: 8px;
          }

          .error-card-details pre {
            max-height: 150px;
          }
        }
      `}</style>
    </div>
  )
}
