from fastapi import FastAPI, Request

#: The response headers the old Spring Security filter chain added to every answer.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",
    "Referrer-Policy": "no-referrer",
}


def configure_security(app: FastAPI) -> None:
    """Stateless API without sessions, cookies or CSRF tokens; every endpoint is open (authentication is a planned module, see
    ``infrastructure/security``). The defensive response headers are kept."""

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        for name, value in SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        return response
