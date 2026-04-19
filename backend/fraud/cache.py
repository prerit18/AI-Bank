"""
In-memory velocity cache with TTL windows.
Swap the _store implementation for Redis with no changes to callers.
"""
import time
from collections import defaultdict
from decimal import Decimal
from threading import Lock

_lock = Lock()

# { customer_id: [ (timestamp, amount), ... ] }
_events: dict[int, list[tuple[float, Decimal]]] = defaultdict(list)

WINDOWS = {
    "1h": 3600,
    "24h": 86400,
    "7d": 604800,
}


def _prune(customer_id: int) -> None:
    cutoff = time.time() - WINDOWS["7d"]
    _events[customer_id] = [e for e in _events[customer_id] if e[0] >= cutoff]


def record(customer_id: int, amount: Decimal) -> None:
    with _lock:
        _events[customer_id].append((time.time(), amount))
        _prune(customer_id)


def get_velocity(customer_id: int) -> dict:
    with _lock:
        _prune(customer_id)
        now = time.time()
        result = {}
        for label, seconds in WINDOWS.items():
            cutoff = now - seconds
            window_events = [e for e in _events[customer_id] if e[0] >= cutoff]
            result[f"transactions_{label}"] = len(window_events)
            result[f"amount_sent_{label}"] = float(sum(e[1] for e in window_events))
        return result
