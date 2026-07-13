use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, Hash, Eq, PartialEq)]
pub struct ColumnRef {
    pub table_id: String,
    pub column_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageEdge {
    pub source: ColumnRef,
    pub target: ColumnRef,
    pub operation: String, // 'select', 'transform', 'aggregate', 'join', etc.
    pub cell_id: String,
    pub notebook_id: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnLineage {
    pub column: ColumnRef,
    pub upstream: Vec<ColumnRef>,   // columns this depends on
    pub downstream: Vec<ColumnRef>, // columns that depend on this
    pub operations: Vec<String>,    // transformations applied
    pub data_quality_score: f64,
}

pub struct LineageGraph {
    edges: HashMap<ColumnRef, Vec<LineageEdge>>,
    reverse_edges: HashMap<ColumnRef, Vec<LineageEdge>>,
}

impl LineageGraph {
    pub fn new() -> Self {
        LineageGraph {
            edges: HashMap::new(),
            reverse_edges: HashMap::new(),
        }
    }

    pub fn add_edge(&mut self, edge: LineageEdge) {
        self.edges
            .entry(edge.source.clone())
            .or_insert_with(Vec::new)
            .push(edge.clone());

        self.reverse_edges
            .entry(edge.target.clone())
            .or_insert_with(Vec::new)
            .push(edge);
    }

    pub fn get_lineage(&self, column: &ColumnRef) -> ColumnLineage {
        let mut upstream = HashSet::new();
        let mut operations = Vec::new();

        // Traverse upstream
        if let Some(sources) = self.reverse_edges.get(column) {
            for edge in sources {
                upstream.insert(edge.source.clone());
                operations.push(edge.operation.clone());
            }
        }

        let mut downstream = HashSet::new();

        // Traverse downstream
        if let Some(targets) = self.edges.get(column) {
            for edge in targets {
                downstream.insert(edge.target.clone());
            }
        }

        ColumnLineage {
            column: column.clone(),
            upstream: upstream.into_iter().collect(),
            downstream: downstream.into_iter().collect(),
            operations,
            data_quality_score: 0.95, // TODO: calculate from quality checks
        }
    }

    pub fn find_upstream_chain(&self, column: &ColumnRef) -> Vec<Vec<ColumnRef>> {
        let mut chains = Vec::new();
        let mut visited = HashSet::new();

        fn dfs(
            graph: &LineageGraph,
            current: &ColumnRef,
            path: Vec<ColumnRef>,
            visited: &mut HashSet<ColumnRef>,
            chains: &mut Vec<Vec<ColumnRef>>,
        ) {
            if let Some(sources) = graph.reverse_edges.get(current) {
                for edge in sources {
                    let mut new_path = path.clone();
                    new_path.push(edge.source.clone());

                    if !visited.contains(&edge.source) {
                        visited.insert(edge.source.clone());
                        dfs(graph, &edge.source, new_path.clone(), visited, chains);
                        visited.remove(&edge.source);
                    } else {
                        chains.push(new_path);
                    }
                }
            } else {
                chains.push(path);
            }
        }

        dfs(self, column, vec![column.clone()], &mut visited, &mut chains);
        chains
    }

    pub fn get_impact_analysis(&self, column: &ColumnRef) -> Vec<ColumnRef> {
        let mut impacted = Vec::new();
        let mut visited = HashSet::new();

        fn dfs(
            graph: &LineageGraph,
            current: &ColumnRef,
            visited: &mut HashSet<ColumnRef>,
            impacted: &mut Vec<ColumnRef>,
        ) {
            if let Some(targets) = graph.edges.get(current) {
                for edge in targets {
                    if !visited.contains(&edge.target) {
                        visited.insert(edge.target.clone());
                        impacted.push(edge.target.clone());
                        dfs(graph, &edge.target, visited, impacted);
                    }
                }
            }
        }

        dfs(self, column, &mut visited, &mut impacted);
        impacted
    }
}

impl Default for LineageGraph {
    fn default() -> Self {
        Self::new()
    }
}
