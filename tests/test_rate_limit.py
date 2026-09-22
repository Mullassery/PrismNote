"""Tests for prismnote.rate_limit: token-bucket windowing/reset behavior.

Time is monkeypatched (rather than sleeping) so these tests are fast and
deterministic while still exercising the real replenishment/expiry math.
"""

import pytest

from prismnote.rate_limit import RateLimiter, PerClientRateLimiter, QueryRateLimiter


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


class FakeClock:
    """Controllable clock injected in place of time.time."""

    def __init__(self, start: float = 1_000_000.0):
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture
def clock(monkeypatch):
    fc = FakeClock()
    monkeypatch.setattr("prismnote.rate_limit.time.time", fc)
    return fc


# ---------------------------------------------------------------------------
# RateLimiter
# ---------------------------------------------------------------------------


class TestRateLimiterBurst:
    def test_allows_up_to_burst_size_then_blocks(self, clock):
        limiter = RateLimiter(requests_per_second=10.0, burst_size=3)
        client = "1.2.3.4"

        assert limiter.is_allowed(client) is True
        assert limiter.is_allowed(client) is True
        assert limiter.is_allowed(client) is True
        # Burst exhausted, no time has passed -> blocked.
        assert limiter.is_allowed(client) is False

    def test_different_clients_have_independent_buckets(self, clock):
        limiter = RateLimiter(requests_per_second=1.0, burst_size=1)

        assert limiter.is_allowed("client-a") is True
        assert limiter.is_allowed("client-a") is False
        # client-b's bucket is unaffected by client-a's exhaustion.
        assert limiter.is_allowed("client-b") is True


class TestRateLimiterReplenishment:
    def test_tokens_replenish_after_elapsed_time(self, clock):
        limiter = RateLimiter(requests_per_second=1.0, burst_size=1)
        client = "replenish-test"

        assert limiter.is_allowed(client) is True
        assert limiter.is_allowed(client) is False  # bucket empty

        # Not enough time passed yet for a full token.
        clock.advance(0.5)
        assert limiter.is_allowed(client) is False

        # Now enough time has passed for >= 1 token at 1 req/sec.
        clock.advance(0.6)
        assert limiter.is_allowed(client) is True

    def test_tokens_never_exceed_burst_size(self, clock):
        limiter = RateLimiter(requests_per_second=100.0, burst_size=5)
        client = "cap-test"

        limiter.is_allowed(client)  # initializes bucket
        clock.advance(1000)  # huge elapsed time, would overflow without capping

        allowed_count = 0
        for _ in range(10):
            if limiter.is_allowed(client):
                allowed_count += 1
        # Only burst_size requests should succeed even after a long idle gap.
        assert allowed_count == 5

    def test_get_retry_after_reports_positive_wait_when_exhausted(self, clock):
        limiter = RateLimiter(requests_per_second=2.0, burst_size=1)
        client = "retry-test"

        assert limiter.is_allowed(client) is True
        assert limiter.is_allowed(client) is False

        retry_after = limiter.get_retry_after(client)
        assert retry_after > 0

    def test_get_retry_after_zero_when_tokens_available(self, clock):
        limiter = RateLimiter(requests_per_second=1.0, burst_size=5)
        client = "retry-zero-test"

        limiter.is_allowed(client)  # consumes one of five
        assert limiter.get_retry_after(client) == 0.0


# ---------------------------------------------------------------------------
# PerClientRateLimiter
# ---------------------------------------------------------------------------


class TestPerClientRateLimiter:
    def test_enforces_burst_limit_per_client(self, clock):
        # requests_per_minute=60 -> rps=1.0, burst_size=10.0
        limiter = PerClientRateLimiter(requests_per_minute=60)
        client = "user-1"

        results = [limiter.is_allowed(client) for _ in range(10)]
        assert all(results)  # first 10 (== burst) succeed
        assert limiter.is_allowed(client) is False  # 11th is blocked

    def test_clients_are_isolated(self, clock):
        limiter = PerClientRateLimiter(requests_per_minute=120)  # rps=2, burst=20
        assert limiter.is_allowed("user-a") is True
        # Drain user-a's whole bucket.
        for _ in range(19):
            limiter.is_allowed("user-a")
        assert limiter.is_allowed("user-a") is False
        # A different client is a fresh, independent bucket.
        assert limiter.is_allowed("user-b") is True

    def test_low_rpm_permanently_locks_out_the_client_known_bug(self, clock):
        # KNOWN BUG (found while writing this test, not fixed -- out of
        # scope for a "write tests" pass; flagged in ROADMAP_HONEST.md):
        # requests_per_minute=1 -> rps=1/60, burst_size=rps*10 ~= 0.167.
        # RateLimiter.is_allowed() caps tokens at `min(self.burst_size, ...)`
        # every call, so once burst_size itself is < 1.0 the bucket can
        # NEVER accumulate a full token -- not after 61 seconds, not after
        # a year. Any requests_per_minute < 6 permanently rate-limits the
        # client to zero throughput forever, which is a denial-of-service
        # against your own legitimate users, not just "very strict."
        limiter = PerClientRateLimiter(requests_per_minute=1)
        assert limiter.is_allowed("throttled-client") is False

        clock.advance(100_000_000)  # ~3 years later -- still permanently stuck
        assert limiter.is_allowed("throttled-client") is False

    def test_cleanup_removes_stale_clients(self, clock):
        limiter = PerClientRateLimiter(requests_per_minute=60)
        limiter.is_allowed("stale-client")
        limiter.is_allowed("fresh-client")

        assert "stale-client" in limiter.limiters
        assert "fresh-client" in limiter.limiters

        # Advance time so "stale-client" is old, but touch "fresh-client"
        # again right before cleanup so it stays recent.
        clock.advance(3700)
        limiter.is_allowed("fresh-client")

        limiter.cleanup(older_than_seconds=3600)

        assert "stale-client" not in limiter.limiters
        assert "fresh-client" in limiter.limiters

    def test_cleanup_is_a_noop_when_nothing_is_stale(self, clock):
        limiter = PerClientRateLimiter(requests_per_minute=60)
        limiter.is_allowed("recent-client")

        limiter.cleanup(older_than_seconds=3600)

        assert "recent-client" in limiter.limiters


# ---------------------------------------------------------------------------
# QueryRateLimiter
# ---------------------------------------------------------------------------


class TestQueryRateLimiterConcurrency:
    def test_blocks_once_max_concurrent_reached(self, clock):
        limiter = QueryRateLimiter(max_concurrent=2, max_per_hour=100)
        client = "heavy-user"

        assert limiter.can_start_query(client) is True
        limiter.start_query(client)
        assert limiter.can_start_query(client) is True
        limiter.start_query(client)
        # Now at max_concurrent=2, third must be blocked.
        assert limiter.can_start_query(client) is False

    def test_start_query_is_a_noop_when_over_limit(self, clock):
        limiter = QueryRateLimiter(max_concurrent=1, max_per_hour=100)
        client = "single-slot-user"

        limiter.start_query(client)
        assert limiter.active_queries[client] == 1

        # Calling start_query again while at the limit must not silently
        # let active_queries exceed max_concurrent.
        limiter.start_query(client)
        assert limiter.active_queries[client] == 1

    def test_end_query_frees_a_slot(self, clock):
        limiter = QueryRateLimiter(max_concurrent=1, max_per_hour=100)
        client = "slot-user"

        limiter.start_query(client)
        assert limiter.can_start_query(client) is False

        limiter.end_query(client)
        assert limiter.can_start_query(client) is True

    def test_end_query_never_goes_negative(self, clock):
        limiter = QueryRateLimiter(max_concurrent=1, max_per_hour=100)
        client = "never-started"

        limiter.end_query(client)  # end without a matching start
        assert limiter.active_queries[client] == 0


class TestQueryRateLimiterHourlyWindow:
    def test_blocks_once_hourly_limit_reached(self, clock):
        limiter = QueryRateLimiter(max_concurrent=100, max_per_hour=3)
        client = "quota-user"

        for _ in range(3):
            assert limiter.can_start_query(client) is True
            limiter.start_query(client)

        assert limiter.can_start_query(client) is False

    def test_hourly_window_expires_old_entries(self, clock):
        limiter = QueryRateLimiter(max_concurrent=100, max_per_hour=2)
        client = "window-user"

        limiter.start_query(client)
        clock.advance(3601)  # first query now outside the 1-hour window
        limiter.start_query(client)

        # Only the second (recent) query should count against the hourly
        # quota now, so there's still room for one more.
        assert limiter.can_start_query(client) is True
        assert len(limiter.hourly_queries[client]) == 1
