"""STOMP 1.2 frames over WebSocket text messages: the codec the broker and the tests share."""
from __future__ import annotations

from dataclasses import dataclass, field

_ESCAPE = {"\\": "\\\\", "\r": "\\r", "\n": "\\n", ":": "\\c"}
_UNESCAPE = {"\\\\": "\\", "\\r": "\r", "\\n": "\n", "\\c": ":"}
#: Frames whose headers are never escaped (STOMP 1.2, section "Value Encoding").
_RAW_HEADERS = {"CONNECT", "CONNECTED"}


class StompProtocolError(ValueError):
    """The bytes are not a STOMP frame this broker accepts."""


def _escape(value: str) -> str:
    return "".join(_ESCAPE.get(c, c) for c in value)


def _unescape(value: str) -> str:
    out, i = [], 0
    while i < len(value):
        pair = value[i:i + 2]
        if pair in _UNESCAPE:
            out.append(_UNESCAPE[pair])
            i += 2
        elif value[i] == "\\":
            raise StompProtocolError(f"undefined escape in header: {pair!r}")
        else:
            out.append(value[i])
            i += 1
    return "".join(out)


@dataclass
class StompFrame:
    command: str
    headers: dict[str, str] = field(default_factory=dict)
    body: bytes = b""

    def encode(self) -> bytes:
        raw = self.command in _RAW_HEADERS
        lines = [self.command]
        headers = dict(self.headers)
        if self.body or self.command in ("MESSAGE", "SEND", "ERROR"):
            headers["content-length"] = str(len(self.body))
        for key, value in headers.items():
            lines.append(f"{key}:{value}" if raw else f"{_escape(key)}:{_escape(value)}")
        return ("\n".join(lines) + "\n\n").encode("utf-8") + self.body + b"\x00"


class StompFrameReader:
    """Reads frames from a stream of WebSocket messages. Heartbeats (bare line breaks) are skipped; a frame may span messages; the body ends at
    ``content-length`` bytes when given, else at the first NUL."""

    def __init__(self, max_frame_bytes: int = 2 * 1024 * 1024):
        self._buffer = bytearray()
        self._max = max_frame_bytes

    def feed(self, data: bytes) -> list[StompFrame]:
        self._buffer.extend(data)
        frames = []
        while True:
            while self._buffer[:1] in (b"\n", b"\r"):
                del self._buffer[0]
            if not self._buffer:
                return frames
            frame = self._next()
            if frame is None:
                if len(self._buffer) > self._max:
                    raise StompProtocolError("frame too large")
                return frames
            frames.append(frame)

    def _next(self) -> StompFrame | None:
        end_of_headers = self._buffer.find(b"\n\n")
        crlf = self._buffer.find(b"\r\n\r\n")
        if crlf >= 0 and (end_of_headers < 0 or crlf < end_of_headers):
            end_of_headers, separator = crlf, 4
        else:
            separator = 2
        if end_of_headers < 0:
            return None
        head = self._buffer[:end_of_headers].decode("utf-8").replace("\r\n", "\n").split("\n")
        command = head[0].strip()
        raw = command in _RAW_HEADERS
        headers: dict[str, str] = {}
        for line in head[1:]:
            if ":" not in line:
                raise StompProtocolError(f"malformed header line: {line!r}")
            key, value = line.split(":", 1)
            key, value = (key, value) if raw else (_unescape(key), _unescape(value))
            headers.setdefault(key, value)
        start = end_of_headers + separator
        if "content-length" in headers:
            try:
                length = int(headers["content-length"])
            except ValueError:
                raise StompProtocolError("content-length is not a number") from None
            if length > self._max:
                raise StompProtocolError("frame too large")
            if len(self._buffer) < start + length + 1:
                return None
            if self._buffer[start + length] != 0:
                raise StompProtocolError("frame body is not followed by NUL")
            body = bytes(self._buffer[start:start + length])
            del self._buffer[:start + length + 1]
        else:
            nul = self._buffer.find(b"\x00", start)
            if nul < 0:
                return None
            body = bytes(self._buffer[start:nul])
            del self._buffer[:nul + 1]
        if len(body) > self._max:
            raise StompProtocolError("frame too large")
        return StompFrame(command, headers, body)
