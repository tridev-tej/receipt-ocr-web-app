"""Resilience patterns for API calls: rate limiter and circuit breaker."""

from __future__ import annotations

import asyncio
import logging
import time

import config

logger = logging.getLogger(__name__)


class RateLimiter:
    """Token-bucket rate limiter for API calls."""

    def __init__(self, rate: float = config.OCR_REQUESTS_PER_SECOND):
        if rate <= 0:
            raise ValueError(f"rate must be positive, got {rate}")
        self.rate = rate
        self.tokens = rate
        self.last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        # Bucket capacity is max(rate, 1.0) so fractional rates (e.g. 0.5 req/s)
        # can still accumulate enough tokens for a single request.
        capacity = max(self.rate, 1.0)
        while True:
            async with self._lock:
                now = time.monotonic()
                elapsed = now - self.last_refill
                self.tokens = min(capacity, self.tokens + elapsed * self.rate)
                self.last_refill = now

                if self.tokens >= 1.0:
                    self.tokens -= 1.0
                    return
                wait = (1.0 - self.tokens) / self.rate

            # Sleep outside the lock so other coroutines aren't blocked
            await asyncio.sleep(wait)


class CircuitBreaker:
    def __init__(
        self,
        threshold: int = config.CIRCUIT_BREAKER_THRESHOLD,
        recovery_sec: int = config.CIRCUIT_BREAKER_RECOVERY_SEC,
    ):
        self.threshold = threshold
        self.recovery_sec = recovery_sec
        self.consecutive_failures = 0
        self.last_failure_time = 0.0
        self.is_open = False
        self._half_open_probe_in_flight = False
        self._probe_started_at: float | None = None
        self._lock = asyncio.Lock()

    async def record_success(self) -> None:
        async with self._lock:
            self.consecutive_failures = 0
            if self._half_open_probe_in_flight or self.is_open:
                self.is_open = False
            self._half_open_probe_in_flight = False
            self._probe_started_at = None

    async def record_failure(self) -> None:
        async with self._lock:
            self.consecutive_failures += 1
            self.last_failure_time = time.monotonic()
            self._half_open_probe_in_flight = False
            self._probe_started_at = None
            if self.consecutive_failures >= self.threshold:
                self.is_open = True
                logger.warning("circuit_breaker_opened", extra={"failures": self.consecutive_failures})

    async def should_use_fallback(self) -> bool:
        async with self._lock:
            if not self.is_open:
                return False
            elapsed = time.monotonic() - self.last_failure_time
            if elapsed >= self.recovery_sec:
                if self._half_open_probe_in_flight:
                    probe_elapsed = (
                        0.0
                        if self._probe_started_at is None
                        else (time.monotonic() - self._probe_started_at)
                    )
                    if probe_elapsed >= self.recovery_sec:
                        self._half_open_probe_in_flight = False
                        self._probe_started_at = None
                    else:
                        # Another request is already probing — reject this one
                        return True
                # Transition to half-open: allow exactly one probe request
                self._half_open_probe_in_flight = True
                self._probe_started_at = time.monotonic()
                logger.info("circuit_breaker_half_open")
                return False
            return True
