import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  tips?: string[]
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  tips,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      
      <h2 className="empty-state-title">{title}</h2>
      
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      
      {action && (
        <button
          className="btn btn-primary empty-state-action"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
      
      {tips && tips.length > 0 && (
        <div className="empty-state-tips">
          {tips.map((tip, i) => (
            <p key={i} className="empty-state-tip">
              {tip}
            </p>
          ))}
        </div>
      )}

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          padding: 60px 40px;
          text-align: center;
          gap: 20px;
        }

        .empty-state-icon {
          font-size: 64px;
          opacity: 0.3;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 80px;
        }

        .empty-state-icon svg {
          width: 64px;
          height: 64px;
          color: var(--text-secondary);
        }

        .empty-state-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .empty-state-description {
          font-size: 14px;
          color: var(--text-secondary);
          max-width: 400px;
          margin: 0;
          line-height: 1.5;
        }

        .empty-state-action {
          margin-top: 12px;
        }

        .empty-state-tips {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          max-width: 400px;
        }

        .empty-state-tip {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .empty-state {
            min-height: 200px;
            padding: 40px 20px;
          }

          .empty-state-title {
            font-size: 20px;
          }

          .empty-state-description {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  )
}
