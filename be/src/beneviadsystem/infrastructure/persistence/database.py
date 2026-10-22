from __future__ import annotations

import logging
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit

from psycopg_pool import ConnectionPool

log = logging.getLogger(__name__)
#: Query parameters only the JDBC driver understands; libpq would reject them.
_JDBC_ONLY = {"prepareThreshold", "preparedStatementCacheQueries", "ApplicationName", "loggerLevel", "socketTimeout", "tcpKeepAlive"}


def to_conninfo(url: str) -> str:
    """A libpq URL from the DB_URL the project uses: ``jdbc:postgresql://host:port/db?sslmode=require&prepareThreshold=0`` (JDBC, as the
    frontend scripts read it) or a plain ``postgresql://`` URL. Parameters only the JDBC driver knows are dropped."""
    url = url.strip()
    if url.startswith("jdbc:"):
        url = url[len("jdbc:"):]
    parts = urlsplit(url)
    if parts.scheme not in ("postgresql", "postgres"):
        raise ValueError("DB_URL phải là jdbc:postgresql://... hoặc postgresql://...")
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query) if k not in _JDBC_ONLY])
    return parts._replace(scheme="postgresql", query=query).geturl()


class Database:
    """A small connection pool over PostgreSQL (Supabase). Statements are not prepared server-side, so it works behind the Supabase pooler."""

    def __init__(self, url: str, username: str, password: str, min_size: int = 1, max_size: int = 10):
        kwargs: dict[str, Any] = {"prepare_threshold": None}
        if username:
            kwargs["user"] = username
        if password:
            kwargs["password"] = password
        self._pool = ConnectionPool(to_conninfo(url), min_size=min_size, max_size=max_size, kwargs=kwargs, open=False, name="neviad")

    def open(self, wait_seconds: float = 30.0) -> None:
        self._pool.open(wait=True, timeout=wait_seconds)

    def close(self) -> None:
        self._pool.close()

    def connection(self):
        return self._pool.connection()

    def query(self, sql: str, params: tuple[Any, ...] = ()) -> list[tuple[Any, ...]]:
        with self._pool.connection() as connection, connection.cursor() as cursor:
            cursor.execute(sql, params)
            return list(cursor.fetchall())
