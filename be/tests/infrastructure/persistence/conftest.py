import os
import shutil
import socket
import subprocess
import sys
from pathlib import Path

import pytest


def _binary(name: str) -> str | None:
    candidate = Path(sys.prefix) / "bin" / name
    return str(candidate) if candidate.is_file() else shutil.which(name)


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def postgres_server(tmp_path_factory):
    """A throwaway PostgreSQL cluster (initdb + pg_ctl from the conda env); the tests that need it are skipped without the binaries."""
    initdb, pg_ctl = _binary("initdb"), _binary("pg_ctl")
    if initdb is None or pg_ctl is None:
        pytest.skip("cần initdb và pg_ctl (conda install -n neviad-be -c conda-forge postgresql)")
    data = tmp_path_factory.mktemp("pgdata")
    subprocess.run([initdb, "-D", str(data), "-U", "postgres", "--auth=trust", "-E", "UTF8", "--locale=C"], check=True, capture_output=True)
    port = _free_port()
    log = data / "server.log"
    subprocess.run([pg_ctl, "-D", str(data), "-l", str(log), "-w", "-o", f"-p {port} -c unix_socket_directories='' -c listen_addresses=127.0.0.1", "start"],
                   check=True, capture_output=True)
    yield port
    subprocess.run([pg_ctl, "-D", str(data), "-m", "fast", "stop"], capture_output=True)


@pytest.fixture
def database_url(postgres_server):
    """A fresh, empty database per test, as a JDBC URL the way the project's DB_URL is written."""
    import psycopg

    name = "t" + os.urandom(6).hex()
    with psycopg.connect(f"postgresql://postgres@127.0.0.1:{postgres_server}/postgres", autocommit=True) as admin:
        admin.execute(f'CREATE DATABASE "{name}"')
    yield f"jdbc:postgresql://127.0.0.1:{postgres_server}/{name}?sslmode=disable&prepareThreshold=0"
    with psycopg.connect(f"postgresql://postgres@127.0.0.1:{postgres_server}/postgres", autocommit=True) as admin:
        admin.execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')
