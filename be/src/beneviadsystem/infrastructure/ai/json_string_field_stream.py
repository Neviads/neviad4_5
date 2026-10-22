from __future__ import annotations

from enum import Enum, auto


class _State(Enum):
    START = auto()
    KEY_OR_END = auto()
    IN_KEY = auto()
    AFTER_KEY = auto()
    VALUE_START = auto()
    IN_TARGET = auto()
    SKIP_VALUE = auto()
    DONE = auto()


_ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f"}


class JsonStringFieldStream:
    """Pulls one top-level string field out of a JSON object that arrives in fragments, such as the arguments of a streamed tool call.
    :meth:`feed` returns the newly decoded characters of that field (escapes resolved); other fields are skipped. It never raises:
    input that is not the expected shape just stops producing text."""

    def __init__(self, target_field: str):
        self._target = target_field
        self._state = _State.START
        self._key: list[str] = []
        self._escape = False
        self._unicode_digits = -1
        self._unicode_value = 0
        self._depth = 0
        self._skip_in_string = False
        self._target_finished = False
        self._held_high: int | None = None

    def finished(self) -> bool:
        """True once the closing quote of the target field has been read."""
        return self._target_finished

    def feed(self, fragment: str) -> str:
        out: list[str] = []
        for c in fragment:
            self._step(c, out)
        return "".join(out)

    def _emit(self, out: list[str], c: str) -> None:
        # A \\uXXXX pair of surrogates becomes one character; a high surrogate is held until its low half arrives, even across fragments.
        code = ord(c)
        if self._held_high is not None:
            high, self._held_high = self._held_high, None
            if 0xDC00 <= code <= 0xDFFF:
                out.append(chr(0x10000 + ((high - 0xD800) << 10) + (code - 0xDC00)))
                return
            out.append(chr(high))
        if 0xD800 <= code <= 0xDBFF:
            self._held_high = code
            return
        out.append(c)

    def _step(self, c: str, out: list[str]) -> None:
        state = self._state
        if state is _State.START:
            if c == "{":
                self._state = _State.KEY_OR_END
        elif state is _State.KEY_OR_END:
            if c == '"':
                self._key = []
                self._state = _State.IN_KEY
            elif c == "}":
                self._state = _State.DONE
        elif state is _State.IN_KEY:
            if self._escape:
                self._key.append(c)
                self._escape = False
            elif c == "\\":
                self._escape = True
            elif c == '"':
                self._state = _State.AFTER_KEY
            else:
                self._key.append(c)
        elif state is _State.AFTER_KEY:
            if c == ":":
                self._state = _State.VALUE_START
        elif state is _State.VALUE_START:
            if c.isspace():
                return
            if c == '"' and not self._target_finished and "".join(self._key) == self._target:
                self._state = _State.IN_TARGET
                self._escape = False
                self._unicode_digits = -1
            else:
                self._state = _State.SKIP_VALUE
                self._depth = 0
                self._skip_in_string = False
                self._escape = False
                self._skip_char(c)
        elif state is _State.IN_TARGET:
            self._target_char(c, out)
        elif state is _State.SKIP_VALUE:
            self._skip_char(c)

    def _target_char(self, c: str, out: list[str]) -> None:
        if self._unicode_digits >= 0:
            try:
                digit = int(c, 16)
            except ValueError:
                digit = 0
            self._unicode_value = self._unicode_value * 16 + digit
            self._unicode_digits += 1
            if self._unicode_digits == 4:
                self._emit(out, chr(self._unicode_value))
                self._unicode_digits = -1
            return
        if self._escape:
            self._escape = False
            if c == "u":
                self._unicode_digits = 0
                self._unicode_value = 0
            else:
                self._emit(out, _ESCAPES.get(c, c))  # \" \\ \/
            return
        if c == "\\":
            self._escape = True
        elif c == '"':
            self._target_finished = True
            self._state = _State.KEY_OR_END
        else:
            self._emit(out, c)

    def _skip_char(self, c: str) -> None:
        """Skips one value of any type, tracking nesting so a ',' or '}' inside it does not end it early."""
        if self._skip_in_string:
            if self._escape:
                self._escape = False
            elif c == "\\":
                self._escape = True
            elif c == '"':
                self._skip_in_string = False
                if self._depth == 0:
                    self._state = _State.KEY_OR_END
            return
        if c == '"':
            self._skip_in_string = True
        elif c in "{[":
            self._depth += 1
        elif c in "}]":
            if self._depth == 0:
                self._state = _State.DONE
                return
            self._depth -= 1
            if self._depth == 0:
                self._state = _State.KEY_OR_END
        elif c == "," and self._depth == 0:
            self._state = _State.KEY_OR_END
