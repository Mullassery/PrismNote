import { X, Minus, Plus } from 'lucide-react'
import VizPane from './VizPane'
import { useFontSize } from '../hooks/useFontSize'

export default function PlotsPanel({ onClose }: { onClose: () => void }) {
  const { size: fontSize, inc: fontInc, dec: fontDec } = useFontSize('pn-plots-size', 13)

  return (
    <div className="flex-1 flex flex-col pn-surface border-l pn-bd overflow-hidden">
      <div className="h-10 flex items-center justify-between px-4 border-b pn-bd shrink-0">
        <span className="text-sm font-semibold pn-text">Plots & Dashboards</span>
        <div className="flex items-center gap-1 pn-muted">
          <button onClick={fontDec} title="Decrease font size" className="p-1 pn-hover rounded"><Minus size={13} /></button>
          <span className="text-[10px] tabular-nums w-5 text-center" title="Panel font size">{fontSize}</span>
          <button onClick={fontInc} title="Increase font size" className="p-1 pn-hover rounded">+</button>
          <span className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={onClose} className="p-1 rounded pn-hover"><X size={16} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ fontSize }}>
        <VizPane />
      </div>
    </div>
  )
}
