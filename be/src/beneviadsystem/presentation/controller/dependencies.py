from fastapi import Request

from beneviadsystem.config.container import Container


def container(request: Request) -> Container:
    """The application's container, for ``Depends``."""
    return request.app.state.container
