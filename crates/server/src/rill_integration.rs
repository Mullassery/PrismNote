use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Rill Data project configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RillProject {
    pub project_id: String,
    pub notebook_id: String,
    pub name: String,
    pub description: Option<String>,
    pub rill_repo_url: Option<String>, // Git URL for Rill Data project
    pub dashboards: Vec<RillDashboard>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RillDashboard {
    pub dashboard_id: String,
    pub name: String,
    pub title: String,
    pub description: Option<String>,
    pub source_data: String, // Table or query name in notebook
    pub tiles: Vec<RillTile>,
    pub filters: Vec<RillFilter>,
    pub refresh_interval: Option<i32>, // seconds
    pub is_public: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RillTile {
    pub tile_id: String,
    pub title: String,
    pub visualization_type: VisualizationType,
    pub dimensions: Vec<String>,     // Column names for grouping
    pub measures: Vec<MeasureConfig>, // Aggregations
    pub filters: Vec<String>,
    pub position: TilePosition,
    pub refresh_interval: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VisualizationType {
    Table,
    BarChart,
    LineChart,
    ScatterPlot,
    PieChart,
    AreaChart,
    Heatmap,
    GeoMap,
    MetricCard,
    Gauge,
    Funnel,
    Sankey,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeasureConfig {
    pub name: String,
    pub column: String,
    pub aggregation: AggregationType, // SUM, AVG, COUNT, MIN, MAX, etc.
    pub format: Option<String>,       // Number format
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum AggregationType {
    Sum,
    Avg,
    Count,
    Min,
    Max,
    Stddev,
    Variance,
    Distinct,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TilePosition {
    pub x: i32,
    pub y: i32,
    pub width: i32,  // Grid units
    pub height: i32, // Grid units
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RillFilter {
    pub filter_id: String,
    pub column: String,
    pub filter_type: FilterType,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FilterType {
    Dropdown,
    Range,
    Date,
    Search,
    Checkbox,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RillDataSource {
    pub source_id: String,
    pub name: String,
    pub source_type: DataSourceType,
    pub duckdb_query: String, // SQL query for DuckDB
    pub notebook_table: Option<String>, // Reference to notebook variable/table
    pub refresh_interval: Option<i32>,
    pub is_cached: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DataSourceType {
    DuckdbQuery,
    NotebookVariable,
    ParquetFile,
    CsvFile,
}

/// Rill configuration for PrismNote
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RillConfig {
    pub enabled: bool,
    pub rill_local_path: Option<String>, // Path to local Rill Data installation
    pub rill_server_url: Option<String>, // URL if using hosted Rill
    pub auto_generate_dashboards: bool,  // Auto-create dashboards from notebooks
    pub default_refresh_interval: i32,   // seconds
}

pub struct RillProjectManager {
    projects: HashMap<String, RillProject>,
    config: RillConfig,
}

impl RillProjectManager {
    pub fn new(config: RillConfig) -> Self {
        RillProjectManager {
            projects: HashMap::new(),
            config,
        }
    }

    pub fn create_project(
        &mut self,
        notebook_id: &str,
        name: &str,
    ) -> RillProject {
        let project_id = Uuid::new_v4().to_string();
        let project = RillProject {
            project_id: project_id.clone(),
            notebook_id: notebook_id.to_string(),
            name: name.to_string(),
            description: None,
            rill_repo_url: None,
            dashboards: Vec::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        self.projects.insert(project_id, project.clone());
        project
    }

    pub fn add_dashboard(
        &mut self,
        project_id: &str,
        dashboard: RillDashboard,
    ) -> bool {
        if let Some(project) = self.projects.get_mut(project_id) {
            project.dashboards.push(dashboard);
            project.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn add_tile(
        &mut self,
        project_id: &str,
        dashboard_id: &str,
        tile: RillTile,
    ) -> bool {
        if let Some(project) = self.projects.get_mut(project_id) {
            if let Some(dashboard) = project
                .dashboards
                .iter_mut()
                .find(|d| d.dashboard_id == dashboard_id)
            {
                dashboard.tiles.push(tile);
                project.updated_at = Utc::now();
                return true;
            }
        }
        false
    }

    pub fn get_project(&self, project_id: &str) -> Option<RillProject> {
        self.projects.get(project_id).cloned()
    }

    pub fn list_projects_by_notebook(&self, notebook_id: &str) -> Vec<RillProject> {
        self.projects
            .values()
            .filter(|p| p.notebook_id == notebook_id)
            .cloned()
            .collect()
    }

    pub fn generate_rill_config(&self, project: &RillProject) -> String {
        // Generate YAML config for Rill Data project
        let mut config = String::from("# Rill Data Project Configuration\n");
        config.push_str(&format!("project_name: {}\n", project.name));
        config.push_str(&format!("# Auto-generated for notebook: {}\n", project.notebook_id));
        config.push_str("version: 1\n\n");

        config.push_str("sources:\n");
        for dashboard in &project.dashboards {
            config.push_str(&format!("  - name: {}\n", dashboard.source_data));
            config.push_str(&format!("    sql: \"SELECT * FROM {}\"\n", dashboard.source_data));
        }

        config.push_str("\ndashboards:\n");
        for dashboard in &project.dashboards {
            config.push_str(&format!("  - name: {}\n", dashboard.dashboard_id));
            config.push_str(&format!("    title: \"{}\"\n", dashboard.title));
            if let Some(desc) = &dashboard.description {
                config.push_str(&format!("    description: \"{}\"\n", desc));
            }
        }

        config
    }

    pub fn export_to_rill_format(&self, project: &RillProject) -> serde_json::Value {
        serde_json::json!({
            "project": {
                "name": project.name,
                "description": project.description,
                "dashboards": project.dashboards.iter().map(|d| {
                    serde_json::json!({
                        "id": d.dashboard_id,
                        "name": d.name,
                        "title": d.title,
                        "source": d.source_data,
                        "tiles": d.tiles.iter().map(|t| {
                            serde_json::json!({
                                "id": t.tile_id,
                                "title": t.title,
                                "visualization": format!("{:?}", t.visualization_type).to_lowercase(),
                                "dimensions": t.dimensions,
                                "measures": t.measures.iter().map(|m| {
                                    serde_json::json!({
                                        "name": m.name,
                                        "column": m.column,
                                        "aggregation": format!("{:?}", m.aggregation).to_uppercase()
                                    })
                                }).collect::<Vec<_>>(),
                                "position": {
                                    "x": t.position.x,
                                    "y": t.position.y,
                                    "width": t.position.width,
                                    "height": t.position.height
                                }
                            })
                        }).collect::<Vec<_>>()
                    })
                }).collect::<Vec<_>>()
            }
        })
    }
}

impl Default for RillConfig {
    fn default() -> Self {
        RillConfig {
            enabled: true,
            rill_local_path: None,
            rill_server_url: None,
            auto_generate_dashboards: true,
            default_refresh_interval: 300, // 5 minutes
        }
    }
}
