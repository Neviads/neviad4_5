from fastapi import FastAPI, WebSocket

from beneviadsystem.infrastructure.messaging.stomp_broker import StompBroker

#: STOMP endpoint (``NEXT_PUBLIC_WS_URL``, default ws://localhost:8080/ws); broker prefix ``/topic``, application prefix ``/app``.
WEBSOCKET_PATH = "/ws"


def configure_websocket(app: FastAPI, broker: StompBroker) -> None:
    @app.websocket(WEBSOCKET_PATH)
    async def stomp_endpoint(socket: WebSocket) -> None:
        await broker.serve(socket)
