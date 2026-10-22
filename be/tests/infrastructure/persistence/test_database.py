import zlib

import pytest

from beneviadsystem.infrastructure.persistence.database import Database, to_conninfo
from beneviadsystem.infrastructure.persistence.migrations import FlywayMigrator, flyway_checksum
from beneviadsystem.infrastructure.persistence.source_file_repository import SourceFileRepository


def test_a_jdbc_url_becomes_a_libpq_url_without_the_jdbc_only_parameters():
    assert (to_conninfo("jdbc:postgresql://aws-0-ap.pooler.supabase.com:5432/postgres?sslmode=require&prepareThreshold=0")
            == "postgresql://aws-0-ap.pooler.supabase.com:5432/postgres?sslmode=require")
    assert to_conninfo("postgres://db:5432/neviad") == "postgresql://db:5432/neviad"
    with pytest.raises(ValueError):
        to_conninfo("mysql://x")


def test_the_checksum_is_flyways_crc32_over_the_lines():
    # Flyway feeds CRC32 the lines without their line breaks (and without a BOM), as a signed 32-bit number.
    expected = zlib.crc32("dòng hai".encode(), zlib.crc32(b"line one"))
    assert flyway_checksum("line one\ndòng hai\n") == (expected - 2**32 if expected >= 2**31 else expected)
    assert flyway_checksum("SELECT 1;\n") == flyway_checksum("\ufeffSELECT 1;\r\n")


@pytest.fixture
def database(database_url):
    db = Database(database_url, "postgres", "")
    db.open()
    yield db
    db.close()


def history(db):
    return db.query("SELECT version, description, type, script, success FROM flyway_schema_history ORDER BY installed_rank")


def test_an_empty_database_gets_every_migration_and_a_history_flyway_can_read(database):
    applied = FlywayMigrator(database).migrate()

    assert applied == ["1", "2", "3"]
    assert history(database) == [("1", "baseline", "SQL", "V1__baseline.sql", True), ("2", "source file", "SQL", "V2__source_file.sql", True),
                                 ("3", "template file", "SQL", "V3__template_file.sql", True)]
    assert database.query("SELECT count(*) FROM template_file") == [(0,)]
    assert FlywayMigrator(database).migrate() == []


def test_a_database_with_tables_but_no_history_is_baselined_first(database):
    with database.connection() as connection:
        connection.execute("CREATE TABLE legacy (id int)")

    assert FlywayMigrator(database).migrate() == ["2", "3"]
    assert history(database)[0] == ("1", "<< Flyway Baseline >>", "BASELINE", "<< Flyway Baseline >>", True)


def test_the_history_the_java_backend_left_is_respected(database):
    FlywayMigrator(database).migrate()
    with database.connection() as connection:
        connection.execute("INSERT INTO source_file (collection, path, content) VALUES ('objects', 'a.ts', 'x')")

    assert FlywayMigrator(database).migrate() == []
    assert database.query("SELECT count(*) FROM source_file") == [(1,)]


def test_the_repository_reads_the_template_from_its_own_table_and_the_rest_by_collection(database):
    FlywayMigrator(database).migrate()
    with database.connection() as connection:
        connection.execute("INSERT INTO template_file (path, content) VALUES ('shared/b.ts', 'b'), ('README.md', '# khung')")
        connection.execute("INSERT INTO source_file (collection, path, content) VALUES ('objects', 'can-don.ts', 'c'), "
                           "('template', 'old.ts', 'cũ'), ('catalog', 'object-catalog.md', '# d')")
    repository = SourceFileRepository(database)

    assert [f.path for f in repository.find_all("template")] == ["README.md", "shared/b.ts"]
    assert [(f.path, f.content) for f in repository.find_all("objects")] == [("can-don.ts", "c")]
    assert repository.find("template", "README.md").content == "# khung"
    assert repository.find("template", "old.ts") is None
    assert repository.find("catalog", "object-catalog.md").content == "# d"


def test_without_a_database_the_repository_says_how_to_configure_one():
    with pytest.raises(RuntimeError, match="DB_URL"):
        SourceFileRepository(None).find_all("objects")
