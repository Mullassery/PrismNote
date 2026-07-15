use serde::{Deserialize, Serialize};

/// SQL schema information for autocomplete
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaInfo {
    pub tables: Vec<TableSchema>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableSchema {
    pub name: String,
    pub columns: Vec<ColumnSchema>,
    pub row_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnSchema {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
}

/// Autocomplete suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionSuggestion {
    pub label: String,
    pub kind: String, // "keyword" | "table" | "column" | "function"
    pub detail: Option<String>,
    pub documentation: Option<String>,
    pub sort_text: Option<String>,
}

/// Get database schema from DuckDB
pub async fn get_database_schema() -> anyhow::Result<SchemaInfo> {
    // DuckDB query to get schema information
    let query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'";

    // For now, return an empty schema that can be populated by real DuckDB queries
    // This will be integrated with actual DuckDB connection later
    Ok(SchemaInfo {
        tables: vec![],
    })
}

/// Generate autocomplete suggestions from schema
pub fn generate_suggestions(schema: &SchemaInfo, prefix: &str) -> Vec<CompletionSuggestion> {
    let mut suggestions = Vec::new();

    // Add SQL keywords
    let keywords = vec![
        ("SELECT", "SQL keyword"),
        ("FROM", "SQL keyword"),
        ("WHERE", "SQL keyword"),
        ("JOIN", "SQL keyword"),
        ("LEFT JOIN", "SQL keyword"),
        ("INNER JOIN", "SQL keyword"),
        ("ORDER BY", "SQL keyword"),
        ("GROUP BY", "SQL keyword"),
        ("HAVING", "SQL keyword"),
        ("LIMIT", "SQL keyword"),
        ("OFFSET", "SQL keyword"),
        ("UNION", "SQL keyword"),
        ("INSERT INTO", "SQL keyword"),
        ("UPDATE", "SQL keyword"),
        ("DELETE FROM", "SQL keyword"),
        ("CREATE TABLE", "SQL keyword"),
        ("DROP TABLE", "SQL keyword"),
        ("ALTER TABLE", "SQL keyword"),
        ("AS", "SQL keyword"),
        ("ON", "SQL keyword"),
        ("AND", "SQL keyword"),
        ("OR", "SQL keyword"),
        ("NOT", "SQL keyword"),
        ("IN", "SQL keyword"),
        ("EXISTS", "SQL keyword"),
        ("CASE", "SQL keyword"),
        ("WHEN", "SQL keyword"),
        ("THEN", "SQL keyword"),
        ("ELSE", "SQL keyword"),
        ("END", "SQL keyword"),
        ("DISTINCT", "SQL keyword"),
        ("CAST", "SQL keyword"),
    ];

    for (keyword, detail) in keywords {
        if keyword.to_lowercase().starts_with(&prefix.to_lowercase()) {
            suggestions.push(CompletionSuggestion {
                label: keyword.to_string(),
                kind: "keyword".to_string(),
                detail: Some(detail.to_string()),
                documentation: None,
                sort_text: Some(format!("0_{}", keyword)), // Sort keywords first
            });
        }
    }

    // Add functions
    let functions = vec![
        ("COUNT", "Aggregate function", "COUNT(column)"),
        ("SUM", "Aggregate function", "SUM(column)"),
        ("AVG", "Aggregate function", "AVG(column)"),
        ("MIN", "Aggregate function", "MIN(column)"),
        ("MAX", "Aggregate function", "MAX(column)"),
        ("COUNT DISTINCT", "Aggregate function", "COUNT(DISTINCT column)"),
        ("COALESCE", "Scalar function", "COALESCE(value1, value2, ...)"),
        ("UPPER", "String function", "UPPER(string)"),
        ("LOWER", "String function", "LOWER(string)"),
        ("LENGTH", "String function", "LENGTH(string)"),
        ("SUBSTRING", "String function", "SUBSTRING(string, start, length)"),
        ("TRIM", "String function", "TRIM(string)"),
        ("REPLACE", "String function", "REPLACE(string, from, to)"),
        ("ROUND", "Math function", "ROUND(number, decimals)"),
        ("ABS", "Math function", "ABS(number)"),
        ("CEIL", "Math function", "CEIL(number)"),
        ("FLOOR", "Math function", "FLOOR(number)"),
        ("DATE", "Date function", "DATE(value)"),
        ("NOW", "Date function", "NOW()"),
        ("EXTRACT", "Date function", "EXTRACT(unit FROM date)"),
    ];

    for (func, kind, doc) in functions {
        if func.to_lowercase().starts_with(&prefix.to_lowercase()) {
            suggestions.push(CompletionSuggestion {
                label: func.to_string(),
                kind: "function".to_string(),
                detail: Some(kind.to_string()),
                documentation: Some(doc.to_string()),
                sort_text: Some(format!("1_{}", func)), // Sort functions second
            });
        }
    }

    // Add tables from schema
    for table in &schema.tables {
        if table.name.to_lowercase().starts_with(&prefix.to_lowercase()) {
            suggestions.push(CompletionSuggestion {
                label: table.name.clone(),
                kind: "table".to_string(),
                detail: Some(format!("{} rows", table.row_count.unwrap_or(0))),
                documentation: None,
                sort_text: Some(format!("2_{}", table.name)), // Sort tables third
            });
        }
    }

    // Add columns (when prefix includes a table)
    if prefix.contains('.') {
        let parts: Vec<&str> = prefix.split('.').collect();
        if parts.len() == 2 {
            let table_name = parts[0];
            let col_prefix = parts[1].to_lowercase();

            if let Some(table) = schema.tables.iter().find(|t| t.name.eq_ignore_ascii_case(table_name)) {
                for col in &table.columns {
                    if col.name.to_lowercase().starts_with(&col_prefix) {
                        suggestions.push(CompletionSuggestion {
                            label: col.name.clone(),
                            kind: "column".to_string(),
                            detail: Some(col.data_type.clone()),
                            documentation: None,
                            sort_text: Some(format!("3_{}", col.name)), // Sort columns last
                        });
                    }
                }
            }
        }
    }

    // Sort by sort_text
    suggestions.sort_by(|a, b| {
        let a_sort = a.sort_text.as_ref().unwrap_or(&a.label);
        let b_sort = b.sort_text.as_ref().unwrap_or(&b.label);
        a_sort.cmp(b_sort)
    });

    suggestions
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keyword_suggestions() {
        let schema = SchemaInfo { tables: vec![] };
        let suggestions = generate_suggestions(&schema, "SEL");

        assert!(suggestions.iter().any(|s| s.label == "SELECT"));
        assert!(suggestions.iter().all(|s| s.kind == "keyword"));
    }

    #[test]
    fn test_function_suggestions() {
        let schema = SchemaInfo { tables: vec![] };
        let suggestions = generate_suggestions(&schema, "CO");

        assert!(suggestions.iter().any(|s| s.label == "COUNT"));
        assert!(suggestions.iter().any(|s| s.label == "COALESCE"));
    }

    #[test]
    fn test_case_insensitive() {
        let schema = SchemaInfo { tables: vec![] };
        let suggestions_upper = generate_suggestions(&schema, "SEL");
        let suggestions_lower = generate_suggestions(&schema, "sel");

        assert_eq!(suggestions_upper.len(), suggestions_lower.len());
    }

    #[test]
    fn test_suggestions_sorted() {
        let schema = SchemaInfo { tables: vec![] };
        let suggestions = generate_suggestions(&schema, "");

        // Check that keywords come before functions
        let mut last_sort = String::new();
        for suggestion in suggestions {
            if let Some(sort) = &suggestion.sort_text {
                assert!(sort >= &last_sort);
                last_sort = sort.clone();
            }
        }
    }
}
