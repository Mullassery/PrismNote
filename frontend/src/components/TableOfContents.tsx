import { useMemo } from 'react'
import { List } from 'lucide-react'

interface TOCItem {
  level: number        // 1-6 (# to ######)
  title: string
  cellIndex: number
  id: string
}

function parseTOC(cells: any[]): TOCItem[] {
  const toc: TOCItem[] = []

  cells.forEach((cell, idx) => {
    if (cell.cell_type !== 'markdown') return

    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source
    const lines = source.split('\n')

    lines.forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const title = match[2].trim()
        toc.push({
          level,
          title,
          cellIndex: idx,
          id: `${idx}-${title}`
        })
      }
    })
  })

  return toc
}

interface TableOfContentsProps {
  cells?: any[]
}

export default function TableOfContents({ cells = [] }: TableOfContentsProps) {
  const toc = useMemo(() => parseTOC(cells), [cells])

  const scrollToCell = (cellIndex: number) => {
    const element = document.querySelector(`[data-cell-index="${cellIndex}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="border-t pn-bd pt-2">
      <div className="px-2 py-1 flex items-center gap-2 text-xs pn-faint font-semibold">
        <List size={14} />
        Contents
      </div>

      {toc.length === 0 ? (
        <div className="text-xs pn-faint text-center py-4 px-2">
          Add markdown headers to build TOC
        </div>
      ) : (
        <nav className="space-y-0 max-h-64 overflow-y-auto">
          {toc.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToCell(item.cellIndex)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 rounded pn-text transition truncate"
              style={{ paddingLeft: `${12 + item.level * 12}px` }}
              title={item.title}
            >
              {item.title}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
