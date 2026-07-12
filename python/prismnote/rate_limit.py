"""Rate limiting to prevent DoS and resource exhaustion."""

import time
import logging
from collections import defaultdict
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple rate limiter based on token bucket algorithm."""
    
    def __init__(self, requests_per_second: float = 10.0, burst_size: int = 20):
        """
        Initialize rate limiter.
        
        Args:
            requests_per_second: Max requests per second
            burst_size: Allow burst up to this many requests
        """
        self.rate = requests_per_second
        self.burst_size = burst_size
        self.tokens: Dict[str, float] = defaultdict(lambda: burst_size)
        self.last_update: Dict[str, float] = {}
    
    def is_allowed(self, client_id: str) -> bool:
        """
        Check if request from client is allowed.
        
        Args:
            client_id: Unique client identifier (IP, user ID, etc.)
            
        Returns:
            True if request is allowed, False if rate limited
        """
        now = time.time()
        
        # Initialize if new client
        if client_id not in self.last_update:
            self.last_update[client_id] = now
            self.tokens[client_id] = self.burst_size
        
        # Add tokens based on time elapsed
        elapsed = now - self.last_update[client_id]
        self.tokens[client_id] = min(
            self.burst_size,
            self.tokens[client_id] + elapsed * self.rate
        )
        self.last_update[client_id] = now
        
        # Check if token available
        if self.tokens[client_id] >= 1.0:
            self.tokens[client_id] -= 1.0
            return True
        
        return False
    
    def get_retry_after(self, client_id: str) -> float:
        """Get seconds to wait before next allowed request."""
        if self.tokens[client_id] < 1.0:
            return (1.0 - self.tokens[client_id]) / self.rate
        return 0.0


class PerClientRateLimiter:
    """Per-client rate limiter tracking."""
    
    def __init__(self, requests_per_minute: int = 60):
        """
        Initialize per-client limiter.
        
        Args:
            requests_per_minute: Max requests per minute per client
        """
        self.rps = requests_per_minute / 60.0
        self.limiters: Dict[str, RateLimiter] = {}
    
    def is_allowed(self, client_id: str) -> bool:
        """Check if client request is allowed."""
        if client_id not in self.limiters:
            self.limiters[client_id] = RateLimiter(
                requests_per_second=self.rps,
                burst_size=self.rps * 10
            )
        
        allowed = self.limiters[client_id].is_allowed("request")
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for client: {client_id}")
        
        return allowed
    
    def cleanup(self, older_than_seconds: int = 3600):
        """Remove stale client entries (older than N seconds)."""
        now = time.time()
        stale = []
        
        for client_id, limiter in self.limiters.items():
            if (now - limiter.last_update.get("request", 0)) > older_than_seconds:
                stale.append(client_id)
        
        for client_id in stale:
            del self.limiters[client_id]
        
        if stale:
            logger.info(f"Cleaned up {len(stale)} stale rate limiter entries")


class QueryRateLimiter:
    """Rate limiter for expensive operations (queries, exports)."""
    
    def __init__(self, max_concurrent: int = 5, max_per_hour: int = 100):
        """
        Initialize query rate limiter.
        
        Args:
            max_concurrent: Max queries running simultaneously
            max_per_hour: Max queries per hour per client
        """
        self.max_concurrent = max_concurrent
        self.max_per_hour = max_per_hour
        self.active_queries: Dict[str, int] = defaultdict(int)
        self.hourly_queries: Dict[str, list] = defaultdict(list)
    
    def can_start_query(self, client_id: str) -> bool:
        """Check if client can start a new query."""
        # Check concurrent limit
        if self.active_queries[client_id] >= self.max_concurrent:
            logger.warning(f"Concurrent limit reached for: {client_id}")
            return False
        
        # Check hourly limit
        now = time.time()
        hour_ago = now - 3600
        
        # Remove old entries
        self.hourly_queries[client_id] = [
            t for t in self.hourly_queries[client_id]
            if t > hour_ago
        ]
        
        if len(self.hourly_queries[client_id]) >= self.max_per_hour:
            logger.warning(f"Hourly limit reached for: {client_id}")
            return False
        
        return True
    
    def start_query(self, client_id: str) -> None:
        """Mark query as started."""
        if self.can_start_query(client_id):
            self.active_queries[client_id] += 1
            self.hourly_queries[client_id].append(time.time())
    
    def end_query(self, client_id: str) -> None:
        """Mark query as ended."""
        self.active_queries[client_id] = max(0, self.active_queries[client_id] - 1)
