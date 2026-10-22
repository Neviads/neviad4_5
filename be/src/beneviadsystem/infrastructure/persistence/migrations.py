from __future__ import annotations

import getpass
import logging
import re
import time
import zlib
from dataclasses import dataclass

from beneviadsystem.config.resources import resource

from .database import Database

log = logging.getLogger(__name__)
HISTORY_TABLE = "flyway_schema_history"
_SCRIPT = re.compile(r"^V(\d+(?:[._]\d+)*)__(.+)\.sql$")
BASELINE_DESCRIPTION = "<< Flyway Baseline >>"


def flyway_checksum(text: str) -> int:
    """Flyway's checksum of a script: CRC32 over the UTF-8 bytes of each line without its line break (BOM removed), as a signed int."""
    lines = re.split(r"\r\n|\r|\n", text.removeprefix("\ufeff"))
    if lines and lines[-1] == "":
        lines.pop()
    crc = 0
    for line in lines:
        crc = zlib.crc32(line.encode("utf-8"), crc)
    return crc - 2**32 if crc >= 2**31 else crc


@dataclass(frozen=True)
class Migration:
    version: str
    description: str
    script: str
    sql: str

    @property
    def key(self) -> tuple[int, ...]:
        return tuple(int(part) for part in re.split(r"[._]", self.version))


def packaged_migrations(location: str = "db/migration") -> list[Migration]:
    """The versioned scripts ``V<version>__<description>.sql`` shipped in ``resources/db/migration``, in version order."""
    found = []
    for entry in resource(location).iterdir():
        match = _SCRIPT.match(entry.name)
        if match:
            found.append(Migration(match.group(1).replace("_", "."), match.group(2).replace("_", " "), entry.name, entry.read_text(encoding="utf-8")))
    return sorted(found, key=lambda m: m.key)


class FlywayMigrator:
    """Applies the versioned SQL scripts the way Flyway did for the Java backend, and keeps Flyway's own ``flyway_schema_history`` table, so a
    database migrated by either one stays valid for the other. A schema that has tables but no history is baselined at version 1 first
    (``baseline-on-migrate``). Each script runs in its own transaction; a failing script stops the start-up."""

    def __init__(self, database: Database, migrations: list[Migration] | None = None, baseline_version: str = "1"):
        self._database = database
        self._migrations = migrations if migrations is not None else packaged_migrations()
        self._baseline = baseline_version

    def migrate(self) -> list[str]:
        """Returns the versions applied now."""
        applied_now: list[str] = []
        with self._database.connection() as connection:
            # Bookkeeping commits statement by statement; every script and its history row share one transaction.
            connection.autocommit = True
            connection.execute("SELECT pg_advisory_lock(hashtext(%s))", (HISTORY_TABLE,))
            try:
                if not self._history_exists(connection):
                    non_empty = connection.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema()").fetchone()[0] > 0
                    self._create_history(connection)
                    if non_empty:
                        self._record(connection, self._baseline, BASELINE_DESCRIPTION, "BASELINE", BASELINE_DESCRIPTION, None, 0)
                        log.info("Database baselined at version %s", self._baseline)
                done = {row[0] for row in connection.execute(f"SELECT version FROM {HISTORY_TABLE} WHERE success AND version IS NOT NULL").fetchall()}
                baseline = connection.execute(f"SELECT version FROM {HISTORY_TABLE} WHERE type = 'BASELINE' AND success").fetchone()
                floor = tuple(int(p) for p in baseline[0].split(".")) if baseline else ()
                for migration in self._migrations:
                    if migration.version in done or (floor and migration.key <= floor):
                        continue
                    started = time.monotonic()
                    with connection.transaction():
                        connection.execute(migration.sql)
                        self._record(connection, migration.version, migration.description, "SQL", migration.script, flyway_checksum(migration.sql),
                                     int((time.monotonic() - started) * 1000))
                    log.info("Migrated to version %s (%s)", migration.version, migration.description)
                    applied_now.append(migration.version)
            finally:
                connection.execute("SELECT pg_advisory_unlock(hashtext(%s))", (HISTORY_TABLE,))
                connection.autocommit = False
        return applied_now

    @staticmethod
    def _history_exists(connection) -> bool:
        return connection.execute("SELECT to_regclass(%s) IS NOT NULL", (HISTORY_TABLE,)).fetchone()[0]

    @staticmethod
    def _create_history(connection) -> None:
        connection.execute(f"""
            CREATE TABLE {HISTORY_TABLE} (
                installed_rank INT NOT NULL PRIMARY KEY,
                version VARCHAR(50),
                description VARCHAR(200) NOT NULL,
                type VARCHAR(20) NOT NULL,
                script VARCHAR(1000) NOT NULL,
                checksum INT,
                installed_by VARCHAR(100) NOT NULL,
                installed_on TIMESTAMP NOT NULL DEFAULT now(),
                execution_time INT NOT NULL,
                success BOOLEAN NOT NULL
            )""")
        connection.execute(f"CREATE INDEX {HISTORY_TABLE}_s_idx ON {HISTORY_TABLE} (success)")

    @staticmethod
    def _record(connection, version, description, kind, script, checksum, execution_ms) -> None:
        rank = connection.execute(f"SELECT coalesce(max(installed_rank), 0) + 1 FROM {HISTORY_TABLE}").fetchone()[0]
        user = connection.execute("SELECT current_user").fetchone()[0] or getpass.getuser()
        connection.execute(f"INSERT INTO {HISTORY_TABLE} (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)"
                           " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)", (rank, version, description, kind, script, checksum, user, execution_ms))
