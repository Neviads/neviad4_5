from __future__ import annotations

import asyncio
import fnmatch
import itertools
import json
import logging
import threading
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from starlette.websockets import WebSocket, WebSocketDisconnect, WebSocketState

from beneviadsystem.domain.exception import IllegalStateError
from beneviadsystem.domain.model.base import compact_json

from .messaging_template import MessagingTemplate
from .stomp_frame import StompFrame, StompFrameReader, StompProtocolError

log = logging.getLogger(__name__)
SUBPROTOCOLS = ("v12.stomp", "v11.stomp", "v10.stomp")
JSON_CONTENT_TYPE = "application/json;charset=UTF-8"


@dataclass(eq=False)
class _Connection:
    socket: WebSocket
    outbox: asyncio.Queue = field(default_factory=asyncio.Queue)
    subscriptions: dict[str, str] = field(default_factory=dict)  # subscription id -> destination

    async def write_loop(self) -> None:
        while True:
            frame: StompFrame | None = await self.outbox.get()
            if frame is None:
                return
            await self.socket.send_text(frame.encode().decode("utf-8"))


class StompBroker(MessagingTemplate):
    """A simple in-memory STOMP 1.2 broker over WebSocket, the counterpart of Spring's ``enableSimpleBroker("/topic")``: clients SUBSCRIBE
    to ``/topic/...`` destinations and SEND to ``/app/...`` destinations, which go to the registered application handlers. Any thread may
    publish with :meth:`convert_and_send`; every connection has one writer task, so the frames of a destination keep their order.
    Heartbeats are not negotiated (``heart-beat:0,0``)."""

    def __init__(self, allowed_origins: list[str], application_prefix: str = "/app", broker_prefix: str = "/topic",
                 max_message_bytes: int = 1024 * 1024):
        self._allowed_origins = allowed_origins
        self._application_prefix = application_prefix
        self._broker_prefix = broker_prefix
        self._max_message_bytes = max_message_bytes
        self._handlers: dict[str, Callable[[Any], Any]] = {}
        self._connections: set[_Connection] = set()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._loop_thread: int | None = None
        self._message_ids = itertools.count(1)

    def register(self, destination: str, handler: Callable[[Any], Any]) -> None:
        """``handler`` receives the parsed JSON body of every SEND to ``application_prefix + destination``. It runs on the event loop, so it
        must not block."""
        self._handlers[self._application_prefix + destination] = handler

    def bind(self, loop: asyncio.AbstractEventLoop) -> None:
        """Called once the event loop runs; until then nothing can be published."""
        self._loop = loop
        self._loop_thread = threading.get_ident()

    def convert_and_send(self, destination: str, payload: Any) -> None:
        body = (payload if isinstance(payload, str) else compact_json(payload)).encode("utf-8")
        loop = self._loop
        if loop is None or loop.is_closed():
            raise IllegalStateError("the STOMP broker is not running")
        if threading.get_ident() == self._loop_thread:
            self._dispatch(destination, body)
        else:
            loop.call_soon_threadsafe(self._dispatch, destination, body)

    def subscriber_count(self, destination: str) -> int:
        return sum(1 for c in self._connections for d in c.subscriptions.values() if d == destination)

    def _dispatch(self, destination: str, body: bytes) -> None:
        for connection in list(self._connections):
            for subscription, subscribed in connection.subscriptions.items():
                if subscribed == destination:
                    connection.outbox.put_nowait(StompFrame("MESSAGE", {"destination": destination, "content-type": JSON_CONTENT_TYPE,
                                                                        "subscription": subscription, "message-id": str(next(self._message_ids))}, body))

    def origin_allowed(self, origin: str | None) -> bool:
        """A browser always sends Origin; a page from another origin may not open the socket. Clients without Origin (servers, tests) may."""
        if origin is None:
            return True
        return any(origin == allowed or fnmatch.fnmatchcase(origin, allowed) for allowed in self._allowed_origins)

    async def serve(self, socket: WebSocket) -> None:
        """Handles one WebSocket connection until it closes."""
        if not self.origin_allowed(socket.headers.get("origin")):
            log.warning("WebSocket refused for origin %s", socket.headers.get("origin"))
            await socket.close(code=1008)
            return
        offered = [p.strip() for p in socket.headers.get("sec-websocket-protocol", "").split(",") if p.strip()]
        chosen = next((p for p in SUBPROTOCOLS if p in offered), None)
        await socket.accept(subprotocol=chosen)
        connection = _Connection(socket)
        writer = asyncio.create_task(connection.write_loop())
        reader = StompFrameReader(self._max_message_bytes)
        self._connections.add(connection)
        try:
            while True:
                message = await socket.receive()
                if message["type"] == "websocket.disconnect":
                    break
                data = message.get("bytes") or (message.get("text") or "").encode("utf-8")
                try:
                    frames = reader.feed(data)
                except StompProtocolError as problem:
                    await self._fail(connection, str(problem))
                    break
                if not await self._handle_all(connection, frames):
                    break
        except WebSocketDisconnect:
            pass
        finally:
            self._connections.discard(connection)
            connection.outbox.put_nowait(None)
            try:
                await asyncio.wait_for(writer, timeout=5)
            except (TimeoutError, Exception):
                writer.cancel()
            if socket.application_state != WebSocketState.DISCONNECTED and socket.client_state != WebSocketState.DISCONNECTED:
                try:
                    await socket.close()
                except Exception:
                    pass

    async def _handle_all(self, connection: _Connection, frames: list[StompFrame]) -> bool:
        """False when the connection should close."""
        for frame in frames:
            if not await self._handle(connection, frame):
                return False
        return True

    async def _handle(self, connection: _Connection, frame: StompFrame) -> bool:
        command = frame.command
        if command in ("CONNECT", "STOMP"):
            connection.outbox.put_nowait(StompFrame("CONNECTED", {"version": "1.2", "heart-beat": "0,0", "server": "neviad"}))
        elif command == "SUBSCRIBE":
            sub_id, destination = frame.headers.get("id"), frame.headers.get("destination")
            if not sub_id or not destination:
                await self._fail(connection, "SUBSCRIBE needs id and destination")
                return False
            if destination.startswith(self._broker_prefix):
                connection.subscriptions[sub_id] = destination
        elif command == "UNSUBSCRIBE":
            connection.subscriptions.pop(frame.headers.get("id", ""), None)
        elif command == "SEND":
            self._send(frame)
        elif command == "DISCONNECT":
            self._receipt(connection, frame)
            return False
        elif command not in ("ACK", "NACK", "BEGIN", "COMMIT", "ABORT"):
            await self._fail(connection, f"unknown command {command}")
            return False
        self._receipt(connection, frame)
        return True

    def _send(self, frame: StompFrame) -> None:
        destination = frame.headers.get("destination", "")
        if destination.startswith(self._broker_prefix):
            self._dispatch(destination, frame.body)
            return
        handler = self._handlers.get(destination)
        if handler is None:
            log.debug("No handler for %s", destination)
            return
        try:
            handler(json.loads(frame.body.decode("utf-8")) if frame.body else None)
        except Exception:
            log.warning("STOMP handler for %s failed", destination, exc_info=True)

    @staticmethod
    def _receipt(connection: _Connection, frame: StompFrame) -> None:
        receipt = frame.headers.get("receipt")
        if receipt:
            connection.outbox.put_nowait(StompFrame("RECEIPT", {"receipt-id": receipt}))

    @staticmethod
    async def _fail(connection: _Connection, message: str) -> None:
        connection.outbox.put_nowait(StompFrame("ERROR", {"message": message, "content-type": "text/plain"}, message.encode("utf-8")))
