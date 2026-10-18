package com.neviad.beneviadsystem.infrastructure.persistence;

import com.neviad.beneviadsystem.domain.model.SourceFile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Stored source files by collection, read-only: {@code fe/scripts/push-source.mjs} writes them. The collection {@code template} lives in its own
 * table {@code template_file} (see V3__template_file.sql); every other collection is in {@code source_file} (see V2__source_file.sql), whose
 * old {@code template} rows are no longer read.
 */
@Repository
public class SourceFileRepository {
    static final String TEMPLATE = "template";

    private final JdbcTemplate jdbc;

    public SourceFileRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Every file of the collection with its content, sorted by path. */
    public List<SourceFile> findAll(String collection) {
        if (TEMPLATE.equals(collection)) {
            return jdbc.query("SELECT path, content FROM template_file ORDER BY path",
                    (rs, i) -> new SourceFile(rs.getString("path"), rs.getString("content")));
        }
        return jdbc.query("SELECT path, content FROM source_file WHERE collection = ? ORDER BY path",
                (rs, i) -> new SourceFile(rs.getString("path"), rs.getString("content")), collection);
    }

    public Optional<SourceFile> find(String collection, String path) {
        if (TEMPLATE.equals(collection)) {
            return jdbc.query("SELECT path, content FROM template_file WHERE path = ?",
                    (rs, i) -> new SourceFile(rs.getString("path"), rs.getString("content")), path).stream().findFirst();
        }
        return jdbc.query("SELECT path, content FROM source_file WHERE collection = ? AND path = ?",
                (rs, i) -> new SourceFile(rs.getString("path"), rs.getString("content")), collection, path).stream().findFirst();
    }
}
