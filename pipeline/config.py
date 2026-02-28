import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _safe_float(val: str, default: float, name: str) -> float:
    import math

    try:
        result = float(val)
        if not math.isfinite(result):
            raise ValueError(f"non-finite value: {val}")
        return result
    except (ValueError, TypeError):
        import logging

        logging.getLogger(__name__).warning(
            "invalid_config_value",
            extra={"config_name": name, "value": val, "using_default": default},
        )
        return default


def _positive_float(val: str, default: float, name: str) -> float:
    """Like _safe_float but rejects zero and negative values."""
    result = _safe_float(val, default, name)
    if result <= 0:
        import logging
        logging.getLogger(__name__).warning(
            "config_non_positive_value",
            extra={"config_name": name, "value": result, "using_default": default},
        )
        return default
    return result


BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
RECEIPTS_DIR = DATA_DIR / "receipts"
EXTRACTIONS_DIR = DATA_DIR / "extractions"
OUTPUT_DIR = BASE_DIR / "output"
MENU_PATH = BASE_DIR / "menu.json"
OVERRIDES_PATH = DATA_DIR / "mapping_overrides.json"


def ensure_dirs() -> None:
    """Create required directories. Call from main.py, not at import time."""
    for d in [RECEIPTS_DIR, EXTRACTIONS_DIR, OUTPUT_DIR]:
        d.mkdir(parents=True, exist_ok=True)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY") or None

# OCR
OCR_MODEL = "claude-sonnet-4-20250514"
MAPPER_MODEL = os.getenv("MAPPER_MODEL", OCR_MODEL)
OCR_CONFIDENCE_THRESHOLD = 0.5
OCR_MAX_RETRIES = 3
OCR_CONCURRENT_WORKERS = 8
OCR_REQUESTS_PER_SECOND = 4
OCR_COST_GUARD_USD = _positive_float(
    os.getenv("OCR_COST_GUARD_USD", "10.0"),
    10.0,
    "OCR_COST_GUARD_USD",
)

# Pricing per million tokens (overridable as model pricing changes)
OCR_INPUT_COST_PER_MTOK = _positive_float(
    os.getenv("OCR_INPUT_COST_PER_MTOK", "3.0"),
    3.0,
    "OCR_INPUT_COST_PER_MTOK",
)
OCR_OUTPUT_COST_PER_MTOK = _positive_float(
    os.getenv("OCR_OUTPUT_COST_PER_MTOK", "15.0"),
    15.0,
    "OCR_OUTPUT_COST_PER_MTOK",
)
CIRCUIT_BREAKER_THRESHOLD = 3
CIRCUIT_BREAKER_RECOVERY_SEC = 60

# Mapping
FUZZY_AUTO_THRESHOLD = 85
FUZZY_CANDIDATE_THRESHOLD = 65

# Cost calculation
DESKEW_ASPECT_RATIO = 1.5  # landscape → portrait rotation threshold

IQR_K = 1.5
MIN_OBSERVATIONS_FOR_CONFIDENCE = 3

# Currency
_SUPPORTED_CURRENCIES = {"EUR", "USD", "GBP", "CHF", "SEK", "DKK", "NOK", "PLN"}
_raw_currency = os.getenv("DEFAULT_CURRENCY", "EUR").upper()
if _raw_currency not in _SUPPORTED_CURRENCIES:
    raise ValueError(f"DEFAULT_CURRENCY={_raw_currency!r} not in {_SUPPORTED_CURRENCIES}")
DEFAULT_CURRENCY = _raw_currency

EUR_RATES: dict[str, float] = {
    "EUR": 1.0,
    "USD": _positive_float(os.getenv("EUR_RATE_USD", "0.92"), 0.92, "EUR_RATE_USD"),
    "GBP": _positive_float(os.getenv("EUR_RATE_GBP", "1.17"), 1.17, "EUR_RATE_GBP"),
    "CHF": _positive_float(os.getenv("EUR_RATE_CHF", "1.05"), 1.05, "EUR_RATE_CHF"),
    "SEK": _positive_float(os.getenv("EUR_RATE_SEK", "0.088"), 0.088, "EUR_RATE_SEK"),
    "DKK": _positive_float(os.getenv("EUR_RATE_DKK", "0.134"), 0.134, "EUR_RATE_DKK"),
    "NOK": _positive_float(os.getenv("EUR_RATE_NOK", "0.086"), 0.086, "EUR_RATE_NOK"),
    "PLN": _positive_float(os.getenv("EUR_RATE_PLN", "0.232"), 0.232, "EUR_RATE_PLN"),
}

DB_PATH = OUTPUT_DIR / "cogs.db"

# ─── OCR Cross-validation ──────────────────────────────────────────────────
# Enable secondary PaddleOCR pass to cross-check key numeric/text values from
# Claude extractions. Can be disabled via env var.

CROSS_VALIDATE_OCR: bool = os.getenv("CROSS_VALIDATE_OCR", "true").lower() in {
    "1",
    "true",
    "yes",
}

# Maximum relative deviation allowed when matching numbers (e.g. totals) that
# appear in both Claude and PaddleOCR outputs. 0.02 = ±2 % tolerance.
_raw_xval_tol = _safe_float(
    os.getenv("XVAL_NUMBER_TOLERANCE", "0.02"),
    0.02,
    "XVAL_NUMBER_TOLERANCE",
)
XVAL_NUMBER_TOLERANCE: float = max(0.0, min(1.0, _raw_xval_tol))

# Floor for cross-validation confidence multiplier. Even worst-case disagreement
# won't drop below this factor. Tunable — A/B test post-rollout.
_raw_xval_floor = _safe_float(
    os.getenv("XVAL_MULTIPLIER_FLOOR", "0.4"),
    0.4,
    "XVAL_MULTIPLIER_FLOOR",
)
XVAL_MULTIPLIER_FLOOR: float = max(0.0, min(1.0, _raw_xval_floor))
