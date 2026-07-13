use chrono::{DateTime, Local, Duration};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Cached query result with metadata
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CachedResult {
    pub query_hash: String,
    pub result: serde_json::Value,
    pub cached_at: String,
    pub ttl_seconds: i64,
    pub size_bytes: usize,
}

impl CachedResult {
    pub fn is_expired(&self) -> bool {
        let cached_time = DateTime::parse_from_rfc3339(&self.cached_at)
            .map(|dt| dt.with_timezone(&Local))
            .unwrap_or_else(|_| Local::now());

        let age = Local::now().signed_duration_since(cached_time);
        age.num_seconds() > self.ttl_seconds
    }
}

/// In-memory query result cache
pub struct QueryCache {
    cache: Arc<Mutex<HashMap<String, CachedResult>>>,
    max_size_mb: usize,
}

impl QueryCache {
    pub fn new(max_size_mb: usize) -> Self {
        QueryCache {
            cache: Arc::new(Mutex::new(HashMap::new())),
            max_size_mb,
        }
    }

    /// Generate deterministic hash for a query
    pub fn hash_query(query: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(query.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Store result in cache
    pub fn put(&self, query: &str, result: serde_json::Value, ttl_seconds: i64) {
        let query_hash = Self::hash_query(query);
        let size_bytes = serde_json::to_string(&result)
            .map(|s| s.len())
            .unwrap_or(0);

        let cached = CachedResult {
            query_hash: query_hash.clone(),
            result,
            cached_at: Local::now().to_rfc3339(),
            ttl_seconds,
            size_bytes,
        };

        if let Ok(mut cache) = self.cache.lock() {
            cache.insert(query_hash, cached);
            self.cleanup_if_needed(&mut cache);
        }
    }

    /// Get result from cache if not expired
    pub fn get(&self, query: &str) -> Option<serde_json::Value> {
        let query_hash = Self::hash_query(query);

        if let Ok(mut cache) = self.cache.lock() {
            if let Some(cached) = cache.get(&query_hash) {
                if !cached.is_expired() {
                    tracing::debug!("Cache hit for query hash: {}", query_hash);
                    return Some(cached.result.clone());
                } else {
                    // Remove expired entry
                    cache.remove(&query_hash);
                }
            }
        }
        None
    }

    /// Invalidate cache for a specific query
    pub fn invalidate(&self, query: &str) {
        let query_hash = Self::hash_query(query);
        if let Ok(mut cache) = self.cache.lock() {
            cache.remove(&query_hash);
            tracing::debug!("Cache invalidated for query hash: {}", query_hash);
        }
    }

    /// Clear all cache
    pub fn clear(&self) {
        if let Ok(mut cache) = self.cache.lock() {
            let count = cache.len();
            cache.clear();
            tracing::info!("Cache cleared, removed {} entries", count);
        }
    }

    /// Get cache statistics
    pub fn stats(&self) -> CacheStats {
        if let Ok(cache) = self.cache.lock() {
            let total_size: usize = cache.values().map(|c| c.size_bytes).sum();
            let entry_count = cache.len();

            CacheStats {
                entry_count,
                total_size_bytes: total_size,
                max_size_bytes: self.max_size_mb * 1024 * 1024,
                utilization_percent: if self.max_size_mb > 0 {
                    ((total_size as f64) / ((self.max_size_mb * 1024 * 1024) as f64) * 100.0) as u32
                } else {
                    0
                },
            }
        } else {
            CacheStats::default()
        }
    }

    /// Remove expired entries if cache exceeds size limit
    fn cleanup_if_needed(&self, cache: &mut HashMap<String, CachedResult>) {
        let total_size: usize = cache.values().map(|c| c.size_bytes).sum();
        let max_bytes = self.max_size_mb * 1024 * 1024;

        if total_size > max_bytes {
            tracing::info!("Cache size limit exceeded ({} > {}), cleaning up", total_size, max_bytes);

            // Remove expired entries first
            cache.retain(|_, cached| !cached.is_expired());

            // If still too large, remove oldest entries
            let mut expired_count = cache.len();
            while cache.values().map(|c| c.size_bytes).sum::<usize>() > max_bytes && !cache.is_empty() {
                if let Some(oldest_key) = cache.keys()
                    .min_by_key(|k| &cache[*k].cached_at)
                    .cloned()
                {
                    cache.remove(&oldest_key);
                }
            }
            tracing::info!("Removed {} entries to fit cache limit", expired_count);
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CacheStats {
    pub entry_count: usize,
    pub total_size_bytes: usize,
    pub max_size_bytes: usize,
    pub utilization_percent: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_hash_consistency() {
        let query1 = "SELECT * FROM users";
        let query2 = "SELECT * FROM users";
        let query3 = "SELECT * FROM posts";

        let hash1 = QueryCache::hash_query(query1);
        let hash2 = QueryCache::hash_query(query2);
        let hash3 = QueryCache::hash_query(query3);

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_cache_put_get() {
        let cache = QueryCache::new(100);
        let query = "SELECT * FROM users";
        let result = serde_json::json!({"data": [1, 2, 3]});

        cache.put(query, result.clone(), 3600);
        let retrieved = cache.get(query);

        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap(), result);
    }

    #[test]
    fn test_cache_expiration() {
        let cache = QueryCache::new(100);
        let query = "SELECT * FROM users";
        let result = serde_json::json!({"data": [1, 2, 3]});

        cache.put(query, result, 0); // TTL = 0, expires immediately
        std::thread::sleep(std::time::Duration::from_millis(100));

        let retrieved = cache.get(query);
        assert!(retrieved.is_none());
    }

    #[test]
    fn test_cache_invalidate() {
        let cache = QueryCache::new(100);
        let query = "SELECT * FROM users";
        let result = serde_json::json!({"data": [1, 2, 3]});

        cache.put(query, result, 3600);
        cache.invalidate(query);

        let retrieved = cache.get(query);
        assert!(retrieved.is_none());
    }

    #[test]
    fn test_cache_stats() {
        let cache = QueryCache::new(1);
        let query = "SELECT * FROM users";
        let result = serde_json::json!({"data": [1, 2, 3]});

        cache.put(query, result, 3600);
        let stats = cache.stats();

        assert!(stats.entry_count > 0);
        assert!(stats.total_size_bytes > 0);
    }
}
