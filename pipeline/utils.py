from __future__ import annotations

import math
import re
from typing import Any


def strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` fences from LLM output."""
    text = re.sub(r"^\s*```(?:json)?\s*\n", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def parse_number(val: Any) -> float | None:
    """Coerce a value to float, handling European comma-decimal formats.

    Disambiguation rules for strings with a single comma and no dot:
      - Comma followed by exactly 3 digits -> thousand separator ("1,500" -> 1500)
      - Otherwise -> decimal separator ("3,50" -> 3.5, "22,00" -> 22.0)

    Returns None on failure instead of raising.
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val) if math.isfinite(float(val)) else None
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return None
        if "," in s and "." not in s:
            # Thousand sep requires leading non-zero digit(s) + groups of 3
            s = s.replace(",", "") if re.match(r"^-?[1-9]\d{0,2}(,\d{3})+$", s) else s.replace(",", ".")
        elif "." in s and "," not in s:
            # EU thousand sep requires leading non-zero ("1.500" but not "0.500")
            if re.match(r"^-?[1-9]\d{0,2}(\.\d{3})+$", s):
                s = s.replace(".", "")
        elif "," in s and "." in s:
            last_comma, last_dot = s.rfind(","), s.rfind(".")
            # European "1.234,56" vs American "1,234.56" - last separator is decimal
            s = s.replace(".", "").replace(",", ".") if last_comma > last_dot else s.replace(",", "")
        try:
            f = float(s)
            return f if math.isfinite(f) else None
        except ValueError:
            return None
    try:
        f = float(val)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None
