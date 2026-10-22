"""Text helpers whose results the prompts and the tests rely on, written to match what the frontend and the old backend produced."""
from __future__ import annotations

import math
import re
import unicodedata
from decimal import Decimal

_LINE_BREAK = re.compile(r"\r\n|\r|\n")


def java_lines(text: str) -> list[str]:
    """The lines of a text split at \\n, \\r or \\r\\n, without a last empty line when the text ends with a line break."""
    if not text:
        return []
    lines = _LINE_BREAK.split(text)
    if lines and lines[-1] == "":
        lines.pop()
    return lines


def plain_number(value: float) -> str:
    """A size or range as a person writes it: 2 not 2.0, 0.05 not 5e-02, 0.0000001 not 1e-07."""
    if not math.isfinite(value):
        return str(value)
    text = format(Decimal(repr(float(value))).normalize(), "f")
    return "0" if text in ("-0", "0") else text


def general_number(value: float, precision: int = 4) -> str:
    """``%.<precision>g`` as Java writes it: decimal notation (trailing zeros kept) for magnitudes from 1e-4 to below 10^precision after
    rounding, scientific notation otherwise."""
    if value == 0 or not math.isfinite(value):
        return f"{value:.{precision - 1}e}" if value == 0 else str(value)
    rounded = float(f"{value:.{precision - 1}e}")
    magnitude = abs(rounded)
    if 1e-4 <= magnitude < 10 ** precision:
        decimals = max(0, precision - 1 - math.floor(math.log10(magnitude)))
        return f"{rounded:.{decimals}f}"
    return f"{value:.{precision - 1}e}"


def scientific_number(value: float, precision: int = 4) -> str:
    """``%.<precision>e``."""
    return f"{value:.{precision}e}"


def fold_accents(text: str) -> str:
    """Lower case without Vietnamese accents (đ becomes d), for matching names typed in different ways."""
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in decomposed if not unicodedata.category(c).startswith("M"))
    return stripped.replace("đ", "d").replace("Đ", "D").lower().strip()


def one_line(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def is_blank(text: str | None) -> bool:
    return text is None or not text.strip()
