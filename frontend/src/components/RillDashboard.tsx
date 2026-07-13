import { useEffect, useState } from 'react'
import { Plus, Share2, Download, Settings, Loader, AlertCircle } from 'lucide-react'

interface RillProject {
  project_id: string
  notebook_id: string
  name: string
  description?: string
  dashboards: RillDashboard[]
  created_at: string
}

interface RillDashboard {
  dashboard_id: string
  name: string
  title: string
  source_data: string
  tiles: RillTile[]
  is_public: boolean
}

interface RillTile {
  tile_id: string
  title: string
  visualization_type: string
  dimensions: string[]
  measures: Array<{ name: string; column: string; aggregation: string }>
  position: { x: number; y: number; width: number; height: number }
}

interface RillDashboardProps {
  notebookId: string
  dataSource?: string
  onClose: () => void
}

export default function RillDashboard({ notebookId, dataSource, onClose }: RillDashboardProps) {
  const [projects, setProjects] = useState<RillProject[]>([])
  const [selectedProject, setSelectedProject] = useState<RillProject | null>(null)
  const [selectedDashboard, setSelectedDashboard] = useState<RillDashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [rillServerUrl, setRillServerUrl] = useState('http://localhost:3100')

  useEffect(() => {
    fetchProjects()
  }, [notebookId])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/rill/projects?notebook_id=${notebookId}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch Rill projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/rill/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebook_id: notebookId,
          name: `Dashboard ${new Date().toLocaleDateString()}`,
          description: 'Auto-generated from PrismNote',
        }),
      })
      if (response.ok) {
        const project = await response.json()
        setProjects([...projects, project])
        setSelectedProject(project)
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setCreating(false)
    }
  }

  const createDashboard = async () => {
    if (!selectedProject) return

    try {
      const response = await fetch('/api/rill/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.project_id,
          name: `dashboard_${Date.now()}`,
          title: 'New Dashboard',
          source_data: dataSource || 'data',
        }),
      })
      if (response.ok) {
        const dashboard = await response.json()
        setSelectedProject({
          ...selectedProject,
          dashboards: [...selectedProject.dashboards, dashboard],
        })
      }
    } catch (error) {
      console.error('Failed to create dashboard:', error)
    }
  }

  const exportProject = async () => {
    if (!selectedProject) return

    try {
      const response = await fetch(`/api/rill/projects/${selectedProject.project_id}/export`)
      if (response.ok) {
        const data = await response.json()
        // Download as YAML file
        const element = document.createElement('a')
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data.content))
        element.setAttribute('download', `${selectedProject.name}.rill.yaml`)
        element.style.display = 'none'
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
      }
    } catch (error) {
      console.error('Failed to export project:', error)
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 border-l pn-bd">
      {/* Header */}
      <div className="p-4 border-b pn-bd">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold pn-text flex items-center gap-2">
            <Share2 size={18} className="text-purple-400" />
            Rill Data Dashboards
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>
        <p className="text-xs pn-faint mb-3">
          Enterprise BI dashboards powered by Rill Data OSS
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={createProject}
            disabled={creating}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-sm font-medium transition disabled:opacity-50"
          >
            <Plus size={14} />
            {creating ? 'Creating...' : 'New Project'}
          </button>
          {selectedProject && (
            <button
              onClick={exportProject}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm font-medium transition"
              title="Export as Rill YAML"
            >
              <Download size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Projects List */}
        <div className="w-64 border-r pn-bd overflow-y-auto">
          {loading ? (
            <div className="p-4 flex items-center justify-center gap-2 text-sm pn-faint">
              <Loader size={14} className="animate-spin" />
              Loading...
            </div>
          ) : projects.length === 0 ? (
            <div className="p-4 text-center text-sm pn-faint">
              No Rill projects yet. Create one to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {projects.map((project) => (
                <button
                  key={project.project_id}
                  onClick={() => {
                    setSelectedProject(project)
                    setSelectedDashboard(null)
                  }}
                  className={`w-full text-left p-3 hover:bg-slate-800/50 transition border-l-2 ${
                    selectedProject?.project_id === project.project_id
                      ? 'border-purple-500 bg-slate-800/30'
                      : 'border-transparent'
                  }`}
                >
                  <div className="font-medium text-sm pn-text truncate">{project.name}</div>
                  <div className="text-[11px] pn-faint mt-1">
                    {project.dashboards.length} dashboard{project.dashboards.length !== 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project Details */}
        {selectedProject ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Dashboards */}
            <div className="border-b pn-bd">
              <div className="p-4">
                <h3 className="font-semibold pn-text mb-3">{selectedProject.name}</h3>
                <button
                  onClick={createDashboard}
                  className="w-full px-3 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  Add Dashboard
                </button>
              </div>
            </div>

            {/* Dashboard List or Viewer */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedDashboard ? (
                <DashboardViewer
                  dashboard={selectedDashboard}
                  rillServerUrl={rillServerUrl}
                  onBack={() => setSelectedDashboard(null)}
                />
              ) : selectedProject.dashboards.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center pn-faint">
                  <div>
                    <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No dashboards in this project</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {selectedProject.dashboards.map((dashboard) => (
                    <button
                      key={dashboard.dashboard_id}
                      onClick={() => setSelectedDashboard(dashboard)}
                      className="p-3 rounded-lg border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/50 transition text-left"
                    >
                      <div className="font-medium text-sm pn-text truncate">{dashboard.title}</div>
                      <div className="text-xs pn-faint mt-1">
                        {dashboard.tiles.length} tiles
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center pn-faint">
            <div className="text-center">
              <Share2 size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a project to view dashboards</p>
            </div>
          </div>
        )}
      </div>

      {/* Rill Server Config */}
      <div className="p-3 border-t pn-bd bg-slate-900/50 text-xs pn-faint space-y-2">
        <div className="flex items-center justify-between">
          <span>Rill Server:</span>
          <input
            type="text"
            value={rillServerUrl}
            onChange={(e) => setRillServerUrl(e.target.value)}
            placeholder="http://localhost:3100"
            className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] pn-text flex-1 ml-2"
          />
        </div>
        <a
          href="https://docs.rilldata.com"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 hover:text-blue-200 inline-block"
        >
          Rill Data Docs →
        </a>
      </div>
    </div>
  )
}

function DashboardViewer({
  dashboard,
  rillServerUrl,
  onBack,
}: {
  dashboard: RillDashboard
  rillServerUrl: string
  onBack: () => void
}) {
  const embedUrl = `${rillServerUrl}/explore?dashboard=${dashboard.dashboard_id}`

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="text-sm pn-text hover:text-blue-300 transition"
      >
        ← Back to dashboards
      </button>

      <div>
        <h4 className="font-semibold pn-text mb-2">{dashboard.title}</h4>
        <p className="text-xs pn-faint mb-3">
          Data source: <span className="font-mono text-blue-300">{dashboard.source_data}</span>
        </p>

        {/* Tiles Grid */}
        {dashboard.tiles.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {dashboard.tiles.map((tile) => (
              <div
                key={tile.tile_id}
                className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
              >
                <div className="font-medium text-sm pn-text">{tile.title}</div>
                <div className="text-xs pn-faint mt-1">
                  {tile.visualization_type} · {tile.dimensions.join(', ')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 text-xs pn-faint">
            No tiles in this dashboard
          </div>
        )}
      </div>

      {/* Embed Info */}
      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs pn-faint space-y-2">
        <div className="font-medium text-purple-300">Embed URL:</div>
        <code className="block bg-slate-900/50 p-2 rounded truncate text-[10px]">
          {embedUrl}
        </code>
        <p className="text-[10px]">
          Use this URL to embed the dashboard in an iframe or external application.
        </p>
      </div>
    </div>
  )
}
