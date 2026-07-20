/**
 * LegendPanel — Explain ER diagram symbols
 * Shows meanings of node colors, edge styles, cardinality notation
 */

import { X, HelpCircle } from 'lucide-react'

interface LegendPanelProps {
  onClose: () => void
}

export default function LegendPanel({ onClose }: LegendPanelProps) {
  return (
    <div className="absolute bottom-4 left-4 w-80 p-4 pn-surface border pn-bd rounded-lg shadow-lg z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b pn-bd">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-blue-400" />
          <span className="font-semibold pn-text">ER Diagram Legend</span>
        </div>
        <button onClick={onClose} className="p-0.5 pn-hover rounded hover:bg-red-500/10">
          <X size={16} />
        </button>
      </div>

      {/* Node Types */}
      <div className="mb-4">
        <div className="text-xs font-bold uppercase tracking-wide pn-text mb-2">Table Types</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold pn-text">Fact Table</div>
              <div className="text-[11px] pn-faint">Many FKs, large row count, numeric-heavy</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold pn-text">Dimension Table</div>
              <div className="text-[11px] pn-faint">Few FKs, smaller, text-heavy descriptive data</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold pn-text">Bridge Table</div>
              <div className="text-[11px] pn-faint">Many-to-many relationship junction</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-500 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold pn-text">Unknown Type</div>
              <div className="text-[11px] pn-faint">Unable to classify (new table, insufficient data)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Relationship Types */}
      <div className="mb-4">
        <div className="text-xs font-bold uppercase tracking-wide pn-text mb-2">Relationships</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 bg-gray-400" />
            <span className="text-[10px] font-semibold text-green-400">🔗</span>
            <div className="flex-1 text-right">
              <div className="text-xs font-semibold pn-text">Explicit FK</div>
            </div>
          </div>
          <div className="text-[11px] pn-faint mb-2">Database constraint (solid line, solid arrow)</div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 bg-yellow-400" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fbbf24 0px, #fbbf24 5px, transparent 5px, transparent 10px)' }} />
            <span className="text-[10px] font-semibold text-yellow-400">🔹</span>
            <div className="flex-1 text-right">
              <div className="text-xs font-semibold pn-text">Inferred FK</div>
            </div>
          </div>
          <div className="text-[11px] pn-faint">Detected via naming convention (dashed line, yellow)</div>
        </div>
      </div>

      {/* Cardinality */}
      <div className="mb-4">
        <div className="text-xs font-bold uppercase tracking-wide pn-text mb-2">Cardinality</div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="pn-text">1:1</span>
            <span className="pn-faint">One-to-one (unique foreign key)</span>
          </div>
          <div className="flex justify-between">
            <span className="pn-text">1:N</span>
            <span className="pn-faint">One-to-many (typical foreign key)</span>
          </div>
          <div className="flex justify-between">
            <span className="pn-text">M:N</span>
            <span className="pn-faint">Many-to-many (via bridge table)</span>
          </div>
          <div className="flex justify-between">
            <span className="pn-text">?</span>
            <span className="pn-faint">Cardinality unknown</span>
          </div>
        </div>
      </div>

      {/* Interaction Tips */}
      <div className="pt-3 border-t pn-bd">
        <div className="text-xs font-bold uppercase tracking-wide pn-text mb-2">Tips</div>
        <div className="space-y-1 text-[11px] pn-faint">
          <div>• <span className="pn-text">Click table</span> to highlight related tables</div>
          <div>• <span className="pn-text">Click relationship</span> to see join predicate</div>
          <div>• <span className="pn-text">Scroll wheel</span> to zoom in/out</div>
          <div>• <span className="pn-text">Drag</span> to pan across schema</div>
          <div>• <span className="pn-text">Export</span> button creates PNG image</div>
        </div>
      </div>
    </div>
  )
}
