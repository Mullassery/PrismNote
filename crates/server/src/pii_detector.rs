use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PiiMatch {
    pub pii_type: String,
    pub confidence: f64,
    pub sample_value: String,
    pub column_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PiiDetectionResult {
    pub column_name: String,
    pub data_type: String,
    pub pii_detected: bool,
    pub matches: Vec<PiiMatch>,
    pub risk_score: f64, // 0.0-1.0
}

pub struct PiiDetector {
    patterns: HashMap<String, PatternMatcher>,
}

struct PatternMatcher {
    name: String,
    regex: Regex,
    confidence: f64,
}

impl PiiDetector {
    pub fn new() -> Self {
        let patterns = HashMap::from([
            (
                "email".to_string(),
                PatternMatcher {
                    name: "Email Address".to_string(),
                    regex: Regex::new(
                        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
                    )
                    .unwrap(),
                    confidence: 0.95,
                },
            ),
            (
                "phone".to_string(),
                PatternMatcher {
                    name: "Phone Number".to_string(),
                    regex: Regex::new(
                        r"(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}",
                    )
                    .unwrap(),
                    confidence: 0.85,
                },
            ),
            (
                "ssn".to_string(),
                PatternMatcher {
                    name: "Social Security Number".to_string(),
                    regex: Regex::new(r"\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0{4})\d{4}\b")
                        .unwrap(),
                    confidence: 0.98,
                },
            ),
            (
                "credit_card".to_string(),
                PatternMatcher {
                    name: "Credit Card".to_string(),
                    regex: Regex::new(r"\b(?:\d[ -]*?){13,16}\b").unwrap(),
                    confidence: 0.80,
                },
            ),
            (
                "ip_address".to_string(),
                PatternMatcher {
                    name: "IP Address".to_string(),
                    regex: Regex::new(
                        r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b",
                    )
                    .unwrap(),
                    confidence: 0.85,
                },
            ),
        ]);

        PiiDetector { patterns }
    }

    pub fn detect_in_column(
        &self,
        column_name: &str,
        data_type: &str,
        samples: &[String],
    ) -> PiiDetectionResult {
        let mut matches = Vec::new();
        let mut max_confidence = 0.0;

        // Check column name heuristics
        let lower_name = column_name.to_lowercase();
        if lower_name.contains("email")
            || lower_name.contains("mail")
            || lower_name.contains("ssn")
            || lower_name.contains("social")
            || lower_name.contains("phone")
            || lower_name.contains("password")
            || lower_name.contains("card")
            || lower_name.contains("credit")
        {
            max_confidence = 0.7_f64; // Name-based detection
        }

        // Check data type heuristics
        if data_type.to_lowercase().contains("uuid")
            || data_type.to_lowercase().contains("varchar(11)")
        {
            max_confidence = max_confidence.max(0.6_f64);
        }

        // Check sample values
        for sample in samples {
            if sample.is_empty() {
                continue;
            }

            for (key, matcher) in &self.patterns {
                if matcher.regex.is_match(sample) {
                    matches.push(PiiMatch {
                        pii_type: matcher.name.clone(),
                        confidence: matcher.confidence,
                        sample_value: sample.clone(),
                        column_name: column_name.to_string(),
                    });
                    max_confidence = max_confidence.max(matcher.confidence);
                }
            }
        }

        let pii_detected = max_confidence > 0.7;

        PiiDetectionResult {
            column_name: column_name.to_string(),
            data_type: data_type.to_string(),
            pii_detected,
            matches,
            risk_score: max_confidence,
        }
    }

    pub fn detect_batch(
        &self,
        columns: Vec<(String, String, Vec<String>)>,
    ) -> Vec<PiiDetectionResult> {
        columns
            .into_iter()
            .map(|(name, dtype, samples)| self.detect_in_column(&name, &dtype, &samples))
            .collect()
    }
}

impl Default for PiiDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_detection() {
        let detector = PiiDetector::new();
        let result = detector.detect_in_column(
            "user_email",
            "varchar",
            &["john.doe@example.com".to_string()],
        );
        assert!(result.pii_detected);
        assert!(result.matches.len() > 0);
    }

    #[test]
    fn test_ssn_detection() {
        let detector = PiiDetector::new();
        let result = detector.detect_in_column("ssn", "varchar", &["123-45-6789".to_string()]);
        assert!(result.pii_detected);
    }
}
