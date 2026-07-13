use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnMetadata {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub description: Option<String>,
    pub sample_values: Vec<String>,
    pub stats: Option<ColumnStats>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnStats {
    pub null_count: i64,
    pub distinct_count: i64,
    pub min_value: Option<String>,
    pub max_value: Option<String>,
    pub avg_length: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableMetadata {
    pub table_id: String,
    pub name: String,
    pub source_type: String, // 'variable', 'file', 'query', 'warehouse'
    pub row_count: i64,
    pub columns: Vec<ColumnMetadata>,
    pub created_at: DateTime<Utc>,
    pub last_accessed: DateTime<Utc>,
    pub size_bytes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogEntry {
    pub catalog_id: String,
    pub notebook_id: String,
    pub user_id: String,
    pub table_metadata: TableMetadata,
    pub tags: Vec<String>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataCatalog {
    entries: HashMap<String, CatalogEntry>,
}

impl DataCatalog {
    pub fn new() -> Self {
        DataCatalog {
            entries: HashMap::new(),
        }
    }

    pub fn register_table(
        &mut self,
        notebook_id: &str,
        user_id: &str,
        table_metadata: TableMetadata,
        tags: Vec<String>,
    ) -> CatalogEntry {
        let catalog_id = Uuid::new_v4().to_string();
        let entry = CatalogEntry {
            catalog_id: catalog_id.clone(),
            notebook_id: notebook_id.to_string(),
            user_id: user_id.to_string(),
            table_metadata,
            tags,
            description: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        self.entries.insert(catalog_id, entry.clone());
        entry
    }

    pub fn get_entry(&self, catalog_id: &str) -> Option<CatalogEntry> {
        self.entries.get(catalog_id).cloned()
    }

    pub fn list_by_notebook(&self, notebook_id: &str) -> Vec<CatalogEntry> {
        self.entries
            .values()
            .filter(|e| e.notebook_id == notebook_id)
            .cloned()
            .collect()
    }

    pub fn search_by_name(&self, query: &str) -> Vec<CatalogEntry> {
        let q = query.to_lowercase();
        self.entries
            .values()
            .filter(|e| e.table_metadata.name.to_lowercase().contains(&q))
            .cloned()
            .collect()
    }

    pub fn search_by_column(&self, column_name: &str) -> Vec<CatalogEntry> {
        let col = column_name.to_lowercase();
        self.entries
            .values()
            .filter(|e| {
                e.table_metadata
                    .columns
                    .iter()
                    .any(|c| c.name.to_lowercase().contains(&col))
            })
            .cloned()
            .collect()
    }

    pub fn update_description(&mut self, catalog_id: &str, description: String) -> bool {
        if let Some(entry) = self.entries.get_mut(catalog_id) {
            entry.description = Some(description);
            entry.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn add_tags(&mut self, catalog_id: &str, new_tags: Vec<String>) -> bool {
        if let Some(entry) = self.entries.get_mut(catalog_id) {
            entry.tags.extend(new_tags);
            entry.tags.sort();
            entry.tags.dedup();
            entry.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn remove_tag(&mut self, catalog_id: &str, tag: &str) -> bool {
        if let Some(entry) = self.entries.get_mut(catalog_id) {
            entry.tags.retain(|t| t != tag);
            entry.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn get_all_tags(&self) -> Vec<String> {
        let mut tags = self
            .entries
            .values()
            .flat_map(|e| e.tags.clone())
            .collect::<Vec<_>>();
        tags.sort();
        tags.dedup();
        tags
    }
}
