import MDPreview from '@uiw/react-markdown-preview'
import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { parseTraceback } from '../lib/pyerror'
import DataFrameView from './DataFrameView'
import { usePlots } from '../hooks/usePlots'
import { isDataFrame, type CellOutput, type MimeValue, type WidgetSpec } from '../types/notebook'

/** MIME-bundle text values arrive as either a single string or an array of
 * chunks to be joined (the streamed-text convention nbformat uses). */
function asText(v: MimeValue | undefined): string {
  if (Array.isArray(v)) return v.join('')
  if (typeof v === 'string') return v
  return v == null ? '' : String(v)
}

function isWidgetSpec(v: unknown): v is WidgetSpec {
  if (!v || typeof v !== 'object') return false
  const spec = v as Record<string, unknown>
  return typeof spec.name === 'string' && typeof spec.type === 'string'
}

interface OutputProps {
  output: CellOutput
  onWidget?: (name: string, value: string | number | boolean) => void
}

const DF_MIME = 'application/vnd.prismnote.df+json'
const WIDGET_MIME = 'application/vnd.prismnote.widget+json'

function WidgetControl({ spec, onChange }: { spec: WidgetSpec; onChange?: (name: string, value: string | number | boolean) => void }) {
  const fire = (v: string | number | boolean) => onChange?.(spec.name, v)
  return (
    <div className="flex items-center gap-2 py-1 text-[13px] text-gray-200">
      <label className="text-gray-400 min-w-[90px]">{spec.name}</label>
      {spec.type === 'text' && (
        <input defaultValue={typeof spec.value === 'string' ? spec.value : ''} onBlur={(e) => fire(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fire((e.target as HTMLInputElement).value)}
          className="px-2 py-1 rounded bg-white/5 border border-white/10 outline-none focus:border-blue-500" />
      )}
      {spec.type === 'slider' && (
        <span className="flex items-center gap-2">
          <input type="range" min={spec.min} max={spec.max} defaultValue={Number(spec.value)}
            onChange={(e) => fire(Number(e.target.value))} />
          <span className="tabular-nums text-gray-400 w-10">{String(spec.value)}</span>
        </span>
      )}
      {spec.type === 'select' && (
        <select defaultValue={String(spec.value)} onChange={(e) => fire(e.target.value)}
          className="px-2 py-1 rounded bg-white/5 border border-white/10 outline-none">
          {(spec.options ?? []).map((o) => <option key={String(o)} value={o}>{String(o)}</option>)}
        </select>
      )}
      {spec.type === 'checkbox' && (
        <input type="checkbox" defaultChecked={!!spec.value} onChange={(e) => fire(e.target.checked)} />
      )}
    </div>
  )
}

function ErrorOutput({ output }: { output: CellOutput }) {
  const [showTrace, setShowTrace] = useState(false)
  const raw = Array.isArray(output.traceback)
    ? output.traceback.join('\n')
    : Array.isArray(output.text)
    ? output.text.join('')
    : output.text || ''
  const parsed = parseTraceback(raw)
  return (
    <div className="bg-red-900/20 border border-red-700/60 rounded p-3 text-sm">
      <div className="flex items-start gap-2 text-red-300">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold">
            {parsed.ename}
            {parsed.line ? <span className="font-normal text-red-300/80"> · line {parsed.line}{parsed.col ? `, col ${parsed.col}` : ''}</span> : null}
          </div>
          <div className="text-red-100/90 mt-0.5 leading-relaxed">{parsed.friendly}</div>
        </div>
      </div>
      <button
        onClick={() => setShowTrace((s) => !s)}
        className="mt-2 flex items-center gap-1 text-[12px] text-red-300/80 hover:text-red-200"
      >
        <ChevronRight size={13} className={showTrace ? 'rotate-90 transition-transform' : 'transition-transform'} />
        {showTrace ? 'Hide' : 'Show'} full traceback
      </button>
      {showTrace && (
        <pre className="mt-1 font-mono text-[12px] text-red-300/90 overflow-x-auto whitespace-pre">{raw}</pre>
      )}
    </div>
  )
}

export default function Output({ output, onWidget }: OutputProps) {
  // Register figures into the plots store so the Visualization Pane gallery
  // collects them. Deduped by content, so re-renders don't pile up.
  useEffect(() => {
    if (output?.data?.['image/png'] || output?.data?.['image/svg+xml']) {
      usePlots.getState().addFromOutput(output)
    }
  }, [output])

  // Interactive input widgets (prism.input/slider/select/checkbox).
  const widget = output.data?.[WIDGET_MIME]
  if (isWidgetSpec(widget)) return <WidgetControl spec={widget} onChange={onWidget} />

  // %md magic and any text/markdown bundle render as formatted markdown.
  const md = output.data?.['text/markdown']
  if (md) {
    return (
      <div className="bg-slate-800 p-3 rounded">
        <MDPreview
          source={asText(md)}
          style={{ backgroundColor: 'transparent', color: '#e5e7eb' }}
        />
      </div>
    )
  }

  // DataFrame results get a Table/Bar/Line switcher.
  const dfPayload = output.data?.[DF_MIME]
  if (isDataFrame(dfPayload) && (output.output_type === 'execute_result' || output.output_type === 'display_data')) {
    return <DataFrameView df={dfPayload} html={asText(output.data?.['text/html'])} />
  }

  switch (output.output_type) {
    case 'stream':
      return (
        <pre className="bg-slate-800 p-3 rounded text-sm text-gray-300 overflow-x-auto font-mono">
          {Array.isArray(output.text) ? output.text.join('') : output.text}
        </pre>
      )
    case 'execute_result':
      return (
        <div className="bg-slate-800 p-3 rounded text-sm text-gray-300">
          {output.data?.['text/plain'] && (
            <pre className="font-mono overflow-x-auto">
              {asText(output.data['text/plain'])}
            </pre>
          )}
          {output.data?.['text/html'] && (
            <div
              className="viz-container"
              dangerouslySetInnerHTML={{ __html: asText(output.data['text/html']) }}
            />
          )}
        </div>
      )
    case 'display_data':
      return (
        <div className="bg-slate-800 p-3 rounded">
          {output.data?.['image/png'] && (
            <img
              src={`data:image/png;base64,${asText(output.data['image/png'])}`}
              alt="output"
              className="viz-container max-w-full h-auto rounded"
              style={{ imageRendering: 'crisp-edges' }}
            />
          )}
          {output.data?.['text/html'] && (
            <div
              className="viz-container"
              dangerouslySetInnerHTML={{ __html: asText(output.data['text/html']) }}
            />
          )}
          {output.data?.['application/json'] && (
            <pre className="font-mono text-xs overflow-x-auto text-gray-300">
              {JSON.stringify(output.data['application/json'], null, 2)}
            </pre>
          )}
        </div>
      )
    case 'error':
      return <ErrorOutput output={output} />
    default:
      return null
  }
}
