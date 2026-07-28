import { ReactNode } from 'react'
import { FileText, Table2, BarChart3, AlertCircle, Code, Copy, Check } from 'lucide-react'
import { useState } from 'react'

type OutputType = 'text' | 'table' | 'chart' | 'error' | 'html' | 'markdown'

interface OutputCardProps {
  type: OutputType
  data: ReactNode
  timestamp?: number
  onCopy?: () => void
}

const OUTPUT_ICONS: Record<OutputType, ReactNode> = {
  text: <FileText size={16} />,
  table: <Table2 size={16} />,
  chart: <BarChart3 size={16} />,
  error: <AlertCircle size={16} />,
  html: <Code size={16} />,
  markdown: <FileText size={16} />,
}

const OUTPUT_LABELS: Record<OutputType, string> = {
  text: 'Text',
  table: 'Table',
  chart: 'Chart',
  error: 'Error',
  html: 'HTML',
  markdown: 'Markdown',
}

export default function OutputCard({
  type,
  data,
  timestamp,
  onCopy,
}: OutputCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (onCopy) onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`output-card output-${type}`}>
      <div className="output-card-header">
        <div className="output-card-meta">
          <div className={`output-card-icon output-icon-${type}`}>
            {OUTPUT_ICONS[type]}
          </div>
          <span className="output-card-type">{OUTPUT_LABELS[type]}</span>
        </div>
        <div className="output-card-actions">
          {onCopy && (
            <button
              className="output-card-action"
              onClick={handleCopy}
              title="Copy to clipboard"
              aria-label="Copy output"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          )}
        </div>
      </div>
      <div className="output-card-content">
        {data}
      </div>
      {timestamp && (
        <div className="output-card-footer">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      )}

      <style>{`
        .output-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          margin: 12px 0;
          overflow: hidden;
          animation: slideIn 200ms ease-out;
        }

        .output-card.output-error {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.3);
          border-left: 3px solid var(--error);
        }

        .output-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border);
        }

        .output-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .output-card-icon {
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .output-icon-text { color: #3b82f6; }
        .output-icon-table { color: #10b981; }
        .output-icon-chart { color: #f59e0b; }
        .output-icon-error { color: #ef4444; }
        .output-icon-html { color: #8b5cf6; }
        .output-icon-markdown { color: #ec4899; }

        .output-card-type {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
        }

        .output-card-actions {
          display: flex;
          gap: 8px;
        }

        .output-card-action {
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

        .output-card-action:hover {
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .output-card-content {
          padding: 12px;
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-primary);
          overflow-x: auto;
        }

        .output-card-footer {
          padding: 8px 12px;
          font-size: 11px;
          color: var(--text-secondary);
          border-top: 1px solid var(--border);
          background: var(--bg-primary);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .output-card-content {
            padding: 10px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  )
}
