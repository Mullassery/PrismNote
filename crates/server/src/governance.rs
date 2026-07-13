use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SensitivityLevel {
    Public,
    Internal,
    Confidential,
    Restricted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PiiCategory {
    Email,
    Phone,
    SocialSecurityNumber,
    CreditCard,
    BankAccount,
    Address,
    Name,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceTag {
    pub tag_id: String,
    pub name: String,
    pub value: String,
    pub category: String, // 'sensitivity', 'pii', 'owner', 'quality', 'compliance'
    pub created_by: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityAssertion {
    pub assertion_id: String,
    pub name: String,
    pub description: Option<String>,
    pub rule: String, // SQL or expression to validate
    pub severity: String, // 'warning', 'error', 'critical'
    pub enabled: bool,
    pub last_checked: Option<DateTime<Utc>>,
    pub last_result: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnGovernance {
    pub column_id: String,
    pub table_id: String,
    pub sensitivity: SensitivityLevel,
    pub pii_categories: Vec<PiiCategory>,
    pub tags: Vec<GovernanceTag>,
    pub quality_assertions: Vec<QualityAssertion>,
    pub owner: Option<String>,
    pub owner_email: Option<String>,
    pub masking_required: bool,
    pub encryption_required: bool,
    pub retention_days: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernancePolicy {
    pub policy_id: String,
    pub name: String,
    pub description: Option<String>,
    pub rules: Vec<PolicyRule>,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRule {
    pub rule_id: String,
    pub description: String,
    pub condition: String, // pattern matching for tag/sensitivity combinations
    pub action: String,    // 'mask', 'encrypt', 'audit', 'deny'
}

pub struct GovernanceManager {
    column_policies: HashMap<String, ColumnGovernance>,
    policies: HashMap<String, GovernancePolicy>,
}

impl GovernanceManager {
    pub fn new() -> Self {
        GovernanceManager {
            column_policies: HashMap::new(),
            policies: HashMap::new(),
        }
    }

    pub fn set_column_governance(&mut self, column_id: String, governance: ColumnGovernance) {
        self.column_policies.insert(column_id, governance);
    }

    pub fn get_column_governance(&self, column_id: &str) -> Option<ColumnGovernance> {
        self.column_policies.get(column_id).cloned()
    }

    pub fn add_pii_tag(&mut self, column_id: &str, category: PiiCategory) -> bool {
        if let Some(gov) = self.column_policies.get_mut(column_id) {
            gov.pii_categories.push(category);
            gov.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn set_sensitivity(&mut self, column_id: &str, level: SensitivityLevel) -> bool {
        if let Some(gov) = self.column_policies.get_mut(column_id) {
            gov.sensitivity = level;
            gov.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn add_quality_assertion(
        &mut self,
        column_id: &str,
        assertion: QualityAssertion,
    ) -> bool {
        if let Some(gov) = self.column_policies.get_mut(column_id) {
            gov.quality_assertions.push(assertion);
            gov.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn add_governance_tag(&mut self, column_id: &str, tag: GovernanceTag) -> bool {
        if let Some(gov) = self.column_policies.get_mut(column_id) {
            gov.tags.push(tag);
            gov.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn get_columns_by_sensitivity(&self, level: &SensitivityLevel) -> Vec<ColumnGovernance> {
        self.column_policies
            .values()
            .filter(|c| std::mem::discriminant(&c.sensitivity) == std::mem::discriminant(level))
            .cloned()
            .collect()
    }

    pub fn get_pii_columns(&self) -> Vec<ColumnGovernance> {
        self.column_policies
            .values()
            .filter(|c| !c.pii_categories.is_empty())
            .cloned()
            .collect()
    }

    pub fn add_policy(&mut self, policy: GovernancePolicy) {
        self.policies
            .insert(policy.policy_id.clone(), policy);
    }

    pub fn get_policy(&self, policy_id: &str) -> Option<GovernancePolicy> {
        self.policies.get(policy_id).cloned()
    }

    pub fn check_compliance(&self, column_id: &str) -> Vec<PolicyViolation> {
        let mut violations = Vec::new();

        if let Some(gov) = self.column_policies.get(column_id) {
            // Check retention policies
            if let Some(retention) = gov.retention_days {
                if retention < 30 {
                    violations.push(PolicyViolation {
                        violation_id: uuid::Uuid::new_v4().to_string(),
                        policy_id: "retention".to_string(),
                        severity: "warning".to_string(),
                        message: format!("Data retention policy: {} days may be too short", retention),
                    });
                }
            }

            // Check encryption requirements for sensitive data
            if matches!(gov.sensitivity, SensitivityLevel::Restricted) && !gov.encryption_required {
                violations.push(PolicyViolation {
                    violation_id: uuid::Uuid::new_v4().to_string(),
                    policy_id: "encryption".to_string(),
                    severity: "error".to_string(),
                    message: "Restricted data must require encryption".to_string(),
                });
            }
        }

        violations
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyViolation {
    pub violation_id: String,
    pub policy_id: String,
    pub severity: String,
    pub message: String,
}

impl Default for GovernanceManager {
    fn default() -> Self {
        Self::new()
    }
}
