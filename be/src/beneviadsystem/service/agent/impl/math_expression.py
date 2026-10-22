from __future__ import annotations

import math

_FUNCTIONS = {"atan": math.atan, "sin": math.sin, "cos": math.cos, "tan": math.tan, "asin": math.asin, "acos": math.acos, "sqrt": math.sqrt,
              "exp": math.exp, "ln": math.log, "log10": math.log10, "abs": abs}


def _ieee(function, *args) -> float:
    """The IEEE result a domain or range error would give (NaN or infinity) instead of an exception; the caller rejects it as not finite."""
    try:
        return function(*args)
    except OverflowError:
        return math.inf
    except ZeroDivisionError:
        return math.inf
    except ValueError:
        return math.nan


def _divide(a: float, b: float) -> float:
    if b == 0:
        return math.nan if a == 0 or math.isnan(a) else math.copysign(math.inf, a) * (math.copysign(1, b))
    return a / b


class MathExpression:
    """A tiny arithmetic evaluator for the numeric examples of a scenario: numbers (dot decimals, e-notation), ``+ - * / ^``, parentheses,
    the constants ``pi`` and ``e``, and the functions ``atan sin cos tan asin acos sqrt exp ln log10 abs``. Angles are in radians. The model
    writes the expression; the backend computes the number, so the model never has to do the arithmetic in its head."""

    def __init__(self, text: str):
        self._text = text
        self._position = 0

    @staticmethod
    def evaluate(expression: str | None) -> float:
        """The value of the expression; ``ValueError`` saying what is wrong when it cannot be computed."""
        if expression is None or not expression.strip():
            raise ValueError("biểu thức rỗng")
        parser = MathExpression(expression)
        value = parser._sum()
        parser._skip_spaces()
        if parser._position != len(parser._text):
            raise ValueError(f'không hiểu ký tự "{parser._text[parser._position]}" ở vị trí {parser._position}')
        if math.isnan(value) or math.isinf(value):
            raise ValueError("kết quả không hữu hạn")
        return value

    def _sum(self) -> float:
        value = self._product()
        while True:
            self._skip_spaces()
            if self._accept("+"):
                value += self._product()
            elif self._accept("-"):
                value -= self._product()
            else:
                return value

    def _product(self) -> float:
        value = self._unary()
        while True:
            self._skip_spaces()
            if self._accept("*"):
                value *= self._unary()
            elif self._accept("/"):
                value = _divide(value, self._unary())
            else:
                return value

    def _unary(self) -> float:
        """The minus sign binds weaker than the power: -2^2 = -4."""
        self._skip_spaces()
        if self._accept("-"):
            return -self._unary()
        if self._accept("+"):
            return self._unary()
        return self._power()

    def _power(self) -> float:
        """Right associative: 2^3^2 = 2^(3^2); the exponent may carry a sign."""
        base = self._atom()
        self._skip_spaces()
        if self._accept("^"):
            return _ieee(math.pow, base, self._unary())
        return base

    def _atom(self) -> float:
        self._skip_spaces()
        if self._accept("("):
            value = self._sum()
            self._skip_spaces()
            if not self._accept(")"):
                raise ValueError("thiếu dấu )")
            return value
        if self._position < len(self._text) and (self._text[self._position].isdigit() or self._text[self._position] == "."):
            return self._number()
        if self._position < len(self._text) and self._text[self._position].isalpha():
            start = self._position
            while self._position < len(self._text) and self._text[self._position].isalnum():
                self._position += 1
            name = self._text[start:self._position].lower()
            self._skip_spaces()
            if self._accept("("):
                argument = self._sum()
                self._skip_spaces()
                if not self._accept(")"):
                    raise ValueError("thiếu dấu ) sau " + name)
                if name not in _FUNCTIONS:
                    raise ValueError(f'không có hàm "{name}" (có atan sin cos tan asin acos sqrt exp ln log10 abs)')
                return _ieee(_FUNCTIONS[name], argument)
            if name == "pi":
                return math.pi
            if name == "e":
                return math.e
            raise ValueError(f'không biết "{name}" (chỉ có pi, e và các hàm atan sin cos tan asin acos sqrt exp ln log10 abs)')
        if self._position >= len(self._text):
            raise ValueError("biểu thức kết thúc quá sớm")
        raise ValueError(f'không hiểu ký tự "{self._text[self._position]}" ở vị trí {self._position}')

    def _number(self) -> float:
        text, start = self._text, self._position
        while self._position < len(text) and (text[self._position].isdigit() or text[self._position] == "."):
            self._position += 1
        if self._position < len(text) and text[self._position] in "eE":
            mark = self._position
            self._position += 1
            if self._position < len(text) and text[self._position] in "+-":
                self._position += 1
            if self._position < len(text) and text[self._position].isdigit():
                while self._position < len(text) and text[self._position].isdigit():
                    self._position += 1
            else:
                self._position = mark
        literal = text[start:self._position]
        try:
            return float(literal)
        except ValueError:
            raise ValueError(f'số không hợp lệ "{literal}" (dùng dấu chấm làm dấu thập phân)') from None

    def _accept(self, c: str) -> bool:
        if self._position < len(self._text) and self._text[self._position] == c:
            self._position += 1
            return True
        return False

    def _skip_spaces(self) -> None:
        while self._position < len(self._text) and self._text[self._position].isspace():
            self._position += 1
