use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssertionResult {
    pub assertion_id: String,
    pub assertion_name: String,
    pub passed: bool,
    pub failed_count: i64,
    pub total_count: i64,
    pub failure_percentage: f64,
    pub executed_at: DateTime<Utc>,
    pub duration_ms: i64,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssertionType {
    NotNull,
    Unique,
    Positive,
    InRange,
    Pattern,
    Relationship,
    Freshness,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityAssertion {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub assertion_type: AssertionType,
    pub sql_rule: String,
    pub severity: String, // warning, error, critical
    pub enabled: bool,
    pub owner: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct AssertionEngine;

impl AssertionEngine {
    pub fn create_assertion(
        name: &str,
        assertion_type: AssertionType,
        sql_rule: &str,
    ) -> QualityAssertion {
        QualityAssertion {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            description: None,
            assertion_type,
            sql_rule: sql_rule.to_string(),
            severity: "error".to_string(),
            enabled: true,
            owner: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    pub fn create_not_null_assertion(column: &str, table: &str) -> QualityAssertion {
        let sql = format!(
            "SELECT COUNT(*) as failures FROM {} WHERE {} IS NULL",
            table, column
        );
        Self::create_assertion(&format!("{} is NOT NULL", column), AssertionType::NotNull, &sql)
    }

    pub fn create_unique_assertion(column: &str, table: &str) -> QualityAssertion {
        let sql = format!(
            "SELECT COUNT(*) as failures FROM {} GROUP BY {} HAVING COUNT(*) > 1",
            table, column
        );
        Self::create_assertion(
            &format!("{} is UNIQUE", column),
            AssertionType::Unique,
            &sql,
        )
    }

    pub fn create_positive_assertion(column: &str, table: &str) -> QualityAssertion {
        let sql = format!("SELECT COUNT(*) as failures FROM {} WHERE {} <= 0", table, column);
        Self::create_assertion(
            &format!("{} values are positive", column),
            AssertionType::Positive,
            &sql,
        )
    }

    pub fn create_range_assertion(
        column: &str,
        table: &str,
        min: f64,
        max: f64,
    ) -> QualityAssertion {
        let sql = format!(
            "SELECT COUNT(*) as failures FROM {} WHERE {} < {} OR {} > {}",
            table, column, min, column, max
        );
        Self::create_assertion(
            &format!("{} is in range [{}, {}]", column, min, max),
            AssertionType::InRange,
            &sql,
        )
    }

    pub fn create_pattern_assertion(
        column: &str,
        table: &str,
        pattern: &str,
    ) -> QualityAssertion {
        let sql = format!(
            "SELECT COUNT(*) as failures FROM {} WHERE {} NOT REGEXP '{}'",
            table, column, pattern
        );
        Self::create_assertion(
            &format!("{} matches pattern '{}'", column, pattern),
            AssertionType::Pattern,
            &sql,
        )
    }

    pub fn create_freshness_assertion(
        column: &str,
        table: &str,
        max_age_hours: i32,
    ) -> QualityAssertion {
        let sql = format!(
            "SELECT COUNT(*) as failures FROM {} WHERE {} < NOW() - INTERVAL {} HOUR",
            table, column, max_age_hours
        );
        Self::create_assertion(
            &format!("{} data is fresh (< {} hours)", column, max_age_hours),
            AssertionType::Freshness,
            &sql,
        )
    }

    pub fn parse_assertion_result(
        assertion: &QualityAssertion,
        query_result: Option<i64>,
    ) -> AssertionResult {
        let failed_count = query_result.unwrap_or(0);
        let total_count = 1000; // TODO: get actual total from query context
        let failure_percentage = (failed_count as f64 / total_count as f64) * 100.0;

        let passed = match assertion.severity.as_str() {
            "critical" => failed_count == 0,
            "error" => failed_count == 0,
            "warning" => failure_percentage < 5.0, // Warn if > 5% fail
            _ => true,
        };

        AssertionResult {
            assertion_id: assertion.id.clone(),
            assertion_name: assertion.name.clone(),
            passed,
            failed_count,
            total_count,
            failure_percentage,
            executed_at: Utc::now(),
            duration_ms: 0,
            error_message: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityReport {
    pub table_id: String,
    pub total_assertions: usize,
    pub passed_assertions: usize,
    pub failed_assertions: usize,
    pub warning_assertions: usize,
    pub overall_quality_score: f64, // 0-100
    pub results: Vec<AssertionResult>,
    pub generated_at: DateTime<Utc>,
}

impl QualityReport {
    pub fn calculate_score(results: &[AssertionResult]) -> f64 {
        if results.is_empty() {
            return 100.0;
        }

        let passed = results.iter().filter(|r| r.passed).count() as f64;
        let total = results.len() as f64;
        (passed / total) * 100.0
    }
}
